import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import React from 'react'
import {Animated, Easing, StyleSheet, Text, View} from 'react-native'

const STAGE_KEY_LABELS: Record<string, string> = {
  gold: 'Gold Cup',
  silver: 'Silver Cup',
  bronze: 'Bronze Cup',
  plate: 'Plate',
  spoon: 'Spoon',
  main: 'Main Cup',
}

const KNOWN_STAGE_KEYS = new Set(Object.keys(STAGE_KEY_LABELS))

/** Medal palette aligned with league standings rank 1–3. */
export type CupTierTheme = {
  key: 'gold' | 'silver' | 'bronze' | 'default'
  /** Card / accent border */
  border: string
  /** Solid accent (VS badge, chips, stripe) */
  accent: string
  /** Soft glow behind the card */
  glow: string
  /** Banner strip background */
  banner: string
  /** Light-mode board fill */
  boardBgLight: string
  /** Dark-mode board fill */
  boardBgDark: string
  /** Banner pulse text colors [start, mid, end] */
  bannerText: [string, string, string]
  /** Trophy icon on banner */
  bannerIcon: string
}

const CUP_TIER_THEMES: Record<'gold' | 'silver' | 'bronze' | 'default', CupTierTheme> =
  {
    gold: {
      key: 'gold',
      border: '#d4a017',
      accent: '#d4a017',
      glow: 'rgba(212,160,23,0.32)',
      banner: '#d4a017',
      boardBgLight: '#FFFBEB',
      boardBgDark: 'rgba(69,40,8,0.55)',
      bannerText: ['#FFFFFF', '#5c4308', '#fff8dc'],
      bannerIcon: '#FFFBEB',
    },
    silver: {
      key: 'silver',
      border: '#9CA3AF',
      accent: '#6b7280',
      glow: 'rgba(107,114,128,0.28)',
      banner: '#6b7280',
      boardBgLight: '#F8FAFC',
      boardBgDark: 'rgba(30,41,59,0.72)',
      bannerText: ['#FFFFFF', '#3f3f46', '#e5e7eb'],
      bannerIcon: '#F8FAFC',
    },
    bronze: {
      key: 'bronze',
      border: '#b87333',
      accent: '#b87333',
      glow: 'rgba(184,115,51,0.30)',
      banner: '#b87333',
      boardBgLight: '#FFF7ED',
      boardBgDark: 'rgba(69,40,8,0.50)',
      bannerText: ['#FFFFFF', '#4a240c', '#f8e0c8'],
      bannerIcon: '#FFF7ED',
    },
    default: {
      key: 'default',
      border: '#F59E0B',
      accent: '#F59E0B',
      glow: 'rgba(245,158,11,0.28)',
      banner: '#F59E0B',
      boardBgLight: '#FFFBEB',
      boardBgDark: 'rgba(69,40,8,0.55)',
      bannerText: ['#FFFFFF', '#78350F', '#FEF08A'],
      bannerIcon: '#FFFBEB',
    },
  }

export function getCupTierTheme(stageKey?: string | null): CupTierTheme {
  const key = String(stageKey || '')
    .trim()
    .toLowerCase()
  if (key === 'gold' || key === 'silver' || key === 'bronze') {
    return CUP_TIER_THEMES[key]
  }
  return CUP_TIER_THEMES.default
}

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

export default function CupMatchBanner({
  label,
  stageKey,
}: {
  label: string
  stageKey?: string | null
}) {
  const tier = getCupTierTheme(stageKey)
  const pulse = React.useRef(new Animated.Value(1)).current

  React.useEffect(() => {
    // Opacity-only + native driver: avoids JS-thread color flicker when FlatList recycles.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.62,
          duration: 4400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 4400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  return (
    <View style={[styles.banner, {backgroundColor: tier.banner}]}>
      <Animated.View style={{opacity: pulse}}>
        <MCI name="trophy" size={18} color={tier.bannerIcon} />
      </Animated.View>
      <Text style={[styles.label, {color: tier.bannerText[0]}]} numberOfLines={1}>
        {label}
      </Text>
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
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
})
