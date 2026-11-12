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
/** Accelerate into the ground — intentional for a falling prop. */
const EASE_FALL = Easing.bezier(0.55, 0.06, 0.85, 0.25)
const EASE_BOUNCE = Easing.bezier(0.34, 1.4, 0.64, 1)

const FALL_MS = 520
const SQUASH_MS = 90
const REBOUND_MS = 160
const SETTLE_MS = 220
const HOLD_MS = 700
const FADE_MS = 280
const TOTAL_MS = FALL_MS + SQUASH_MS + REBOUND_MS + SETTLE_MS + HOLD_MS + FADE_MS

function CartoonAnvil() {
  return (
    <View style={styles.anvil}>
      <View style={styles.hornRow}>
        <View style={styles.hornLeft} />
        <View style={styles.topBlock} />
        <View style={styles.hornRight} />
      </View>
      <View style={styles.neck} />
      <View style={styles.waist} />
      <View style={styles.baseTop} />
      <View style={styles.base} />
      <View style={styles.baseLip} />
    </View>
  )
}

function ImpactDust({playKey}: {playKey: number}) {
  const progress = useSharedValue(0)

  React.useEffect(() => {
    progress.set(0)
    progress.set(
      withDelay(
        FALL_MS,
        withSequence(
          withTiming(1, {duration: 180, easing: EASE_OUT}),
          withTiming(0, {duration: 320, easing: EASE_OUT}),
        ),
      ),
    )
  }, [playKey, progress])

  const left = useAnimatedStyle(() => {
    const p = progress.get()
    return {
      opacity: p * 0.85,
      transform: [
        {translateX: -18 - 42 * p},
        {scaleX: 0.4 + 1.4 * p},
        {scaleY: 1 - 0.35 * p},
      ],
    }
  })
  const right = useAnimatedStyle(() => {
    const p = progress.get()
    return {
      opacity: p * 0.85,
      transform: [
        {translateX: 18 + 42 * p},
        {scaleX: 0.4 + 1.4 * p},
        {scaleY: 1 - 0.35 * p},
      ],
    }
  })

  return (
    <>
      <Animated.View style={[styles.dust, left]} />
      <Animated.View style={[styles.dust, right]} />
    </>
  )
}

function FallingAnvil({playKey}: {playKey: number}) {
  const drop = useSharedValue(-280)
  const scaleX = useSharedValue(1)
  const scaleY = useSharedValue(1)
  const opacity = useSharedValue(1)

  React.useEffect(() => {
    drop.set(-280)
    scaleX.set(1)
    scaleY.set(1)
    opacity.set(1)

    // Stretch slightly while falling, then hard squash on impact,
    // rebound tall/narrow, settle, hold, fade.
    drop.set(
      withSequence(
        withTiming(0, {duration: FALL_MS, easing: EASE_FALL}),
        withTiming(-28, {duration: REBOUND_MS, easing: EASE_BOUNCE}),
        withTiming(0, {duration: SETTLE_MS, easing: EASE_OUT}),
      ),
    )
    scaleX.set(
      withSequence(
        withTiming(0.92, {duration: FALL_MS, easing: EASE_FALL}),
        withTiming(1.42, {duration: SQUASH_MS, easing: EASE_OUT}),
        withTiming(0.88, {duration: REBOUND_MS, easing: EASE_BOUNCE}),
        withTiming(1, {duration: SETTLE_MS, easing: EASE_OUT}),
      ),
    )
    scaleY.set(
      withSequence(
        withTiming(1.18, {duration: FALL_MS, easing: EASE_FALL}),
        withTiming(0.52, {duration: SQUASH_MS, easing: EASE_OUT}),
        withTiming(1.22, {duration: REBOUND_MS, easing: EASE_BOUNCE}),
        withTiming(1, {duration: SETTLE_MS, easing: EASE_OUT}),
      ),
    )
    opacity.set(
      withDelay(
        FALL_MS + SQUASH_MS + REBOUND_MS + SETTLE_MS + HOLD_MS,
        withTiming(0, {duration: FADE_MS, easing: EASE_OUT}),
      ),
    )
  }, [playKey, drop, scaleX, scaleY, opacity])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [
      {translateX: '-50%'},
      {translateY: drop.get()},
      {scaleX: scaleX.get()},
      {scaleY: scaleY.get()},
    ],
  }))

  return (
    <Animated.View style={[styles.anvilWrap, style]}>
      <CartoonAnvil />
      <ImpactDust playKey={playKey} />
    </Animated.View>
  )
}

function TonBadge({
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
        Math.max(0, FALL_MS - 80),
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
      transform: [
        {translateX: '-50%'},
        {translateY: '-50%'},
        {scale: 0.88 + 0.16 * p},
      ],
    }
  })

  return (
    <Animated.View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>TON</Text>
      <Text style={styles.badgeScore}>{label}</Text>
    </Animated.View>
  )
}

/**
 * Full-screen cartoon anvil drop for a ton (100–179).
 * Dismisses itself so it cannot leave a blocking overlay.
 */
export default function X01TonAnvil({
  playKey,
  points,
  onDone,
}: {
  playKey: number
  points: number
  onDone?: () => void
}) {
  const reduced = Boolean(useReducedMotion())
  const [visible, setVisible] = React.useState(false)
  const [activeKey, setActiveKey] = React.useState(0)
  const [label, setLabel] = React.useState('')
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
    setLabel(String(Math.trunc(points) || 100))
    setVisible(true)
    const ms = reduced ? 1200 : TOTAL_MS + 80
    const id = setTimeout(() => finish(), ms)
    return () => clearTimeout(id)
  }, [playKey, points, reduced, finish])

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
        {!reduced ? <FallingAnvil playKey={activeKey} /> : null}
        <View style={styles.groundHint} />
        <TonBadge playKey={activeKey} label={label} reduced={reduced} />
      </View>
    </Modal>
  )
}

const METAL = '#64748B'
const METAL_DARK = '#334155'
const METAL_LIGHT = '#94A3B8'
const RIVET = '#FBBF24'

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  groundHint: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: '58%',
    height: 10,
    marginTop: 54,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
  },
  anvilWrap: {
    position: 'absolute',
    left: '50%',
    top: '52%',
    width: 168,
    alignItems: 'center',
  },
  anvil: {
    width: 168,
    alignItems: 'center',
  },
  hornRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  hornLeft: {
    width: 36,
    height: 22,
    marginRight: -4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 4,
    backgroundColor: METAL_LIGHT,
    borderWidth: 2,
    borderColor: METAL_DARK,
  },
  hornRight: {
    width: 28,
    height: 18,
    marginLeft: -4,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 4,
    backgroundColor: METAL,
    borderWidth: 2,
    borderColor: METAL_DARK,
  },
  topBlock: {
    width: 88,
    height: 28,
    borderRadius: 6,
    backgroundColor: METAL,
    borderWidth: 2,
    borderColor: METAL_DARK,
  },
  neck: {
    width: 36,
    height: 16,
    marginTop: -2,
    backgroundColor: METAL_DARK,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#1E293B',
  },
  waist: {
    width: 48,
    height: 20,
    marginTop: -2,
    borderRadius: 4,
    backgroundColor: METAL,
    borderWidth: 2,
    borderColor: METAL_DARK,
  },
  baseTop: {
    width: 108,
    height: 14,
    marginTop: -2,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: METAL_LIGHT,
    borderWidth: 2,
    borderColor: METAL_DARK,
  },
  base: {
    width: 128,
    height: 28,
    marginTop: -2,
    backgroundColor: METAL,
    borderWidth: 2,
    borderColor: METAL_DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseLip: {
    width: 140,
    height: 12,
    marginTop: -2,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: METAL_DARK,
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  dust: {
    position: 'absolute',
    bottom: -6,
    width: 36,
    height: 8,
    borderRadius: 4,
    backgroundColor: RIVET,
  },
  badge: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    zIndex: 50,
    minWidth: 148,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    borderWidth: 2,
    borderColor: RIVET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: RIVET,
    fontFamily: 'SairaExtraCondensed',
    fontSize: 52,
    fontWeight: 'normal',
    letterSpacing: 4,
    textShadowColor: 'rgba(251, 191, 36, 0.45)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 14,
  },
  badgeScore: {
    marginTop: 2,
    color: '#FFF7ED',
    fontFamily: 'SairaExtraCondensed',
    fontSize: 22,
    fontWeight: 'normal',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
})
