import {Asset} from 'expo-asset'
import {
  cacheDirectory,
  copyAsync,
  getInfoAsync,
} from 'expo-file-system/legacy'
import {GLView, type ExpoWebGLRenderingContext} from 'expo-gl'
import {Renderer} from 'expo-three'
import React from 'react'
import {Colors} from '@/constants/Colors'
import {
  Image,
  Platform,
  StyleSheet,
  useColorScheme,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import * as THREE from 'three'

// Three.js expects a single shared global for side-effectful modules.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(global as any).THREE = (global as any).THREE || THREE

export type CoinFlipOutcome = 'heads' | 'tails'

export type CoinFlipSceneHandle = {
  flip: () => CoinFlipOutcome
}

type CoinFlipSceneProps = {
  onFlipStart?: () => void
  onFlipComplete?: (outcome: CoinFlipOutcome) => void
}

/** Coin diameter as a fraction of the shorter viewport axis at rest framing. */
const VIEWPORT_FILL = 0.38
const CAMERA_FOV = 42
const CAMERA_HEIGHT = 5.8
/** Keep camera on the Y axis so the table is centered in frame. */
const CAMERA_Z = 0
const COIN_THICKNESS = 0.1
const TABLE_Y = 0
const GRAVITY = -24
const RESTITUTION = 0.52
const ANGULAR_DAMP_ON_BOUNCE = 0.72
const LINEAR_DAMP_ON_BOUNCE = 0.7
const SETTLE_SPEED = 0.7
const SETTLE_SPIN = 1.6
const MIN_FLIPS = 6
const MAX_FLIPS = 10
const TOSS_VY_MIN = 10.5
const TOSS_VY_RANGE = 4.5
/** Angular speed scale (rad/s factor) — randomized per toss, never below min. */
const SPIN_SPEED_MIN = 0.8
const SPIN_SPEED_MAX = 2.2
const PHYSICS_SUBSTEPS = 4
/** Extra clearance so rotating edges don't z-fight the felt. */
const CONTACT_SLOP = 0.002

/** Flat on table, +Y face up = heads. */
const HEADS_ANGLE = 0
const TAILS_ANGLE = Math.PI

const HEADS_TEXTURE = require('../../../assets/images/coin/rama-ix.png')
const TAILS_TEXTURE = require('../../../assets/images/coin/thai-temple.png')

type TossState = {
  active: boolean
  outcome: CoinFlipOutcome
  pos: THREE.Vector3
  vel: THREE.Vector3
  /** Rotation around local X (flip axis), radians. */
  angle: number
  spin: number
  settled: boolean
  wobble: number
}

/**
 * Lowest world-Y of a coin (cylinder along local Y) after Rx(angle) + Rz(wobble).
 * Samples both rim rings so tilted edges cannot sink through the table.
 */
function coinLowestWorldY(
  centerY: number,
  angle: number,
  wobble: number,
  radius: number,
  halfThickness: number,
) {
  const euler = new THREE.Euler(angle, 0, wobble, 'XYZ')
  const quat = new THREE.Quaternion().setFromEuler(euler)
  const local = new THREE.Vector3()
  let minY = Infinity
  const samples = 24
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2
    const cx = Math.cos(a) * radius
    const cz = Math.sin(a) * radius
    for (const yLocal of [-halfThickness, halfThickness]) {
      local.set(cx, yLocal, cz).applyQuaternion(quat)
      minY = Math.min(minY, centerY + local.y)
    }
  }
  return minY
}

/** How "on-edge" the coin is (0 = flat, 1 = vertical). */
function edgeFactor(angle: number) {
  return Math.abs(Math.sin(angle))
}

function isNearlyFlat(angle: number) {
  const n = normalizeAngle(angle)
  const tau = Math.PI * 2
  return (
    n < 0.28 ||
    n > tau - 0.28 ||
    Math.abs(n - Math.PI) < 0.28
  )
}

function normalizeAngle(radians: number) {
  const tau = Math.PI * 2
  return ((radians % tau) + tau) % tau
}

function restingAngleForOutcome(outcome: CoinFlipOutcome) {
  return outcome === 'heads' ? HEADS_ANGLE : TAILS_ANGLE
}

/** Which face is closer to up given the current spin angle. */
function outcomeFromAngle(angle: number): CoinFlipOutcome {
  const n = normalizeAngle(angle)
  const distHeads = Math.min(n, Math.PI * 2 - n)
  const distTails = Math.abs(n - Math.PI)
  return distHeads <= distTails ? 'heads' : 'tails'
}

/** Flatten to the nearest face-up pose — never a 180° surprise flip. */
function snapToNearestFlat(angle: number) {
  return snapAngleToOutcome(angle, outcomeFromAngle(angle))
}

/** Snap spinning angle to the nearest equivalent of the target face-up pose. */
function snapAngleToOutcome(angle: number, outcome: CoinFlipOutcome) {
  const target = restingAngleForOutcome(outcome)
  const base = Math.floor(angle / (Math.PI * 2)) * Math.PI * 2
  let best = base + target
  let bestDist = Math.abs(angle - best)
  for (const candidate of [
    base + target - Math.PI * 2,
    base + target + Math.PI * 2,
  ]) {
    const dist = Math.abs(angle - candidate)
    if (dist < bestDist) {
      best = candidate
      bestDist = dist
    }
  }
  return best
}

function coinScaleForViewport(aspect: number, cameraDistance: number) {
  const fovRad = THREE.MathUtils.degToRad(CAMERA_FOV)
  const halfHeight = Math.tan(fovRad / 2) * cameraDistance
  const halfWidth = halfHeight * aspect
  return Math.min(halfWidth, halfHeight) * VIEWPORT_FILL
}

/** Table dimensions that fill the perspective camera frustum at y=0. */
function tableSizeForCamera(aspect: number) {
  const fovRad = THREE.MathUtils.degToRad(CAMERA_FOV)
  const halfHeight = Math.tan(fovRad / 2) * CAMERA_HEIGHT
  const halfWidth = halfHeight * aspect
  return {
    width: halfWidth * 2,
    height: halfHeight * 2,
  }
}

/** expo-gl texImage2D only accepts file:// URIs. */
function toFileUri(uri: string) {
  if (uri.startsWith('file://')) {
    return uri
  }
  if (uri.startsWith('file:/')) {
    return `file://${uri.slice('file:'.length)}`
  }
  if (uri.startsWith('/')) {
    return `file://${uri}`
  }
  return uri
}

/**
 * Android release packs require()'d PNGs as drawables. Their localUri is then
 * schema-less / asset://, which expo-gl cannot upload — copy to cache first.
 */
async function resolveGlReadableUri(asset: Asset) {
  const sourceUri = asset.localUri ?? asset.uri
  if (!sourceUri) {
    throw new Error('Coin texture asset missing uri')
  }

  const alreadyFile =
    sourceUri.startsWith('file:') || sourceUri.startsWith('file:/')
  if (alreadyFile || Platform.OS !== 'android') {
    return toFileUri(sourceUri)
  }

  if (!cacheDirectory) {
    throw new Error('Coin texture cache directory unavailable')
  }

  const ext = asset.type || 'png'
  const name = asset.hash ?? String(asset.name ?? 'coin')
  const dest = `${cacheDirectory}coin-tex-${name}.${ext}`
  const info = await getInfoAsync(dest)
  if (!info.exists) {
    await copyAsync({from: sourceUri, to: dest})
  }
  return toFileUri(dest)
}

async function loadCoinTexture(moduleId: number) {
  const asset = Asset.fromModule(moduleId)
  await asset.downloadAsync()

  let width = asset.width ?? 0
  let height = asset.height ?? 0
  if (!width || !height) {
    const probeUri = asset.localUri ?? asset.uri
    if (!probeUri) {
      throw new Error('Coin texture asset missing localUri')
    }
    const size = await new Promise<{width: number; height: number}>(
      (resolve, reject) => {
        Image.getSize(probeUri, (w, h) => resolve({width: w, height: h}), reject)
      },
    )
    width = size.width
    height = size.height
  }

  const localUri = await resolveGlReadableUri(asset)

  const texture = new THREE.Texture()
  ;(texture as any).isDataTexture = true
  texture.image = {
    data: {localUri},
    width,
    height,
  }
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.flipY = true
  texture.needsUpdate = true
  return texture
}

export const CoinFlipScene = React.forwardRef<
  CoinFlipSceneHandle,
  CoinFlipSceneProps
>(function CoinFlipScene({onFlipStart, onFlipComplete}, ref) {
  const colorScheme = useColorScheme() ?? 'light'
  const canvasBackground = Colors[colorScheme].background
  const [layout, setLayout] = React.useState({width: 0, height: 0})
  const layoutLockedRef = React.useRef(false)
  const tossRef = React.useRef<TossState | null>(null)
  const restYRef = React.useRef(0.05)
  const startTossRef = React.useRef<((outcome: CoinFlipOutcome) => void) | null>(
    null,
  )
  const frameRef = React.useRef<number | null>(null)
  const lastFrameMsRef = React.useRef<number | null>(null)
  const teardownRef = React.useRef<(() => void) | null>(null)
  const callbacksRef = React.useRef({onFlipStart, onFlipComplete})
  callbacksRef.current = {onFlipStart, onFlipComplete}

  React.useEffect(() => {
    return () => {
      teardownRef.current?.()
      teardownRef.current = null
    }
  }, [])

  React.useImperativeHandle(ref, () => ({
    flip: () => {
      if (tossRef.current?.active || !startTossRef.current) {
        const angle = tossRef.current?.angle ?? HEADS_ANGLE
        return normalizeAngle(angle) < Math.PI / 2 ||
          normalizeAngle(angle) > (Math.PI * 3) / 2
          ? 'heads'
          : 'tails'
      }

      const outcome: CoinFlipOutcome = Math.random() < 0.5 ? 'heads' : 'tails'
      startTossRef.current(outcome)
      callbacksRef.current.onFlipStart?.()
      return outcome
    },
  }))

  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    // Lock the first stable size so later UI changes don't stretch the GL buffer
    // (that made the coin look oval).
    if (layoutLockedRef.current) {
      return
    }
    const {width, height} = event.nativeEvent.layout
    if (width > 0 && height > 0) {
      layoutLockedRef.current = true
      setLayout({width, height})
    }
  }, [])

  const onContextCreate = React.useCallback((gl: ExpoWebGLRenderingContext) => {
    teardownRef.current?.()

    const {drawingBufferWidth: bufW, drawingBufferHeight: bufH} = gl
    if (bufW <= 0 || bufH <= 0) {
      console.warn('[CoinFlip] GL buffer has zero size')
      return
    }

    const pixelStorei = gl.pixelStorei.bind(gl)
    gl.pixelStorei = ((...args: Parameters<typeof pixelStorei>) => {
      const [parameter] = args
      if (parameter === gl.UNPACK_FLIP_Y_WEBGL) {
        return pixelStorei(...args)
      }
    }) as typeof gl.pixelStorei

    // Expo GL may return undefined here, but Three.js calls .trim() on the logs.
    const getShaderInfoLog = gl.getShaderInfoLog.bind(gl)
    gl.getShaderInfoLog = ((
      ...args: Parameters<typeof getShaderInfoLog>
    ) => getShaderInfoLog(...args) ?? '') as typeof gl.getShaderInfoLog
    const getProgramInfoLog = gl.getProgramInfoLog.bind(gl)
    gl.getProgramInfoLog = ((
      ...args: Parameters<typeof getProgramInfoLog>
    ) => getProgramInfoLog(...args) ?? '') as typeof gl.getProgramInfoLog

    const OriginalWebGLRenderingContext = (globalThis as any)
      .WebGLRenderingContext
    ;(globalThis as any).WebGLRenderingContext = undefined
    let renderer: Renderer
    try {
      renderer = new Renderer({
        gl,
        width: bufW,
        height: bufH,
        pixelRatio: 1,
        clearColor: new THREE.Color(canvasBackground).getHex(),
      })
    } finally {
      ;(globalThis as any).WebGLRenderingContext = OriginalWebGLRenderingContext
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(canvasBackground)

    const aspect = bufW / bufH
    // Perspective top-down so the coin grows as it rises toward the camera.
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 40)
    camera.position.set(0, CAMERA_HEIGHT, CAMERA_Z)
    camera.up.set(0, 0, -1)
    camera.lookAt(0, 0, 0)

    const ambient = new THREE.AmbientLight(0xffffff, 0.75)
    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.2)
    keyLight.position.set(2.5, 10, 3)
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.4)
    fillLight.position.set(-3, 8, -2)
    scene.add(ambient, keyLight, fillLight)

    const baseTableSize = tableSizeForCamera(aspect)
    const tableGroup = new THREE.Group()
    scene.add(tableGroup)

    const tableDisposables: {dispose: () => void}[] = []
    const track = <T extends {dispose: () => void}>(obj: T) => {
      tableDisposables.push(obj)
      return obj
    }

    const feltMat = track(
      new THREE.MeshPhongMaterial({
        color: 0x1a3a2a,
        shininess: 18,
        specular: 0x224433,
        side: THREE.DoubleSide,
      }),
    )
    const feltGeo = track(
      new THREE.PlaneGeometry(
        baseTableSize.width * 1.02,
        baseTableSize.height * 1.02,
      ),
    )
    const felt = new THREE.Mesh(feltGeo, feltMat)
    felt.rotation.x = -Math.PI / 2
    felt.position.set(0, 0, 0)
    tableGroup.add(felt)

    let syncedBufW = bufW
    let syncedBufH = bufH
    let syncedAspect = aspect

    const syncViewport = () => {
      const nextW = gl.drawingBufferWidth
      const nextH = gl.drawingBufferHeight
      if (nextW <= 0 || nextH <= 0) {
        return
      }
      if (nextW === syncedBufW && nextH === syncedBufH) {
        return
      }
      syncedBufW = nextW
      syncedBufH = nextH
      syncedAspect = nextW / nextH
      renderer.setSize(nextW, nextH)
      camera.aspect = syncedAspect
      camera.updateProjectionMatrix()
      const nextTable = tableSizeForCamera(syncedAspect)
      tableGroup.scale.set(
        nextTable.width / baseTableSize.width,
        1,
        nextTable.height / baseTableSize.height,
      )
    }

    const shadowGeo = new THREE.CircleGeometry(1, 48)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthTest: true,
      depthWrite: false,
    })
    const shadow = new THREE.Mesh(shadowGeo, shadowMat)
    shadow.rotation.x = -Math.PI / 2
    // Sit on the table, below the coin; never drawn over the coin face.
    shadow.position.set(0, 0.001, 0)
    shadow.renderOrder = 0
    scene.add(shadow)

    const cameraDistance = CAMERA_HEIGHT
    const scale = coinScaleForViewport(aspect, cameraDistance)
    const restY = (COIN_THICKNESS / 2) * scale
    restYRef.current = restY

    const geometry = new THREE.CylinderGeometry(1, 1, COIN_THICKNESS, 96)
    const rimMaterial = new THREE.MeshPhongMaterial({
      color: 0xb0bec5,
      shininess: 110,
      specular: 0xeceff1,
    })
    const headsMaterial = new THREE.MeshPhongMaterial({
      color: 0xd4a017,
      shininess: 95,
      specular: 0xd7ccc8,
    })
    const tailsMaterial = new THREE.MeshPhongMaterial({
      color: 0xc0c8d0,
      shininess: 95,
      specular: 0xd7ccc8,
    })

    const coin = new THREE.Mesh(geometry, [
      rimMaterial,
      headsMaterial,
      tailsMaterial,
    ])
    coin.scale.setScalar(scale)
    coin.renderOrder = 2
    // Rest flat on the table, heads up.
    coin.rotation.order = 'XYZ'
    coin.rotation.set(HEADS_ANGLE, 0, 0)
    coin.position.set(0, restY, 0)
    scene.add(coin)

    // Smaller than the coin so it never covers the face from above.
    shadow.scale.setScalar(scale * 0.72)
    shadow.visible = false

    let headsMap: THREE.Texture | null = null
    let tailsMap: THREE.Texture | null = null
    let cancelled = false

    void Promise.all([
      loadCoinTexture(HEADS_TEXTURE),
      loadCoinTexture(TAILS_TEXTURE),
    ])
      .then(([heads, tails]) => {
        if (cancelled) {
          heads.dispose()
          tails.dispose()
          return
        }
        headsMap = heads
        tailsMap = tails
        headsMaterial.map = heads
        headsMaterial.color.set(0xffffff)
        headsMaterial.needsUpdate = true
        tailsMaterial.map = tails
        tailsMaterial.color.set(0xffffff)
        tailsMaterial.needsUpdate = true
      })
      .catch(error => {
        console.warn('[CoinFlip] Failed to load coin textures', error)
      })

    startTossRef.current = (outcome: CoinFlipOutcome) => {
      const flips =
        MIN_FLIPS + Math.floor(Math.random() * (MAX_FLIPS - MIN_FLIPS + 1))
      const spinSign = Math.random() < 0.5 ? 1 : -1
      const spinSpeed =
        SPIN_SPEED_MIN +
        Math.random() * (SPIN_SPEED_MAX - SPIN_SPEED_MIN)
      tossRef.current = {
        active: true,
        outcome,
        pos: new THREE.Vector3(0, restY, 0),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.9,
          TOSS_VY_MIN + Math.random() * TOSS_VY_RANGE,
          (Math.random() - 0.5) * 0.7 - 0.4,
        ),
        angle: coin.rotation.x,
        spin: spinSign * (flips * Math.PI * 2 + Math.PI) * spinSpeed,
        settled: false,
        wobble: 0,
      }
    }

    const coinRadius = scale
    const coinHalfT = (COIN_THICKNESS / 2) * scale

    const resolveTableCollision = (toss: TossState) => {
      const lowest = coinLowestWorldY(
        toss.pos.y,
        toss.angle,
        toss.wobble,
        coinRadius,
        coinHalfT,
      )
      const penetration = TABLE_Y + CONTACT_SLOP - lowest
      if (penetration <= 0) {
        return false
      }

      // Push the whole rigid body up so the lowest point sits on the table.
      toss.pos.y += penetration

      const edge = edgeFactor(toss.angle)
      if (toss.vel.y < 0) {
        toss.vel.y = -toss.vel.y * RESTITUTION * (1 - edge * 0.2)
      }

      toss.vel.x *= LINEAR_DAMP_ON_BOUNCE
      toss.vel.z *= LINEAR_DAMP_ON_BOUNCE

      // Bounce reverses flip direction (like a real rim hit), with energy loss.
      toss.spin = -toss.spin * ANGULAR_DAMP_ON_BOUNCE

      // Kill wobble on contact — keeps faces from digging in.
      toss.wobble *= 0.35

      // Nudge toward flat when energy is low so it doesn't keep clipping on edge.
      if (edge > 0.15 && Math.hypot(toss.vel.x, toss.vel.y, toss.vel.z) < 2.5) {
        const n = normalizeAngle(toss.angle)
        const towardFlat =
          Math.abs(n - Math.PI) < Math.PI / 2
            ? Math.PI
            : n > Math.PI
              ? Math.PI * 2
              : 0
        // Move angle in absolute space toward nearest flat.
        let target = toss.angle
        const base = Math.floor(toss.angle / (Math.PI * 2)) * Math.PI * 2
        const candidates = [base + towardFlat, base + towardFlat - Math.PI * 2, base + towardFlat + Math.PI * 2]
        let best = candidates[0]
        let bestDist = Math.abs(toss.angle - best)
        for (const c of candidates) {
          const d = Math.abs(toss.angle - c)
          if (d < bestDist) {
            best = c
            bestDist = d
          }
        }
        toss.angle += (best - toss.angle) * 0.12
        // Re-resolve after nudge so the nudge itself can't cause penetration.
        const lowestAfter = coinLowestWorldY(
          toss.pos.y,
          toss.angle,
          toss.wobble,
          coinRadius,
          coinHalfT,
        )
        if (lowestAfter < TABLE_Y + CONTACT_SLOP) {
          toss.pos.y += TABLE_Y + CONTACT_SLOP - lowestAfter
        }
      }

      toss.vel.x += (Math.random() - 0.5) * 0.08 * edge
      toss.vel.z += (Math.random() - 0.5) * 0.08 * edge
      return true
    }

    const stepPhysics = (toss: TossState, dt: number) => {
      toss.vel.y += GRAVITY * dt
      toss.pos.x += toss.vel.x * dt
      toss.pos.y += toss.vel.y * dt
      toss.pos.z += toss.vel.z * dt
      toss.angle += toss.spin * dt

      const height = Math.max(
        0,
        coinLowestWorldY(
          toss.pos.y,
          toss.angle,
          toss.wobble,
          coinRadius,
          coinHalfT,
        ) - TABLE_Y,
      )
      // Soft wobble only when clearly airborne.
      toss.wobble =
        height > coinRadius * 0.35
          ? Math.sin(toss.angle * 0.5) * 0.1
          : toss.wobble * 0.85

      resolveTableCollision(toss)

      // Hard safety clamp — never allow any sample below the table.
      const lowest = coinLowestWorldY(
        toss.pos.y,
        toss.angle,
        toss.wobble,
        coinRadius,
        coinHalfT,
      )
      if (lowest < TABLE_Y) {
        toss.pos.y += TABLE_Y - lowest
        if (toss.vel.y < 0) {
          toss.vel.y = 0
        }
      }
    }

    const applyCoinTransform = (state: TossState) => {
      coin.position.copy(state.pos)
      coin.rotation.x = state.angle
      coin.rotation.z = state.wobble

      const height = Math.max(
        0,
        coinLowestWorldY(
          state.pos.y,
          state.angle,
          state.wobble,
          coinRadius,
          coinHalfT,
        ) - TABLE_Y,
      )
      const airborne = height > 0.04

      shadow.visible = airborne
      if (airborne) {
        const shadowScale = scale * (0.55 + Math.min(0.35, height * 0.1))
        shadow.position.x = state.pos.x
        shadow.position.z = state.pos.z
        shadow.position.y = 0.001
        shadow.scale.setScalar(shadowScale)
        shadowMat.opacity = Math.min(0.28, 0.08 + height * 0.08)
      } else {
        shadowMat.opacity = 0
      }
    }

    const trySettle = (toss: TossState) => {
      const lowest = coinLowestWorldY(
        toss.pos.y,
        toss.angle,
        toss.wobble,
        coinRadius,
        coinHalfT,
      )
      const onTable = lowest <= TABLE_Y + CONTACT_SLOP + 0.01
      const speed = Math.hypot(toss.vel.x, toss.vel.y, toss.vel.z)
      if (
        !onTable ||
        !isNearlyFlat(toss.angle) ||
        speed >= SETTLE_SPEED ||
        Math.abs(toss.spin) >= SETTLE_SPIN
      ) {
        return false
      }

      toss.settled = true
      toss.active = false
      toss.vel.set(0, 0, 0)
      toss.spin = 0
      toss.wobble = 0
      // Keep whichever face is already up — only flatten a few degrees, never flip.
      toss.outcome = outcomeFromAngle(toss.angle)
      toss.angle = snapToNearestFlat(toss.angle)
      toss.pos.y = restY
      const lowestRest = coinLowestWorldY(
        toss.pos.y,
        toss.angle,
        0,
        coinRadius,
        coinHalfT,
      )
      if (lowestRest < TABLE_Y + CONTACT_SLOP) {
        toss.pos.y += TABLE_Y + CONTACT_SLOP - lowestRest
      }
      applyCoinTransform(toss)
      callbacksRef.current.onFlipComplete?.(toss.outcome)
      return true
    }

    lastFrameMsRef.current = null

    const renderLoop = (now: number) => {
      frameRef.current = requestAnimationFrame(renderLoop)
      syncViewport()

      const last = lastFrameMsRef.current ?? now
      lastFrameMsRef.current = now
      let dt = (now - last) / 1000
      dt = Math.min(0.033, Math.max(0, dt))

      const toss = tossRef.current
      if (toss?.active && !toss.settled) {
        const subDt = dt / PHYSICS_SUBSTEPS
        for (let i = 0; i < PHYSICS_SUBSTEPS; i++) {
          stepPhysics(toss, subDt)
          if (trySettle(toss)) {
            break
          }
        }
        if (toss.active) {
          applyCoinTransform(toss)
        }
      }

      renderer.render(scene, camera)
      gl.endFrameEXP()
    }

    frameRef.current = requestAnimationFrame(renderLoop)

    teardownRef.current = () => {
      cancelled = true
      const interrupted = tossRef.current
      startTossRef.current = null
      tossRef.current = null
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      geometry.dispose()
      for (const obj of tableDisposables) {
        obj.dispose()
      }
      shadowGeo.dispose()
      shadowMat.dispose()
      rimMaterial.dispose()
      headsMaterial.dispose()
      tailsMaterial.dispose()
      headsMap?.dispose()
      tailsMap?.dispose()
      renderer.dispose()
      // Unlock the Flip button if the GL view remounted mid-toss.
      if (interrupted?.active) {
        callbacksRef.current.onFlipComplete?.(
          outcomeFromAngle(interrupted.angle),
        )
      }
    }
  }, [canvasBackground])

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webFallback, {backgroundColor: canvasBackground}]} />
    )
  }

  return (
    <View
      style={[styles.container, {backgroundColor: canvasBackground}]}
      onLayout={onLayout}>
      {layout.width > 0 && layout.height > 0 ? (
        <GLView
          // Remount only on theme change — resizing from result text must not
          // tear down an in-flight toss (that left the Flip button stuck).
          key={`coin-gl-${colorScheme}`}
          style={{
            width: layout.width,
            height: layout.height,
            backgroundColor: canvasBackground,
          }}
          onContextCreate={onContextCreate}
        />
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webFallback: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
