import React from 'react'
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1)

/** Warm → cool palette pairs per shell (core / tip). */
const PALETTES = [
  ['#FFF7ED', '#FBBF24', '#F59E0B', '#EA580C', '#9A3412'],
  ['#FEF2F2', '#FCA5A5', '#EF4444', '#BE123C', '#881337'],
  ['#FDF4FF', '#E9D5FF', '#C084FC', '#A855F7', '#6B21A8'],
  ['#EFF6FF', '#BAE6FD', '#38BDF8', '#2563EB', '#1E3A8A'],
  ['#ECFDF5', '#A7F3D0', '#34D399', '#059669', '#064E3B'],
  ['#FFFBEB', '#FEF08A', '#FACC15', '#EAB308', '#A16207'],
]

type ShellSpec = {
  id: number
  /** Burst center as fraction of screen. */
  x: number
  y: number
  delay: number
  palette: number
  riseFromY: number
}

type ParticleSpec = {
  id: string
  shell: number
  kind: 'streak' | 'ember' | 'flash'
  angle: number
  distance: number
  length: number
  width: number
  color: string
  delay: number
  duration: number
  gravity: number
}

function hash(n: number) {
  let x = (n * 2654435761) >>> 0
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  return x >>> 0
}

function buildShow(burst: number, width: number, height: number): {
  shells: ShellSpec[]
  particles: ParticleSpec[]
} {
  const shells: ShellSpec[] = []
  const particles: ParticleSpec[] = []
  const shellCount = 4
  const short = Math.min(width, height)

  // Keep bursts in the mid band so rising sparks stay below the status area.
  const topPad = height * 0.12
  const maxBurstY = height * 0.58
  const minBurstY = height * 0.34

  for (let s = 0; s < shellCount; s++) {
    const h = hash(burst * 31 + s * 97)
    const x = 0.18 + ((h % 640) / 640) * 0.64
    const yPx = minBurstY + (((h >> 8) % 1000) / 1000) * (maxBurstY - minBurstY)
    const y = yPx / height
    const delay = s * 320 + (h % 100)
    const palette = (burst + s) % PALETTES.length
    const roomUp = Math.max(48, yPx - topPad)
    shells.push({
      id: s,
      x,
      y,
      delay,
      palette,
      riseFromY: Math.min(0.94, y + 0.38 + ((h >> 4) % 16) / 100),
    })

    const colors = PALETTES[palette]
    const streaks = 22
    for (let i = 0; i < streaks; i++) {
      const n = hash(burst * 13 + s * 401 + i * 17)
      const angle = (360 / streaks) * i + ((n % 17) - 8)
      const rad = (angle * Math.PI) / 180
      // RN y grows downward; negative sin goes toward the top of the screen.
      const up = Math.max(0, -Math.sin(rad))
      const raw = short * (0.14 + ((n % 50) / 100) * 0.18)
      const dist = Math.min(raw, up > 0.15 ? roomUp / Math.max(up, 0.2) : raw)
      particles.push({
        id: `s-${s}-${i}`,
        shell: s,
        kind: 'streak',
        angle,
        distance: dist,
        length: 14 + (n % 16),
        width: 2 + (n % 3),
        color: colors[1 + (n % 3)],
        delay: delay + 40 + (n % 50),
        duration: 1200 + (n % 520),
        gravity: 90 + (n % 55),
      })
    }

    const embers = 26
    for (let i = 0; i < embers; i++) {
      const n = hash(burst * 19 + s * 503 + i * 23)
      const angle = (n % 3600) / 10
      const rad = (angle * Math.PI) / 180
      const up = Math.max(0, -Math.sin(rad))
      const raw = short * (0.08 + ((n % 60) / 100) * 0.2)
      const dist = Math.min(raw, up > 0.15 ? roomUp / Math.max(up, 0.2) : raw)
      particles.push({
        id: `e-${s}-${i}`,
        shell: s,
        kind: 'ember',
        angle,
        distance: dist,
        length: 3 + (n % 5),
        width: 3 + (n % 5),
        color: colors[n % colors.length],
        delay: delay + 90 + (n % 130),
        duration: 1500 + (n % 750),
        gravity: 110 + (n % 90),
      })
    }

    particles.push({
      id: `f-${s}`,
      shell: s,
      kind: 'flash',
      angle: 0,
      distance: short * 0.1,
      length: short * 0.2,
      width: short * 0.2,
      color: colors[0],
      delay: delay + 20,
      duration: 520,
      gravity: 0,
    })
  }

  return {shells, particles}
}

function RocketTrail({
  shell,
  playKey,
  width,
  height,
}: {
  shell: ShellSpec
  playKey: number
  width: number
  height: number
}) {
  const progress = useSharedValue(0)
  const colors = PALETTES[shell.palette]
  const ox = shell.x * width
  const startY = shell.riseFromY * height
  const endY = shell.y * height
  const rise = startY - endY

  React.useEffect(() => {
    progress.set(0)
    progress.set(
      withDelay(
        Math.max(0, shell.delay - 220),
        withTiming(1, {duration: 420, easing: EASE_IN_OUT}),
      ),
    )
  }, [playKey, progress, shell.delay])

  const style = useAnimatedStyle(() => {
    const p = progress.get()
    const y = startY - rise * p
    const opacity = p < 0.08 ? p / 0.08 : Math.max(0, 1 - (p - 0.72) / 0.28)
    return {
      opacity: p <= 0 || p >= 1 ? 0 : opacity,
      transform: [
        {translateX: ox},
        {translateY: y},
        {scaleY: 0.85 + 0.35 * (1 - p)},
      ],
    }
  })

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: 3,
          height: 28,
          marginLeft: -1.5,
          marginTop: -14,
          borderRadius: 2,
          backgroundColor: colors[1],
        },
        style,
      ]}>
      <View
        style={{
          position: 'absolute',
          left: -2,
          right: -2,
          bottom: -6,
          height: 16,
          borderRadius: 8,
          backgroundColor: colors[2],
          opacity: 0.55,
        }}
      />
    </Animated.View>
  )
}

function Particle({
  spec,
  shell,
  playKey,
  width,
  height,
}: {
  spec: ParticleSpec
  shell: ShellSpec
  playKey: number
  width: number
  height: number
}) {
  const progress = useSharedValue(0)
  const ox = shell.x * width
  const oy = shell.y * height

  React.useEffect(() => {
    progress.set(0)
    progress.set(
      withDelay(
        spec.delay,
        withTiming(1, {duration: spec.duration, easing: EASE_OUT}),
      ),
    )
  }, [playKey, progress, spec.delay, spec.duration])

  const style = useAnimatedStyle(() => {
    const p = progress.get()
    if (spec.kind === 'flash') {
      const opacity =
        p <= 0 ? 0 : p < 0.18 ? p / 0.18 : Math.max(0, 1 - (p - 0.18) / 0.82)
      const scale = 0.35 + 1.35 * Math.min(1, p * 1.6)
      return {
        opacity: opacity * 0.85,
        transform: [
          {translateX: ox},
          {translateY: oy},
          {scale},
        ],
      }
    }

    const rad = (spec.angle * Math.PI) / 180
    // Ease-out travel with gravity — fast blast, then settle.
    const travel = 1 - Math.pow(1 - p, 2.35)
    const drag = 1 - 0.22 * p
    const dist = spec.distance * travel * drag
    const x = Math.cos(rad) * dist
    const y = Math.sin(rad) * dist + spec.gravity * p * p
    const fadeStart = spec.kind === 'streak' ? 0.35 : 0.2
    const opacity =
      p <= 0
        ? 0
        : p < 0.08
          ? p / 0.08
          : Math.max(0, 1 - (p - fadeStart) / (1 - fadeStart))
    const stretch =
      spec.kind === 'streak' ? 1.15 - 0.55 * p : 1 - 0.35 * p

    return {
      opacity,
      transform: [
        {translateX: ox + x},
        {translateY: oy + y},
        {rotate: `${spec.angle + 90}deg`},
        {scaleX: stretch},
        {scaleY: spec.kind === 'streak' ? 1 : stretch},
      ],
    }
  })

  if (spec.kind === 'flash') {
    return (
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            width: spec.width,
            height: spec.width,
            marginLeft: -spec.width / 2,
            marginTop: -spec.width / 2,
            borderRadius: spec.width,
            backgroundColor: spec.color,
          },
          style,
        ]}
      />
    )
  }

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: spec.width,
          height: spec.length,
          marginLeft: -spec.width / 2,
          marginTop: -spec.length / 2,
          borderRadius: spec.width,
          backgroundColor: spec.color,
          // Soft tip without per-frame shadow cost.
          borderBottomColor:
            spec.kind === 'streak' ? 'rgba(255,255,255,0.65)' : spec.color,
          borderBottomWidth: spec.kind === 'streak' ? 2 : 0,
        },
        style,
      ]}
    />
  )
}

function SkyDim({playKey, reduced}: {playKey: number; reduced: boolean}) {
  const progress = useSharedValue(0)

  React.useEffect(() => {
    progress.set(0)
    if (reduced) {
      progress.set(
        withSequence(
          withTiming(1, {duration: 160, easing: EASE_OUT}),
          withDelay(700, withTiming(0, {duration: 280, easing: EASE_OUT})),
        ),
      )
      return
    }
    progress.set(
      withSequence(
        withTiming(1, {duration: 280, easing: EASE_OUT}),
        withDelay(2100, withTiming(0, {duration: 520, easing: EASE_OUT})),
      ),
    )
  }, [playKey, progress, reduced])

  const style = useAnimatedStyle(() => ({
    opacity: 0.55 * progress.get(),
  }))

  return <Animated.View pointerEvents="none" style={[styles.sky, style]} />
}

function OneEightyBadge({
  playKey,
  name,
  reduced,
}: {
  playKey: number
  name: string
  reduced: boolean
}) {
  const progress = useSharedValue(0)

  React.useEffect(() => {
    progress.set(0)
    progress.set(
      withSequence(
        withTiming(1, {
          duration: reduced ? 180 : 260,
          easing: EASE_OUT,
        }),
        withDelay(reduced ? 700 : 1600, withTiming(0, {
          duration: reduced ? 220 : 380,
          easing: EASE_OUT,
        })),
      ),
    )
  }, [playKey, progress, reduced])

  const style = useAnimatedStyle(() => {
    const p = progress.get()
    return {
      opacity: p,
      transform: [
        {translateX: '-50%'},
        {translateY: '-50%'},
        {scale: 0.9 + 0.14 * p},
      ],
    }
  })

  return (
    <Animated.View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>180</Text>
      {name ? (
        <Text numberOfLines={1} style={styles.badgeName}>
          {name}
        </Text>
      ) : null}
    </Animated.View>
  )
}

/**
 * True full-window fireworks for a maximum visit.
 * Mount with a rising `playKey` each time a 180 is entered.
 * The Modal is dismissed when the show ends so it cannot block touches.
 */
export default function X01Fireworks({
  playKey,
  name = '',
  onDone,
}: {
  playKey: number
  name?: string
  onDone?: () => void
}) {
  const reduced = Boolean(useReducedMotion())
  const {width, height} = useWindowDimensions()
  const [visible, setVisible] = React.useState(false)
  const [activeKey, setActiveKey] = React.useState(0)
  const onDoneRef = React.useRef(onDone)
  onDoneRef.current = onDone
  const show = React.useMemo(
    () =>
      reduced || activeKey <= 0
        ? null
        : buildShow(activeKey, width, height),
    [activeKey, reduced, width, height],
  )

  const finish = React.useCallback(() => {
    setVisible(false)
    setActiveKey(0)
    onDoneRef.current?.()
  }, [])

  React.useEffect(() => {
    if (playKey <= 0) return
    setActiveKey(playKey)
    setVisible(true)
    const ms = reduced ? 1300 : 3200
    const id = setTimeout(() => finish(), ms)
    return () => clearTimeout(id)
  }, [playKey, reduced, finish])

  if (!visible || activeKey <= 0) return null

  const body = (
    <View
      pointerEvents="none"
      style={styles.root}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <SkyDim playKey={activeKey} reduced={reduced} />
      {show
        ? show.shells.map(shell => (
            <RocketTrail
              key={`r-${activeKey}-${shell.id}`}
              shell={shell}
              playKey={activeKey}
              width={width}
              height={height}
            />
          ))
        : null}
      {show
        ? show.particles.map(spec => (
            <Particle
              key={`${activeKey}-${spec.id}`}
              spec={spec}
              shell={show.shells[spec.shell]}
              playKey={activeKey}
              width={width}
              height={height}
            />
          ))
        : null}
      <OneEightyBadge playKey={activeKey} name={name} reduced={reduced} />
    </View>
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      presentationStyle={
        Platform.OS === 'ios' ? 'overFullScreen' : undefined
      }
      hardwareAccelerated
      onRequestClose={finish}>
      {body}
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
  },
  badge: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    zIndex: 50,
    minWidth: 132,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
    borderWidth: 1.5,
    borderColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FBBF24',
    fontFamily: 'SairaExtraCondensed',
    fontSize: 52,
    fontWeight: 'normal',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
    textShadowColor: 'rgba(251, 191, 36, 0.55)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 16,
  },
  badgeName: {
    marginTop: 2,
    maxWidth: 220,
    color: '#FFF7ED',
    fontFamily: 'SairaExtraCondensed',
    fontSize: 22,
    fontWeight: 'normal',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
})
