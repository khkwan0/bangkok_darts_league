import {ThemedText as Text} from '@/components/ThemedText'
import {useHabits, type RivalryPayload} from '@/hooks/useHabits'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useColorScheme, View} from 'react-native'

export default function RivalryStrip({
  matchId,
  homeShort,
  awayShort,
  accent,
}: {
  matchId: number
  homeShort?: string | null
  awayShort?: string | null
  accent?: string
}) {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const isDark = (useColorScheme() ?? 'light') === 'dark'
  const habits = useHabits()
  const [data, setData] = React.useState<RivalryPayload | null>(null)

  React.useEffect(() => {
    if (!matchId) return
    let cancelled = false
    ;(async () => {
      const res = await habits.getRivalry(matchId)
      if (!cancelled && res.ok) setData(res.data)
    })()
    return () => {
      cancelled = true
    }
  }, [habits.getRivalry, matchId])

  if (!data || data.meetings.length === 0) return null

  const home =
    homeShort || data.matchup?.home_team_short_name || t('predictions_home')
  const away =
    awayShort || data.matchup?.away_team_short_name || t('predictions_away')
  const muted = isDark ? 'rgba(226,232,240,0.65)' : 'rgba(51,65,85,0.65)'
  const last = data.meetings[0]!
  const lastScore = `${last.home_frames}–${last.away_frames}`

  return (
    <View
      style={{
        marginTop: 8,
        marginBottom: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: isDark
          ? 'rgba(245,158,11,0.08)'
          : 'rgba(245,158,11,0.06)',
      }}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
        <MCI
          name="sword-cross"
          size={16}
          color={accent || '#F59E0B'}
        />
        <Text style={{fontSize: 12, fontWeight: '700', color: colors.text}}>
          {t('habits_rivalry_title')}
        </Text>
        {data.revenge_for ? (
          <Text style={{fontSize: 11, fontWeight: '600', color: '#F59E0B'}}>
            {t('habits_revenge', {
              side: data.revenge_for === 'home' ? home : away,
            })}
          </Text>
        ) : null}
      </View>
      <Text style={{fontSize: 12, color: muted, marginTop: 4}}>
        {t('habits_rivalry_last', {score: lastScore})}
        {data.meetings.length > 1
          ? ` · ${t('habits_rivalry_meetings', {count: data.meetings.length})}`
          : ''}
      </Text>
    </View>
  )
}
