import {
  addHingeListener,
  getHinge,
  isAvailable as isHingeAvailable,
  type Hinge,
} from 'expo-hinge'
import * as ScreenOrientation from 'expo-screen-orientation'
import {useEffect} from 'react'
import {Platform} from 'react-native'

/**
 * Portrait on bar phones; unlock rotation on iPad and on foldables
 * (iPhone Duo / Android) when the hinge is open / spanning the fold.
 *
 * Requires app.json `orientation: "default"` so Info.plist allows landscape.
 * Needs a native rebuild (expo-hinge + expo-screen-orientation).
 */
function shouldAllowRotation(hinge: Hinge | null): boolean {
  if (Platform.OS === 'web') return true
  // iPad already has a landscape-friendly form factor.
  if (Platform.OS === 'ios' && Platform.isPad) return true

  // Foldable with a live hinge: allow when not closed / cover-only.
  if (hinge != null) {
    if (hinge.status === 'closed') return false
    // Android cover / non-spanning window: status is often unknown + angle ~0.
    if (
      Platform.OS === 'android' &&
      hinge.status === 'unknown' &&
      hinge.angle < 30
    ) {
      return false
    }
    return true
  }

  // No hinge → bar phone (or hinge API unavailable on this build/OS).
  return false
}

async function applyOrientationLock(allowRotation: boolean) {
  try {
    await ScreenOrientation.lockAsync(
      allowRotation
        ? ScreenOrientation.OrientationLock.DEFAULT
        : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    )
  } catch (e) {
    // iOS 27+ may refuse locks while the window is resizable.
    if (__DEV__) {
      console.warn('orientation lock refused', e)
    }
  }
}

export function useAdaptiveOrientationLock() {
  useEffect(() => {
    if (Platform.OS === 'web') return

    let cancelled = false

    const sync = (hinge: Hinge | null) => {
      if (cancelled) return
      void applyOrientationLock(shouldAllowRotation(hinge))
    }

    sync(isHingeAvailable() ? getHinge() : null)

    if (!isHingeAvailable()) {
      return () => {
        cancelled = true
      }
    }

    const sub = addHingeListener(({hinge}) => {
      sync(hinge)
    })

    return () => {
      cancelled = true
      sub.remove()
    }
  }, [])
}
