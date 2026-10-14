import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
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
  RefreshControl,
  useColorScheme,
  View,
} from 'react-native'

function displayName(row: PredictionLeaderboardRow) {
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

  const [rows, setRows] = React.useState<PredictionLeaderboardRow[]>([])
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
      const data = await predictions.getLeaderboard({limit: 50})
      setRows(data.rows)
    } catch {
      setError(t('predictions_leaderboard_load_failed'))
      setRows([])
    }
  }, [predictions.getLeaderboard, t])

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
        <View
          style={{
            marginBottom: 14,
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
              {t('predictions_leaderboard_empty')}
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
              backgroundColor: isMe
                ? isDark
                  ? 'rgba(14,165,233,0.14)'
                  : 'rgba(14,165,233,0.08)'
                : cardBg,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(15,23,42,0.06)',
                marginRight: 12,
              }}>
              {rank <= 3 ? (
                <MCI name="medal" size={20} color={accent} />
              ) : (
                <Text style={{fontWeight: '800', color: muted, fontSize: 14}}>
                  {rank}
                </Text>
              )}
            </View>

            <View style={{flex: 1, paddingRight: 10}}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                }}>
                <Text
                  style={{fontWeight: '700', color: colors.text, fontSize: 16}}
                  numberOfLines={1}>
                  {displayName(item)}
                </Text>
                {isMe ? (
                  <View
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      backgroundColor: isDark
                        ? 'rgba(14,165,233,0.28)'
                        : 'rgba(14,165,233,0.18)',
                    }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: colors.primary,
                      }}>
                      {t('predictions_you')}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{color: muted, fontSize: 12, marginTop: 3}}>
                {t('predictions_leaderboard_stats', {
                  exacts: item.exacts,
                  winners: item.winners,
                  picks: item.picks,
                })}
              </Text>
            </View>

            <View style={{alignItems: 'flex-end'}}>
              <Text
                style={{
                  fontWeight: '800',
                  color: accent,
                  fontSize: 20,
                  lineHeight: 24,
                }}>
                {item.points}
              </Text>
              <Text style={{fontSize: 11, color: muted, fontWeight: '600'}}>
                {t('predictions_pts_label')}
              </Text>
            </View>
          </View>
        )
      }}
    />
  )
}
