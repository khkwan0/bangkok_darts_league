import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {useHabits, type WeeklyRaceRow} from '@/hooks/useHabits'
import {
  usePredictions,
  type PredictionLeaderboardRow,
} from '@/hooks/usePredictions'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useNavigation} from 'expo-router'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  useColorScheme,
  View,
} from 'react-native'

type Tab = 'season' | 'week'
type Row = PredictionLeaderboardRow | WeeklyRaceRow

function displayName(row: Row) {
  if (row.nickname) return row.nickname
  const parts = [row.firstname, row.lastname].filter(Boolean)
  return parts.length ? parts.join(' ') : `#${row.player_id}`
}

function rankAccent(rank: number, primary: string) {
  if (rank === 1) return '#F59E0B'
  if (rank === 2) return '#94A3B8'
  if (rank === 3) return '#B45309'
  return primary
}

export default function PredictionsLeaderboardScreen() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const {colors} = useTheme()
  const isDark = (useColorScheme() ?? 'light') === 'dark'
  const {state} = useLeagueContext()
  const predictions = usePredictions()
  const habits = useHabits()

  const [tab, setTab] = React.useState<Tab>('season')
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const muted = isDark ? 'rgba(226,232,240,0.65)' : 'rgba(51,65,85,0.65)'
  const borderColor = colors.border
  const cardBg = isDark ? 'rgba(30,41,59,0.55)' : 'rgba(255,255,255,0.9)'
  const myId = Number(state.user?.id ?? 0)

  React.useEffect(() => {
    navigation.setOptions({
      title: t('predictions_leaderboard'),
      headerBackTitle: t('back'),
    })
  }, [navigation, t])

  const load = React.useCallback(async () => {
    try {
      setError(null)
      if (tab === 'season') {
        const data = await predictions.getLeaderboard({limit: 50})
        setRows(data.rows)
      } else {
        const data = await habits.getWeeklyLeaderboard({limit: 50})
        setRows(data.rows)
      }
    } catch {
      setError(t('predictions_leaderboard_load_failed'))
      setRows([])
    }
  }, [habits.getWeeklyLeaderboard, predictions.getLeaderboard, t, tab])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await load()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [load])

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

  return (
    <FlatList
      style={{flex: 1, backgroundColor: colors.background}}
      contentContainerStyle={{padding: 16, paddingBottom: 40, flexGrow: 1}}
      data={rows}
      keyExtractor={item => String(item.player_id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void load().finally(() => setRefreshing(false))
          }}
        />
      }
      ListHeaderComponent={
        <View style={{marginBottom: 14}}>
          <View
            style={{
              flexDirection: 'row',
              borderRadius: 12,
              borderWidth: 1,
              borderColor,
              overflow: 'hidden',
              marginBottom: 12,
            }}>
            {([
              ['season', t('predictions_tab_season')],
              ['week', t('predictions_tab_week')],
            ] as const).map(([value, label]) => {
              const active = tab === value
              return (
                <Pressable
                  key={value}
                  onPress={() => setTab(value)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    alignItems: 'center',
                    backgroundColor: active
                      ? 'rgba(245,158,11,0.22)'
                      : 'transparent',
                  }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      opacity: active ? 1 : 0.55,
                    }}>
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor,
              padding: 12,
              backgroundColor: cardBg,
            }}>
            <Text style={{fontSize: 13, color: muted, lineHeight: 19}}>
              {t('predictions_scoring_help')}
            </Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        error ? (
          <Text style={{marginTop: 24, color: '#dc2626', fontSize: 14}}>
            {error}
          </Text>
        ) : (
          <View style={{marginTop: 48, alignItems: 'center', gap: 8}}>
            <MCI name="trophy-outline" size={36} color={muted} />
            <Text style={{color: muted, fontSize: 14, textAlign: 'center'}}>
              {tab === 'week'
                ? t('predictions_weekly_empty')
                : t('predictions_leaderboard_empty')}
            </Text>
          </View>
        )
      }
      renderItem={({item, index}) => {
        const rank = index + 1
        const isMe = myId > 0 && Number(item.player_id) === myId
        const accent = rankAccent(rank, String(colors.primary))
        return (
          <View
            style={{
              marginBottom: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isMe ? accent : borderColor,
              padding: 14,
              backgroundColor: cardBg,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '800',
                    color: accent,
                    minWidth: 28,
                  }}>
                  {rank}
                </Text>
                <Text style={{fontSize: 15, fontWeight: '700', color: colors.text}}>
                  {displayName(item)}
                  {isMe ? ` · ${t('predictions_you')}` : ''}
                </Text>
              </View>
              <Text style={{fontSize: 16, fontWeight: '800', color: colors.text}}>
                {item.points} {t('predictions_pts_label')}
              </Text>
            </View>
            <Text style={{marginTop: 6, fontSize: 12, color: muted}}>
              {t('predictions_leaderboard_stats', {
                exacts: item.exacts,
                winners: item.winners,
                picks: item.picks,
              })}
            </Text>
          </View>
        )
      }}
    />
  )
}
