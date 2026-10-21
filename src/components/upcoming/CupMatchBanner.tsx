import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import React from 'react'
import {Animated, Easing, StyleSheet, View} from 'react-native'

const STAGE_KEY_LABELS: Record<string, string> = {
  gold: 'Gold Cup',
  silver: 'Silver Cup',
  bronze: 'Bronze Cup',
  plate: 'Plate',
  spoon: 'Spoon',
  main: 'Main Cup',
}

const KNOWN_STAGE_KEYS = new Set(Object.keys(STAGE_KEY_LABELS))

export function formatCupBannerLabel(args: {
  round?: number | null
  stage_label?: string | null
  stage_key?: string | null
  division_name?: string | null
  fallback?: string
  /** Localized labels for known stage keys (gold/silver/bronze/…). */
  stageKeyLabels?: Partial<Record<string, string>>
}): string {
  const key = String(args.stage_key || '')
    .trim()
    .toLowerCase()
  const known =
    (key &&
      KNOWN_STAGE_KEYS.has(key) &&
      (args.stageKeyLabels?.[key] || STAGE_KEY_LABELS[key])) ||
    ''
  const stage =
    known ||
    String(args.stage_label || '').trim() ||
    STAGE_KEY_LABELS[key] ||
    String(args.division_name || '').trim() ||
    String(args.fallback || '').trim()

  const round = Number(args.round)
  if (Number.isFinite(round) && round > 0 && stage) {
    return `Round ${round} · ${stage}`
  }
  return stage
}

export default function CupMatchBanner({label}: {label: string}) {
  const pulse = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 4400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 4400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  const textColor = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#FFFFFF', '#78350F', '#FEF08A'],
  })

  return (
    <View style={styles.banner}>
      <Animated.View
        style={{
          opacity: pulse.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [1, 0.55, 1],
          }),
        }}>
        <MCI name="trophy" size={18} color="#FFFBEB" />
      </Animated.View>
      <Animated.Text style={[styles.label, {color: textColor}]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    marginLeft: -18,
    marginRight: -16,
    paddingLeft: 18,
    paddingRight: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
})
