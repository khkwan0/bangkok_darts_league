import {ThemedText as Text} from '@/components/ThemedText'
import {
  usePredictions,
  type MatchPrediction,
  type PredictionStatus,
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
  ScrollView,
  useColorScheme,
  View,
} from 'react-native'

type StatusFilter = PredictionStatus | 'all'

function formatWhen(raw?: string | null) {
  if (!raw) return ''
  try {
    return new Date(raw).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return String(raw)
  }
}

function statusColors(status: PredictionStatus, isDark: boolean) {
  switch (status) {
    case 'scored':
      return {
        bg: isDark ? 'rgba(16,185,129,0.22)' : 'rgba(16,185,129,0.14)',
        fg: isDark ? '#6EE7B7' : '#047857',
      }
    case 'locked':
      return {
        bg: isDark ? 'rgba(245,158,11,0.22)' : 'rgba(245,158,11,0.14)',
        fg: isDark ? '#FCD34D' : '#B45309',
      }
    case 'void':
      return {
        bg: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.18)',
        fg: isDark ? '#CBD5E1' : '#475569',
      }
    case 'open':
    default:
      return {
        bg: isDark ? 'rgba(14,165,233,0.22)' : 'rgba(14,165,233,0.14)',
        fg: isDark ? '#7DD3FC' : '#0369A1',
      }
  }
}

export default function PredictionsHistoryScreen() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const {colors} = useTheme()
  const isDark = (useColorScheme() ?? 'light') === 'dark'
  const predictions = usePredictions()

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [items, setItems] = React.useState<MatchPrediction[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const muted = isDark ? 'rgba(226,232,240,0.65)' : 'rgba(51,65,85,0.65)'
  const borderColor = colors.border
  const cardBg = isDark ? 'rgba(30,41,59,0.55)' : 'rgba(255,255,255,0.9)'

  React.useEffect(() => {
    navigation.setOptions({
      title: t('predictions_history'),
      headerBackTitle: t('back'),
    })
  }, [navigation, t])

  const load = React.useCallback(async () => {
    try {
      setError(null)
      const res = await predictions.listMine({limit: 50})
      if (res.error) {
        setError(t('predictions_history_load_failed'))
        setItems([])
      } else {
        setItems(res.items)
      }
    } catch {
      setError(t('predictions_history_load_failed'))
      setItems([])
    }
  }, [predictions.listMine, t])

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

  const filters: StatusFilter[] = ['all', 'open', 'locked', 'scored', 'void']
  const filtered =
    statusFilter === 'all'
      ? items
      : items.filter(item => item.status === statusFilter)

  const filterLabel = (filter: StatusFilter) => {
    if (filter === 'all') return t('predictions_history_filter_all')
    return t(`predictions_status_${filter}`)
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

  return (
    <FlatList
      style={{flex: 1, backgroundColor: colors.background}}
      contentContainerStyle={{padding: 16, paddingBottom: 40, flexGrow: 1}}
      data={filtered}
      keyExtractor={item => String(item.id)}
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{gap: 8, marginBottom: 12}}>
          {filters.map(filter => {
            const active = statusFilter === filter
            return (
              <Pressable
                key={filter}
                onPress={() => setStatusFilter(filter)}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : borderColor,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: active
                    ? isDark
                      ? 'rgba(14,165,233,0.2)'
                      : 'rgba(14,165,233,0.12)'
                    : 'transparent',
                }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: colors.text,
                  }}>
                  {filterLabel(filter)}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      }
      ListEmptyComponent={
        error ? (
          <Text style={{marginTop: 16, color: '#dc2626', fontSize: 14}}>
            {error}
          </Text>
        ) : (
          <View style={{marginTop: 48, alignItems: 'center', gap: 8}}>
            <MCI name="clipboard-text-outline" size={36} color={muted} />
            <Text style={{color: muted, fontSize: 14, textAlign: 'center'}}>
              {t('predictions_history_empty')}
            </Text>
          </View>
        )
      }
      renderItem={({item}) => {
        const chip = statusColors(item.status, isDark)
        const side =
          item.predicted_side === 'home'
            ? t('predictions_home')
            : t('predictions_away')
        const home = item.home_team_short_name || '?'
        const away = item.away_team_short_name || '?'
        const result =
          item.home_frames != null && item.away_frames != null
            ? `${item.home_frames}–${item.away_frames}`
            : null
        return (
          <View
            style={{
              marginBottom: 10,
              borderWidth: 1,
              borderColor: borderColor,
              borderRadius: 12,
              padding: 14,
              backgroundColor: cardBg,
            }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
                gap: 8,
              }}>
              <Text
                style={{
                  fontWeight: '800',
                  flex: 1,
                  color: colors.text,
                  fontSize: 15,
                }}
                numberOfLines={1}>
                {home} vs {away}
              </Text>
              <View
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  backgroundColor: chip.bg,
                }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: chip.fg,
                  }}>
                  {t(`predictions_status_${item.status}`)}
                </Text>
              </View>
            </View>

            <Text style={{fontSize: 14, fontWeight: '600', color: colors.text}}>
              {t('predictions_history_tip', {
                side,
                margin: item.predicted_margin,
              })}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 10,
              }}>
              <Text style={{fontSize: 12, color: muted}}>
                {formatWhen(item.match_date || item.created_at)}
                {result ? ` · ${result}` : ''}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '800',
                  color:
                    item.status === 'scored' ? colors.primary : muted,
                }}>
                {item.status === 'scored'
                  ? t('predictions_points', {count: item.points})
                  : '—'}
              </Text>
            </View>
          </View>
        )
      }}
    />
  )
}
