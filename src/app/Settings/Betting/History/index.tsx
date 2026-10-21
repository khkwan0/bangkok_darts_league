import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {usePreferredTimeZone} from '@/hooks/usePreferredTimeZone'
import {formatPreferredDateTime} from '@/lib/bangkokTime'
import {
  useBetting,
  type BettingBet,
  type BettingBetStatus,
} from '@/hooks/useBetting'
import {formatBettingOdds} from '@/lib/bettingOddsFormat'
import {useFocusEffect, useNavigation} from 'expo-router'
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

type StatusFilter = BettingBetStatus | 'all'

function formatWhen(iso: string | null, timeZone: string) {
  if (!iso) return '—'
  return formatPreferredDateTime(iso, timeZone)
}

function formatPick(item: BettingBet, t: (key: string) => string) {
  const side =
    item.selection_key === 'home'
      ? t('betting_home')
      : item.selection_key === 'away'
        ? t('betting_away')
        : item.selection_key === 'over'
          ? t('betting_over')
          : item.selection_key === 'under'
            ? t('betting_under')
            : String(item.selection_key)

  if (item.market_type === 'spread' && item.line != null) {
    const selLine = item.selection_key === 'away' ? -item.line : item.line
    const sign = selLine > 0 ? '+' : ''
    return `${side} ${sign}${selLine}`
  }
  return side
}

function marketLabel(item: BettingBet, t: (key: string) => string) {
  if (item.market_type === 'moneyline') return t('betting_moneyline')
  if (item.market_type === 'spread') return t('betting_spread')
  if (item.market_type === 'total') return t('betting_total')
  return String(item.market_type)
}

export default function BettingHistoryScreen() {
  const timeZone = usePreferredTimeZone()
  const {t} = useTranslation()
  const navigation = useNavigation()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const {state} = useLeagueContext()
  const {listBets} = useBetting()
  const oddsFormat = state.bettingOddsFormat ?? 'european'

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [items, setItems] = React.useState<BettingBet[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    navigation.setOptions({
      title: t('betting_history'),
      headerBackTitle: t('back'),
    })
  }, [navigation, t])

  const load = React.useCallback(async () => {
    try {
      setError(null)
      const result = await listBets({
        status: statusFilter,
        limit: 100,
      })
      if (result.error) {
        setError(t('betting_history_load_failed'))
        setItems([])
      } else {
        setItems(result.items)
      }
    } catch (e) {
      console.error(e)
      setError(t('betting_history_load_failed'))
      setItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [listBets, statusFilter, t])

  useFocusEffect(
    React.useCallback(() => {
      void load()
    }, [load]),
  )

  React.useEffect(() => {
    setLoading(true)
    void load()
  }, [statusFilter])

  const borderColor = isDark ? '#334155' : '#e2e8f0'
  const muted = isDark ? '#94a3b8' : '#64748b'
  const cardBg = isDark ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.95)'
  const filters: StatusFilter[] = [
    'all',
    'pending',
    'won',
    'lost',
    'push',
    'void',
  ]

  function statusColors(status: string) {
    switch (status) {
      case 'won':
        return {bg: isDark ? 'rgba(34,197,94,0.2)' : '#dcfce7', fg: '#15803d'}
      case 'lost':
        return {bg: isDark ? 'rgba(244,63,94,0.2)' : '#ffe4e6', fg: '#be123c'}
      case 'pending':
        return {bg: isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7', fg: '#b45309'}
      case 'push':
        return {bg: isDark ? 'rgba(14,165,233,0.2)' : '#e0f2fe', fg: '#0369a1'}
      default:
        return {bg: isDark ? 'rgba(148,163,184,0.2)' : '#e2e8f0', fg: '#475569'}
    }
  }

  const filterLabel = (filter: StatusFilter) => {
    if (filter === 'all') return t('betting_history_filter_all')
    return t(`betting_status_${filter}`)
  }

  return (
    <View style={{flex: 1}}>
      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{padding: 16, paddingBottom: 40}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load()
            }}
          />
        }
        ListHeaderComponent={
          <View style={{marginBottom: 12}}>
            <Text style={{fontSize: 13, color: muted, marginBottom: 12}}>
              {t('betting_balance', {count: state.bettingBalance})}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{gap: 8}}>
              {filters.map(filter => {
                const active = statusFilter === filter
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setStatusFilter(filter)}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? '#0ea5e9' : borderColor,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: active
                        ? isDark
                          ? 'rgba(14,165,233,0.2)'
                          : 'rgba(14,165,233,0.12)'
                        : 'transparent',
                    }}>
                    <Text style={{fontSize: 13, fontWeight: '600'}}>
                      {filterLabel(filter)}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{marginTop: 32}} />
          ) : error ? (
            <Text style={{marginTop: 16, color: '#dc2626', fontSize: 14}}>
              {error}
            </Text>
          ) : (
            <Text style={{marginTop: 16, color: muted, fontSize: 14}}>
              {t('betting_history_empty')}
            </Text>
          )
        }
        renderItem={({item}) => {
          const colors = statusColors(item.status)
          return (
            <View
              style={{
                marginBottom: 10,
                borderWidth: 1,
                borderColor,
                borderRadius: 12,
                padding: 14,
                backgroundColor: cardBg,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}>
                <Text
                  style={{fontWeight: '800', flex: 1, paddingRight: 8}}
                  numberOfLines={1}>
                  {item.home_team_short_name} vs {item.away_team_short_name}
                </Text>
                <View
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    backgroundColor: colors.bg,
                  }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: colors.fg,
                    }}>
                    {t(`betting_status_${item.status}`)}
                  </Text>
                </View>
              </View>
              <Text style={{fontSize: 13, fontWeight: '600'}}>
                {marketLabel(item, t)} · {formatPick(item, t)}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 8,
                }}>
                <Text style={{fontSize: 13}}>
                  {item.stake} @ {formatBettingOdds(item.odds, oddsFormat)}
                </Text>
                <Text style={{fontSize: 13, fontWeight: '700'}}>
                  {item.status === 'pending'
                    ? `→ ${item.potential_payout}`
                    : item.payout}
                </Text>
              </View>
              <Text style={{fontSize: 11, color: muted, marginTop: 6}}>
                {formatWhen(item.placed_at, timeZone)}
                {item.settled_at
                  ? ` · ${t('betting_history_settled')} ${formatWhen(item.settled_at, timeZone)}`
                  : ''}
              </Text>
            </View>
          )
        }}
      />
    </View>
  )
}
