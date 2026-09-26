import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  Text,
  useColorScheme,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

export function useStatColors() {
  const isDark = useColorScheme() === 'dark'
  return {
    isDark,
    card: isDark ? '#242424' : '#ffffff',
    border: isDark ? '#3f3f46' : '#e2e8f0',
    muted: isDark ? '#a1a1aa' : '#64748b',
    text: isDark ? '#f4f4f5' : '#1e293b',
    track: isDark ? '#3f3f46' : '#e2e8f0',
    chip: isDark ? '#334155' : '#e8eef5',
    accent: '#0a7ea4',
  }
}

export function Surface({
  children,
  style,
}: {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const colors = useStatColors()
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 16,
        },
        style,
      ]}>
      {children}
    </View>
  )
}

export function winRatePercent(
  played: number,
  won: number,
  winp: number | string | null | undefined,
): number | null {
  if (typeof winp === 'number' && Number.isFinite(winp)) return winp
  if (typeof winp === 'string') {
    const trimmed = winp.trim()
    if (trimmed !== '' && trimmed !== '-') {
      const parsed = Number(trimmed)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  if (played > 0) return (won / played) * 100
  return null
}

export function winRateColor(percent: number | null): string {
  if (percent == null) return '#94a3b8'
  if (percent >= 55) return '#16a34a'
  if (percent >= 45) return '#d97706'
  return '#dc2626'
}

export function formatWinLabel(percent: number | null): string {
  if (percent == null) return '—'
  return `${Math.round(percent)}%`
}

export function WinRateBar({
  played,
  won,
  winp,
}: {
  played: number
  won: number
  winp: number | string | null | undefined
}) {
  const colors = useStatColors()
  const percent = winRatePercent(played, won, winp)
  const width = percent == null ? 0 : Math.max(0, Math.min(100, percent))
  return (
    <View
      style={{
        height: 8,
        borderRadius: 999,
        backgroundColor: colors.track,
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: `${width}%`,
          height: '100%',
          borderRadius: 999,
          backgroundColor: winRateColor(percent),
        }}
      />
    </View>
  )
}

export function SectionTitle({label}: {label: string}) {
  const {t} = useTranslation()
  const colors = useStatColors()
  return (
    <Text
      style={{
        marginBottom: 10,
        marginTop: 8,
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
      }}>
      {t(label)}
    </Text>
  )
}

export function EmptyNote({label}: {label: string}) {
  const {t} = useTranslation()
  const colors = useStatColors()
  return (
    <Surface style={{padding: 16, marginBottom: 12}}>
      <Text style={{color: colors.muted, fontSize: 15}}>{t(label)}</Text>
    </Surface>
  )
}
