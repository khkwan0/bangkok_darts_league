import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView} from '@/components/ThemedView'
import {useMatchContext} from '@/context/MatchContext'
import {useLeague} from '@/hooks'
import {usePreferredTimeZone} from '@/hooks/usePreferredTimeZone'
import {formatPreferredDateTime} from '@/lib/bangkokTime'
import {useLocalSearchParams, useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text as RNText,
  View,
} from 'react-native'

export type TeamMergeLog = {
  merge_log_id: number
  alt_player_id: number
  master_player_id: number
  alt_nickname: string | null
  master_nickname: string | null
  merged_at: string
  merged_by_nickname: string | null
  transferred_frames_count: number
  transferred_darts_stats_count: number
  copied_avatar: boolean
  reverted_at: string | null
  reverted_by_nickname: string | null
  active: boolean
}

function readTeamId(value: string | string[] | undefined): number | null {
  const values = Array.isArray(value) ? value : [value]
  for (const raw of values) {
    if (typeof raw !== 'string' || raw.length === 0) continue
    const asNumber = Number(raw)
    if (
      Number.isInteger(asNumber) &&
      asNumber > 0 &&
      String(asNumber) === raw.trim()
    ) {
      return asNumber
    }
    try {
      const teamId = Number(JSON.parse(raw)?.teamId)
      if (Number.isInteger(teamId) && teamId > 0) return teamId
    } catch {
      // A parent screen may pass another `params` value in the same slot.
    }
  }
  return null
}

function playerLabel(nickname: string | null, id: number) {
  const name = nickname?.trim()
  return name ? name : `#${id}`
}

export default function TeamMergeHistory() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const league = useLeague()
  const {UpdateTeams} = useMatchContext() as {
    UpdateTeams?: () => Promise<void>
  }
  const leagueRef = React.useRef(league)
  leagueRef.current = league
  const timeZone = usePreferredTimeZone()
  const {params, teamIdParams} = useLocalSearchParams()
  const teamId = React.useMemo(
    () => readTeamId(teamIdParams) ?? readTeamId(params),
    [params, teamIdParams],
  )
  const [logs, setLogs] = React.useState<TeamMergeLog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState('')
  const [undoingId, setUndoingId] = React.useState<number | null>(null)

  React.useEffect(() => {
    navigation.setOptions({title: t('team_merge_history')})
  }, [navigation, t])

  const load = React.useCallback(async () => {
    if (teamId == null) {
      setError(t('team_merge_load_failed'))
      setLogs([])
      return
    }
    const res = await leagueRef.current.GetTeamPlayerMerges(teamId)
    if (res?.status !== 'ok' || !Array.isArray(res.data)) {
      const code = typeof res?.error === 'string' ? res.error : ''
      setError(
        code === 'forbidden' || code === 'unauthorized'
          ? t('merge_error_forbidden')
          : t('team_merge_load_failed'),
      )
      setLogs([])
      return
    }
    setError('')
    setLogs(res.data as TeamMergeLog[])
  }, [t, teamId])

  React.useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      await load()
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [load])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  function confirmUndo(log: TeamMergeLog) {
    const alt = playerLabel(log.alt_nickname, log.alt_player_id)
    const master = playerLabel(log.master_nickname, log.master_player_id)
    Alert.alert(
      t('team_merge_undo_title'),
      t('team_merge_undo_body', {alt, master}),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('team_merge_undo'),
          style: 'destructive',
          onPress: () => void undo(log, alt),
        },
      ],
    )
  }

  async function undo(log: TeamMergeLog, alt: string) {
    if (teamId == null || undoingId != null) return
    setUndoingId(log.merge_log_id)
    setError('')
    const res = await league.UnmergeTeamPlayer(teamId, log.merge_log_id)
    setUndoingId(null)
    if (res?.status !== 'ok') {
      setError(t('team_merge_undo_failed'))
      return
    }
    Alert.alert(t('team_merge_history'), t('team_merge_undo_done', {alt}))
    await UpdateTeams?.()
    await load()
  }

  if (loading) {
    return (
      <ThemedView className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </ThemedView>
    )
  }

  return (
    <ThemedView className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }>
        <RNText className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {t('team_merge_history_hint')}
        </RNText>
        {error ? (
          <View className="mb-4">
            <RNText className="mb-3 text-center text-red-500">{error}</RNText>
            <Button type="outline" onPress={() => void onRefresh()}>
              team_merge_retry
            </Button>
          </View>
        ) : null}
        {!error && logs.length === 0 ? (
          <RNText className="text-center text-base text-gray-600 dark:text-gray-400">
            {t('team_merge_history_empty')}
          </RNText>
        ) : null}
        {logs.map(log => {
          const alt = playerLabel(log.alt_nickname, log.alt_player_id)
          const master = playerLabel(log.master_nickname, log.master_player_id)
          return (
            <View
              key={log.merge_log_id}
              className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <RNText className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                {t('team_merge_into', {alt, master})}
              </RNText>
              <RNText className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {formatPreferredDateTime(log.merged_at, timeZone)}
              </RNText>
              {log.merged_by_nickname ? (
                <RNText className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {t('team_merge_by', {name: log.merged_by_nickname})}
                </RNText>
              ) : null}
              {log.transferred_frames_count > 0 ? (
                <RNText className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {t('team_merge_results', {count: log.transferred_frames_count})}
                </RNText>
              ) : null}
              {log.transferred_darts_stats_count > 0 ? (
                <RNText className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {t('team_merge_darts_stats', {
                    count: log.transferred_darts_stats_count,
                  })}
                </RNText>
              ) : null}
              {log.copied_avatar ? (
                <RNText className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {t('team_merge_avatar', {master})}
                </RNText>
              ) : null}
              <Text className="mt-2 text-sm">
                {log.active ? 'team_merge_active' : 'team_merge_reversed'}
              </Text>
              {!log.active && log.reverted_at ? (
                <RNText className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {log.reverted_by_nickname
                    ? t('team_merge_reversed_by', {
                        name: log.reverted_by_nickname,
                        when: formatPreferredDateTime(log.reverted_at, timeZone),
                      })
                    : formatPreferredDateTime(log.reverted_at, timeZone)}
                </RNText>
              ) : null}
              {log.active ? (
                <View className="mt-3">
                  <Button
                    type="outline"
                    disabled={undoingId != null}
                    onPress={() => confirmUndo(log)}>
                    {undoingId === log.merge_log_id ? 'loading' : 'team_merge_undo'}
                  </Button>
                </View>
              ) : null}
            </View>
          )
        })}
      </ScrollView>
    </ThemedView>
  )
}
