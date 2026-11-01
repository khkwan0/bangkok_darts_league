import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {useHabits, type HabitsSnapshot} from '@/hooks/useHabits'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  useColorScheme,
  View,
} from 'react-native'

function challengeLabel(
  challenge: NonNullable<HabitsSnapshot['challenge']>['challenge'],
  lang: string,
) {
  return lang.startsWith('th') ? challenge.name.th : challenge.name.en
}

export default function HabitsPanel() {
  const {t, i18n} = useTranslation()
  const {colors} = useTheme()
  const isDark = (useColorScheme() ?? 'light') === 'dark'
  const {state} = useLeagueContext()
  const habits = useHabits()
  const [data, setData] = React.useState<HabitsSnapshot | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!state.user?.id) {
      setData(null)
      setLoading(false)
      return
    }
    const res = await habits.getSnapshot()
    setData(res.ok ? res.data : null)
    setLoading(false)
  }, [habits.getSnapshot, state.user?.id])

  React.useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const muted = isDark ? 'rgba(226,232,240,0.65)' : 'rgba(51,65,85,0.65)'
  const borderColor = colors.border
  const cardBg = isDark ? 'rgba(30,41,59,0.55)' : 'rgba(255,255,255,0.95)'

  if (!state.weekliesEnabled) {
    return (
      <View style={{flex: 1, padding: 16, backgroundColor: colors.background}}>
        <Text style={{color: muted}}>{t('weeklies_disabled_body')}</Text>
      </View>
    )
  }

  if (!state.user?.id) {
    return (
      <View style={{flex: 1, padding: 16, backgroundColor: colors.background}}>
        <Text style={{color: muted}}>{t('login_to_see_your_matches')}</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!data || data.weeklies_enabled === false) {
    return (
      <View style={{flex: 1, padding: 16, backgroundColor: colors.background}}>
        <Text style={{color: muted}}>
          {data?.weeklies_enabled === false
            ? t('weeklies_disabled_body')
            : t('weeklies_load_failed')}
        </Text>
      </View>
    )
  }

  const streak = data.prediction_streak?.current_count ?? 0
  const remaining = data.picks.remaining_match_ids.length
  const race = data.weekly_race
  const challenge = data.challenge

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.background}}
      contentContainerStyle={{padding: 16, paddingBottom: 40}}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void load().finally(() => setRefreshing(false))
          }}
        />
      }>
      <View
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor,
          backgroundColor: cardBg,
          padding: 14,
          marginBottom: 12,
        }}>
        <View className="mb-2 flex-row items-center gap-2">
          <MCI name="fire" size={20} color="#F59E0B" />
          <Text style={{fontSize: 15, fontWeight: '700', color: colors.text}}>
            {t('weeklies')}
          </Text>
        </View>
        <Text style={{fontSize: 13, color: muted, lineHeight: 19, marginBottom: 12}}>
          {t('weeklies_description')}
        </Text>
        <Text style={{fontSize: 12, color: muted, lineHeight: 18, marginBottom: 12}}>
          {t('weeklies_rewards_note')}
        </Text>

        {streak > 0 ? (
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: '#F59E0B',
              marginBottom: 8,
            }}>
            {t('weeklies_streak_label')}:{' '}
            {t('weeklies_streak_weeks', {count: streak})}
          </Text>
        ) : null}

        {data.predictions_enabled ? (
          <Text style={{fontSize: 13, color: muted, marginBottom: 8}}>
            {data.picks.week_complete
              ? t('weeklies_picks_complete')
              : t('weeklies_picks_remaining', {count: remaining})}
            {race?.rank != null
              ? ` · ${t('weeklies_weekly_rank', {
                  rank: race.rank,
                  points: race.points,
                })}`
              : ''}
          </Text>
        ) : null}

        {challenge ? (
          <View>
            <Text style={{fontSize: 13, fontWeight: '600', color: colors.text}}>
              {t('weeklies_challenge_label')}:{' '}
              {challengeLabel(challenge.challenge, i18n.language)}
            </Text>
            <Text style={{fontSize: 12, color: muted, marginTop: 2}}>
              {i18n.language.startsWith('th')
                ? challenge.challenge.description.th
                : challenge.challenge.description.en}
            </Text>
            <View
              style={{
                marginTop: 6,
                height: 8,
                borderRadius: 4,
                backgroundColor: isDark
                  ? 'rgba(148,163,184,0.25)'
                  : 'rgba(148,163,184,0.35)',
                overflow: 'hidden',
              }}>
              <View
                style={{
                  width: `${Math.min(
                    100,
                    (challenge.current / Math.max(1, challenge.target)) * 100,
                  )}%`,
                  height: '100%',
                  backgroundColor: challenge.completed
                    ? '#22C55E'
                    : String(colors.primary),
                }}
              />
            </View>
            <Text style={{fontSize: 12, color: muted, marginTop: 4}}>
              {challenge.completed
                ? t('weeklies_challenge_done')
                : t('weeklies_challenge_progress', {
                    current: challenge.current,
                    target: challenge.target,
                  })}
            </Text>
          </View>
        ) : null}

        {data.is_captain &&
        (data.confirm_streak?.current_count ||
          data.finalize_streak?.current_count) ? (
          <Text style={{fontSize: 12, color: muted, marginTop: 8}}>
            {[
              data.confirm_streak?.current_count
                ? t('weeklies_ops_confirm', {
                    count: data.confirm_streak.current_count,
                  })
                : null,
              data.finalize_streak?.current_count
                ? t('weeklies_ops_finalize', {
                    count: data.finalize_streak.current_count,
                  })
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  )
}
