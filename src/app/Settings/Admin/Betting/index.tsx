import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  useAdminBetting,
  type AdminBetStatus,
  type AdminBettingActivityItem,
  type AdminBettingSummary,
} from '@/hooks/useAdminBetting'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {useFocusEffect, useNavigation, useRouter} from 'expo-router'
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

type StatusFilter = AdminBetStatus | 'all'

function formatWhen(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatPick(item: AdminBettingActivityItem) {
  if (item.market_type === 'spread' && item.line != null) {
    const selLine = item.selection_key === 'away' ? -item.line : item.line
    const sign = selLine > 0 ? '+' : ''
    return `${item.selection_key} ${sign}${selLine}`
  }
  return item.selection_key
}

export default function AdminBettingScreen() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const {state} = useLeagueContext()
  const {listActivity} = useAdminBetting()

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [items, setItems] = React.useState<AdminBettingActivityItem[]>([])
  const [summary, setSummary] = React.useState<AdminBettingSummary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    navigation.setOptions({title: t('admin_betting')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings' as any)
    }
  }, [router, state.user])

  const load = React.useCallback(async () => {
    try {
      setError(null)
      const result = await listActivity({
        status: statusFilter,
        page: 1,
        pageSize: 50,
      })
      if (result.error) {
        setError(t('admin_betting_load_failed'))
        setItems([])
        setSummary(null)
      } else {
        setItems(result.items)
        setSummary(result.summary)
      }
    } catch (e) {
      console.error(e)
      setError(t('admin_betting_load_failed'))
      setItems([])
      setSummary(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [listActivity, statusFilter, t])

  useFocusEffect(
    React.useCallback(() => {
      if (!isLeagueAdmin(state.user)) return
      void load()
    }, [load, state.user]),
  )

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) return
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
    if (filter === 'all') return t('admin_betting_filter_all')
    return t(`admin_betting_status_${filter}`)
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
            {summary ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 12,
                }}>
                {(
                  [
                    [
                      t('admin_betting_opted_in'),
                      String(summary.opted_in_accounts),
                    ],
                    [
                      t('admin_betting_pending_stake'),
                      String(summary.pending_stake_total),
                    ],
                    [
                      t('admin_betting_won_payouts'),
                      String(summary.won_payout_total),
                    ],
                    [
                      t('admin_betting_total_bets'),
                      String(summary.counts.all),
                    ],
                  ] as const
                ).map(([label, value]) => (
                  <View
                    key={label}
                    style={{
                      minWidth: '45%',
                      flexGrow: 1,
                      borderWidth: 1,
                      borderColor,
                      borderRadius: 10,
                      padding: 10,
                      backgroundColor: cardBg,
                    }}>
                    <Text style={{fontSize: 11, color: muted}}>{label}</Text>
                    <Text style={{fontSize: 18, fontWeight: '800', marginTop: 2}}>
                      {value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{gap: 8}}>
              {filters.map(filter => {
                const active = statusFilter === filter
                const count =
                  filter === 'all'
                    ? summary?.counts.all
                    : summary?.counts[filter]
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
                      {count != null ? ` (${count})` : ''}
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
              {t('admin_betting_empty')}
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
                  {item.player_name}
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
                      textTransform: 'capitalize',
                    }}>
                    {t(`admin_betting_status_${item.status}`)}
                  </Text>
                </View>
              </View>
              <Text style={{fontSize: 14, fontWeight: '600'}}>
                {item.home_team_short_name} vs {item.away_team_short_name}
              </Text>
              <Text style={{fontSize: 12, color: muted, marginTop: 2}}>
                #{item.match_id} · {item.market_type}
                {item.line != null ? ` ${item.line}` : ''} · {formatPick(item)}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 8,
                }}>
                <Text style={{fontSize: 13}}>
                  {item.stake} @ {Number(item.odds).toFixed(2)}
                </Text>
                <Text style={{fontSize: 13, fontWeight: '700'}}>
                  {item.status === 'pending'
                    ? `→ ${item.potential_payout}`
                    : item.payout}
                </Text>
              </View>
              <Text style={{fontSize: 11, color: muted, marginTop: 6}}>
                {formatWhen(item.placed_at)}
                {item.settled_at
                  ? ` · ${t('admin_betting_settled')} ${formatWhen(item.settled_at)}`
                  : ''}
              </Text>
            </View>
          )
        }}
      />
    </View>
  )
}
