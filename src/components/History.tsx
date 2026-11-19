import {useScoresheetTheme} from '@/components/Match/components/scoresheetTheme'
import {useMatchContext} from '@/context/MatchContext'
import {useMatch} from '@/hooks'
import {formatBangkokFromMillis} from '@/lib/bangkokTime'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useLocalSearchParams} from 'expo-router'
import {useNavigation} from 'expo-router/react-navigation'
import {DateTime} from 'luxon'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {FlatList, Text, View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

type HistoryItem = {
  timestamp: number
  msg?: string | string[] | null
  type?: string | null
}

type HistoryRow =
  | {kind: 'day'; key: string; label: string}
  | {kind: 'event'; key: string; item: HistoryItem}

function resolveMatchId(
  params: unknown,
  contextMatchId: unknown,
): number | null {
  try {
    if (params != null) {
      const raw = typeof params === 'string' ? JSON.parse(params) : params
      const id = Number((raw as {match_id?: unknown})?.match_id)
      if (Number.isFinite(id) && id > 0) {
        return id
      }
    }
  } catch {
    // ignore malformed route params
  }

  const fallback = Number(contextMatchId)
  if (Number.isFinite(fallback) && fallback > 0) {
    return fallback
  }
  return null
}

function normalizeMsg(msg: HistoryItem['msg']): string {
  if (Array.isArray(msg)) return msg.filter(Boolean).join(' ').trim()
  return String(msg ?? '').trim()
}

function dayKeyFromMillis(timestamp: number): string {
  if (!timestamp) return 'unknown'
  const dt = DateTime.fromMillis(timestamp).setZone('Asia/Bangkok')
  return dt.isValid ? dt.toFormat('yyyy-LL-dd') : 'unknown'
}

function dayLabelFromMillis(timestamp: number): string {
  return formatBangkokFromMillis(timestamp, DateTime.DATE_MED_WITH_WEEKDAY)
}

function timeLabelFromMillis(timestamp: number): string {
  return formatBangkokFromMillis(timestamp, DateTime.TIME_SIMPLE)
}

function eventVisual(
  item: HistoryItem,
  theme: ReturnType<typeof useScoresheetTheme>,
): {icon: React.ComponentProps<typeof MCI>['name']; color: string} {
  const type = String(item.type ?? '')
    .trim()
    .toLowerCase()
  const msg = normalizeMsg(item.msg).toLowerCase()
  const golden = msg.includes('golden break')

  if (type === 'win' || golden) {
    return {
      icon: golden ? 'star' : 'check-circle',
      color: golden ? theme.gold : theme.win,
    }
  }
  if (type === 'clearwin') {
    return {icon: 'undo-variant', color: theme.muted}
  }
  if (type === 'players') {
    return {icon: 'account', color: theme.home.accent}
  }
  if (type === 'firstbreak') {
    return {icon: 'flag-variant', color: theme.away.accent}
  }
  if (type === 'firstdart') {
    return {icon: 'target', color: theme.away.accent}
  }
  if (type === 'finalize') {
    return {icon: 'check-decagram', color: theme.win}
  }
  if (type === 'framestats') {
    return {icon: 'chart-bar', color: theme.home.accent}
  }
  if (type === 'visit' || type === 'x01') {
    return {icon: 'numeric', color: theme.away.accent}
  }
  return {icon: 'history', color: theme.muted}
}

function buildRows(items: HistoryItem[]): HistoryRow[] {
  const rows: HistoryRow[] = []
  let lastDay = ''
  items.forEach((item, index) => {
    const day = dayKeyFromMillis(item.timestamp)
    if (day !== lastDay) {
      lastDay = day
      rows.push({
        kind: 'day',
        key: `day-${day}`,
        label: dayLabelFromMillis(item.timestamp),
      })
    }
    rows.push({
      kind: 'event',
      key: `event-${item.timestamp}-${index}`,
      item,
    })
  })
  return rows
}

function DayHeader({label}: {label: string}) {
  const theme = useScoresheetTheme()
  return (
    <Text
      style={{
        marginTop: 8,
        marginBottom: 6,
        marginHorizontal: 4,
        color: theme.muted,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
      }}>
      {label}
    </Text>
  )
}

function EventCard({item}: {item: HistoryItem}) {
  const theme = useScoresheetTheme()
  const message = normalizeMsg(item.msg)
  const {icon, color} = eventVisual(item, theme)
  const time = timeLabelFromMillis(item.timestamp)

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.cardBorder,
          backgroundColor: theme.card,
          paddingHorizontal: 12,
          paddingVertical: 12,
          marginBottom: 8,
        },
        theme.shadow,
      ]}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.faint,
        }}>
        <MCI name={icon} size={18} color={color} />
      </View>
      <View style={{flex: 1, gap: 4}}>
        <Text
          style={{
            color: theme.text,
            fontSize: 15,
            fontWeight: '600',
            lineHeight: 20,
          }}>
          {message || '—'}
        </Text>
        <Text
          style={{
            color: theme.muted,
            fontSize: 12,
            fontWeight: '700',
            fontVariant: ['tabular-nums'],
          }}>
          {time}
        </Text>
      </View>
    </View>
  )
}

export default function History() {
  const navigation = useNavigation()
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const [history, setHistory] = React.useState<HistoryItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const {params} = useLocalSearchParams()
  const {GetMatchInfo} = useMatch()
  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = React.useState(false)
  const {state}: any = useMatchContext()
  const matchId = resolveMatchId(params, state?.matchInfo?.match_id)
  const getMatchInfoRef = React.useRef(GetMatchInfo)
  getMatchInfoRef.current = GetMatchInfo

  React.useEffect(() => {
    navigation.setOptions({title: t('history')})
  }, [navigation, t])

  const sortHistory = React.useCallback((items: HistoryItem[]) => {
    return [...items].sort((a, b) => {
      const at = Number(a?.timestamp ?? 0)
      const bt = Number(b?.timestamp ?? 0)
      return bt - at
    })
  }, [])

  const loadHistory = React.useCallback(
    async (showRefreshSpinner: boolean) => {
      if (!matchId) {
        setHistory([])
        setLoading(false)
        return
      }
      try {
        if (showRefreshSpinner) {
          setRefreshing(true)
        }
        const res = await getMatchInfoRef.current(matchId)
        const raw = Array.isArray(res?.data?.history) ? res.data.history : []
        setHistory(sortHistory(raw))
      } catch (error) {
        console.error('Error fetching match by ID:', error)
      } finally {
        setLoading(false)
        if (showRefreshSpinner) {
          setRefreshing(false)
        }
      }
    },
    [matchId, sortHistory],
  )

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      if (!matchId) {
        if (!cancelled) {
          setHistory([])
          setLoading(false)
        }
        return
      }
      try {
        if (!cancelled) setLoading(true)
        const res = await getMatchInfoRef.current(matchId)
        if (cancelled) return
        const raw = Array.isArray(res?.data?.history) ? res.data.history : []
        setHistory(sortHistory(raw))
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching match by ID:', error)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [matchId, sortHistory])

  const rows = React.useMemo(() => buildRows(history), [history])

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.canvas,
        }}>
        <Text style={{color: theme.muted}}>{t('loading')}</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={{flex: 1, backgroundColor: theme.canvas}}
      contentContainerStyle={{
        paddingTop: 12,
        paddingHorizontal: 12,
        paddingBottom: Math.max(insets.bottom, 16) + 8,
        flexGrow: 1,
      }}
      data={rows}
      refreshing={refreshing}
      onRefresh={() => loadHistory(true)}
      keyExtractor={item => item.key}
      renderItem={({item}) => {
        if (item.kind === 'day') {
          return <DayHeader label={item.label} />
        }
        return <EventCard item={item.item} />
      }}
      ListEmptyComponent={
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingTop: 64,
            gap: 12,
          }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.faint,
            }}>
            <MCI name="history" size={28} color={theme.muted} />
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '700',
              textAlign: 'center',
            }}>
            {t('history_empty')}
          </Text>
        </View>
      }
    />
  )
}
