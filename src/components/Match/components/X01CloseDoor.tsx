import React from 'react'
import {Modal, Platform, StyleSheet, Text, View} from 'react-native'
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
/** Accelerate into the slam. */
const EASE_SLAM = Easing.bezier(0.55, 0.06, 0.9, 0.2)
const EASE_BOUNCE = Easing.bezier(0.34, 1.45, 0.64, 1)

const SWING_MS = 380
const SQUASH_MS = 85
const REBOUND_MS = 150
const SETTLE_MS = 200
const HOLD_MS = 750
const FADE_MS = 280
const TOTAL_MS =
  SWING_MS + SQUASH_MS + REBOUND_MS + SETTLE_MS + HOLD_MS + FADE_MS

function CartoonDoor() {
  return (
    <View style={styles.door}>
      <View style={styles.doorInset}>
        <View style={styles.panel} />
        <View style={[styles.panel, {marginTop: 10}]} />
        <View style={styles.knob} />
        <View style={styles.knobStem} />
      </View>
      <View style={styles.hingeTop} />
      <View style={styles.hingeMid} />
      <View style={styles.hingeBot} />
    </View>
  )
}

function SmokePuff({
  playKey,
  dx,
  dy,
  size,
  delay,
}: {
  playKey: number
  dx: number
  dy: number
  size: number
  delay: number
}) {
  const progress = useSharedValue(0)

  React.useEffect(() => {
    progress.set(0)
    progress.set(
      withDelay(
        delay,
        withSequence(
          withTiming(1, {duration: 420, easing: EASE_OUT}),
          withTiming(0, {duration: 380, easing: EASE_OUT}),
        ),
      ),
    )
  }, [playKey, progress, delay])

  const style = useAnimatedStyle(() => {
    const p = progress.get()
    return {
      opacity: Math.min(1, p * 1.4) * (1 - Math.max(0, p - 0.55) / 0.45) * 0.9,
      transform: [
        {translateX: dx * p},
        {translateY: dy * p - 8 * p},
        {scale: 0.35 + 1.15 * p},
      ],
    }
  })

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: 'rgba(226, 232, 240, 0.92)',
          borderWidth: 1,
          borderColor: 'rgba(148, 163, 184, 0.7)',
        },
        style,
      ]}
    />
  )
}

function SmokeBurst({playKey}: {playKey: number}) {
  const t0 = SWING_MS
  return (
    <View style={styles.smokeOrigin} pointerEvents="none">
      <SmokePuff playKey={playKey} dx={18} dy={-10} size={28} delay={t0} />
      <SmokePuff playKey={playKey} dx={36} dy={6} size={34} delay={t0 + 30} />
      <SmokePuff playKey={playKey} dx={22} dy={22} size={24} delay={t0 + 55} />
      <SmokePuff playKey={playKey} dx={48} dy={-4} size={20} delay={t0 + 80} />
      <SmokePuff playKey={playKey} dx={8} dy={28} size={30} delay={t0 + 40} />
      <SmokePuff playKey={playKey} dx={-6} dy={18} size={22} delay={t0 + 70} />
    </View>
  )
}

function SlammingDoor({playKey}: {playKey: number}) {
  const open = useSharedValue(1)
  const scaleX = useSharedValue(1)
  const scaleY = useSharedValue(1)
  const skew = useSharedValue(0)
  const opacity = useSharedValue(1)

  React.useEffect(() => {
    open.set(1)
    scaleX.set(1)
    scaleY.set(1)
    skew.set(-6)
    opacity.set(1)

    // open=1 → nearly edge-on; open=0 → fully shut facing camera.
    open.set(
      withTiming(0, {duration: SWING_MS, easing: EASE_SLAM}),
    )
    // Squash into the jamb, then bounce back with opposite stretch.
    scaleX.set(
      withSequence(
        withTiming(1, {duration: SWING_MS, easing: EASE_SLAM}),
        withTiming(0.72, {duration: SQUASH_MS, easing: EASE_OUT}),
        withTiming(1.14, {duration: REBOUND_MS, easing: EASE_BOUNCE}),
        withTiming(1, {duration: SETTLE_MS, easing: EASE_OUT}),
      ),
    )
    scaleY.set(
      withSequence(
        withTiming(1.04, {duration: SWING_MS, easing: EASE_SLAM}),
        withTiming(1.28, {duration: SQUASH_MS, easing: EASE_OUT}),
        withTiming(0.9, {duration: REBOUND_MS, easing: EASE_BOUNCE}),
        withTiming(1, {duration: SETTLE_MS, easing: EASE_OUT}),
      ),
    )
    skew.set(
      withSequence(
        withTiming(0, {duration: SWING_MS, easing: EASE_SLAM}),
        withTiming(4, {duration: SQUASH_MS, easing: EASE_OUT}),
        withTiming(-2, {duration: REBOUND_MS, easing: EASE_BOUNCE}),
        withTiming(0, {duration: SETTLE_MS, easing: EASE_OUT}),
      ),
    )
    opacity.set(
      withDelay(
        SWING_MS + SQUASH_MS + REBOUND_MS + SETTLE_MS + HOLD_MS,
        withTiming(0, {duration: FADE_MS, easing: EASE_OUT}),
      ),
    )
  }, [playKey, open, scaleX, scaleY, skew, opacity])

  const frameStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
  }))

  const doorStyle = useAnimatedStyle(() => {
    const o = open.get()
    // Fake perspective: thin when open, full width when shut.
    const face = 0.08 + 0.92 * (1 - o)
    return {
      transform: [
        {perspective: 900},
        {rotateY: `${-78 * o}deg`},
        {scaleX: scaleX.get() * face},
        {scaleY: scaleY.get()},
        {rotate: `${skew.get()}deg`},
      ],
    }
  })

  return (
    <Animated.View style={[styles.stage, frameStyle]}>
      <View style={styles.centerAnchor}>
        <View style={styles.jamb}>
          <View style={styles.jambTop} />
          <View style={styles.jambLeft} />
          <View style={styles.jambRight} />
          <View style={styles.threshold} />
          <Animated.View style={[styles.doorPivot, doorStyle]}>
            <CartoonDoor />
          </Animated.View>
          <SmokeBurst playKey={playKey} />
        </View>
      </View>
    </Animated.View>
  )
}

function CloseBadge({
  playKey,
  label,
  reduced,
}: {
  playKey: number
  label: string
  reduced: boolean
}) {
  const progress = useSharedValue(0)

  React.useEffect(() => {
    progress.set(0)
    if (reduced) {
      progress.set(
        withSequence(
          withTiming(1, {duration: 180, easing: EASE_OUT}),
          withDelay(700, withTiming(0, {duration: 220, easing: EASE_OUT})),
        ),
      )
      return
    }
    progress.set(
      withDelay(
        Math.max(0, SWING_MS - 40),
        withSequence(
          withTiming(1, {duration: 220, easing: EASE_OUT}),
          withDelay(
            HOLD_MS + REBOUND_MS + SETTLE_MS,
            withTiming(0, {duration: FADE_MS, easing: EASE_OUT}),
          ),
        ),
      ),
    )
  }, [playKey, progress, reduced])

  const style = useAnimatedStyle(() => {
    const p = progress.get()
    return {
      opacity: p,
      transform: [{scale: 0.88 + 0.16 * p}],
    }
  })

  return (
    <Animated.View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{label}</Text>
    </Animated.View>
  )
}

/**
 * Full-screen cartoon door slam for a checkout / close.
 * Dismisses itself so it cannot leave a blocking overlay.
 */
export default function X01CloseDoor({
  playKey,
  finished,
  onDone,
}: {
  playKey: number
  /** True when the close also finishes the match/game set. */
  finished?: boolean
  onDone?: () => void
}) {
  const reduced = Boolean(useReducedMotion())
  const [visible, setVisible] = React.useState(false)
  const [activeKey, setActiveKey] = React.useState(0)
  const [label, setLabel] = React.useState('CLOSED')
  const onDoneRef = React.useRef(onDone)
  onDoneRef.current = onDone

  const finish = React.useCallback(() => {
    setVisible(false)
    setActiveKey(0)
    onDoneRef.current?.()
  }, [])

  React.useEffect(() => {
    if (playKey <= 0) return
    setActiveKey(playKey)
    setLabel(finished ? 'FINISHED' : 'CLOSED')
    setVisible(true)
    const ms = reduced ? 1200 : TOTAL_MS + 80
    const id = setTimeout(() => finish(), ms)
    return () => clearTimeout(id)
  }, [playKey, finished, reduced, finish])

  if (!visible || activeKey <= 0) return null

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
      <View
        pointerEvents="none"
        style={styles.root}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <View style={styles.sky} />
        <View style={styles.centerStack}>
          <CloseBadge
            playKey={activeKey}
            label={label}
            reduced={reduced}
          />
          {!reduced ? <SlammingDoor playKey={activeKey} /> : null}
        </View>
      </View>
    </Modal>
  )
}

const WOOD = '#B45309'
const WOOD_DARK = '#78350F'
const WOOD_LIGHT = '#D97706'
const FRAME = '#44403C'
const KNOB = '#FBBF24'

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 25, 23, 0.35)',
  },
  centerStack: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAnchor: {
    width: 196,
    height: 268,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jamb: {
    width: 196,
    height: 268,
    borderRadius: 10,
    borderWidth: 8,
    borderColor: FRAME,
    backgroundColor: 'rgba(68, 64, 60, 0.35)',
    overflow: 'visible',
    justifyContent: 'center',
  },
  jambTop: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    height: 10,
    backgroundColor: FRAME,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  jambLeft: {
    position: 'absolute',
    left: -8,
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: FRAME,
  },
  jambRight: {
    position: 'absolute',
    right: -8,
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: FRAME,
  },
  threshold: {
    position: 'absolute',
    left: -8,
    right: -8,
    bottom: -8,
    height: 12,
    backgroundColor: '#292524',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  doorPivot: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 8,
    width: '100%',
    // Hinge on the left edge.
    transformOrigin: 'left center',
  },
  door: {
    flex: 1,
    marginRight: 2,
    marginLeft: 2,
    borderRadius: 6,
    backgroundColor: WOOD,
    borderWidth: 3,
    borderColor: WOOD_DARK,
    overflow: 'hidden',
  },
  doorInset: {
    flex: 1,
    margin: 10,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: WOOD_DARK,
    backgroundColor: WOOD_LIGHT,
    padding: 8,
  },
  panel: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: WOOD_DARK,
    backgroundColor: WOOD,
  },
  knob: {
    position: 'absolute',
    right: 14,
    top: '48%',
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: KNOB,
    borderWidth: 2,
    borderColor: '#B45309',
  },
  knobStem: {
    position: 'absolute',
    right: 28,
    top: '48%',
    marginTop: -3,
    width: 10,
    height: 6,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
  },
  hingeTop: {
    position: 'absolute',
    left: 2,
    top: 28,
    width: 12,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#A8A29E',
    borderWidth: 1,
    borderColor: '#57534E',
  },
  hingeMid: {
    position: 'absolute',
    left: 2,
    top: '48%',
    marginTop: -9,
    width: 12,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#A8A29E',
    borderWidth: 1,
    borderColor: '#57534E',
  },
  hingeBot: {
    position: 'absolute',
    left: 2,
    bottom: 28,
    width: 12,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#A8A29E',
    borderWidth: 1,
    borderColor: '#57534E',
  },
  smokeOrigin: {
    position: 'absolute',
    right: 8,
    top: '42%',
    width: 1,
    height: 1,
  },
  badge: {
    zIndex: 50,
    minWidth: 160,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(28, 25, 23, 0.88)',
    borderWidth: 2,
    borderColor: KNOB,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: KNOB,
    fontFamily: 'SairaExtraCondensed',
    fontSize: 36,
    fontWeight: 'normal',
    letterSpacing: 3,
    textShadowColor: 'rgba(251, 191, 36, 0.4)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 12,
  },
})
