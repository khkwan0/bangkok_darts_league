import {
  addHingeListener,
  getHinge,
  isAvailable as isHingeAvailable,
  type Hinge,
} from 'expo-hinge'
import {useEffect, useState} from 'react'
import {Platform} from 'react-native'

export type HingePose = 'none' | 'closed' | 'open' | 'book'

function poseFromHinge(hinge: Hinge | null): HingePose {
  if (hinge == null) return 'none'
  if (hinge.status === 'closed') return 'closed'
  if (
    Platform.OS === 'android' &&
    hinge.status === 'unknown' &&
    hinge.angle < 30
  ) {
    return 'closed'
  }
  // Book / laptop-ish: crease matters for layout gutters.
  if (hinge.status === 'partiallyOpen') {
    return 'book'
  }
  if (hinge.status === 'fullyOpen') {
    return 'open'
  }
  if (hinge.angle > 20 && hinge.angle < 150) {
    return 'book'
  }
  return 'open'
}

/**
 * Live hinge pose for fold-sensitive panes (scoresheet arrangement, etc.).
 * Returns `none` when the hinge API is unavailable (bar phones, old builds).
 */
export function useHingePose(): HingePose {
  const [pose, setPose] = useState<HingePose>(() => {
    if (!isHingeAvailable()) return 'none'
    return poseFromHinge(getHinge())
  })

  useEffect(() => {
    if (!isHingeAvailable()) {
      setPose('none')
      return
    }

    setPose(poseFromHinge(getHinge()))
    const sub = addHingeListener(({hinge}) => {
      setPose(poseFromHinge(hinge))
    })
    return () => sub.remove()
  }, [])

  return pose
}
