import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  useAdminPlayerMerges,
  type AdminMergeRequest,
  type AdminPlayerMergeRecord,
} from '@/hooks/useAdminPlayerMerges'
import {usePreferredTimeZone} from '@/hooks/usePreferredTimeZone'
import {formatPreferredDateTime} from '@/lib/bangkokTime'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {useFocusEffect, useNavigation, useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'

function formatWhen(iso: string | null | undefined, timeZone: string) {
  if (!iso) return '—'
  return formatPreferredDateTime(iso, timeZone)
}

export default function AdminPlayerMerges() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const timeZone = usePreferredTimeZone()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const {state} = useLeagueContext()
  const {
    listMergeRequests,
    acceptMergeRequest,
    denyMergeRequest,
    mergePlayers,
    unmergePlayer,
    listMerges,
  } = useAdminPlayerMerges()

  const [requests, setRequests] = React.useState<AdminMergeRequest[]>([])
  const [history, setHistory] = React.useState<AdminPlayerMergeRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [actingRequestId, setActingRequestId] = React.useState<number | null>(
    null,
  )
  const [actingUnmergeId, setActingUnmergeId] = React.useState<number | null>(
    null,
  )

  const [altPlayerId, setAltPlayerId] = React.useState('')
  const [masterPlayerId, setMasterPlayerId] = React.useState('')
  const [transferStats, setTransferStats] = React.useState(false)
  const [merging, setMerging] = React.useState(false)

  const [unmergePlayerId, setUnmergePlayerId] = React.useState('')
  const [unmerging, setUnmerging] = React.useState(false)

  const inputClass =
    'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-base text-gray-900 dark:text-gray-100'
  const cardClass =
    'mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4'
  const muted = isDark ? '#9CA3AF' : '#6B7280'

  React.useEffect(() => {
    navigation.setOptions({title: t('admin_player_merges')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings' as any)
    }
  }, [router, state.user])

  const load = React.useCallback(async () => {
    setError(null)
    const [reqRes, histRes] = await Promise.all([
      listMergeRequests(),
      listMerges(),
    ])
    if (reqRes.error || histRes.error) {
      setError(t('admin_player_merges_load_failed'))
    }
    setRequests(reqRes.data)
    setHistory(histRes.data)
  }, [listMergeRequests, listMerges, t])

  useFocusEffect(
    React.useCallback(() => {
      let active = true
      ;(async () => {
        setLoading(true)
        await load()
        if (active) setLoading(false)
      })()
      return () => {
        active = false
      }
    }, [load]),
  )

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const handleAcceptDeny = (requestId: number, action: 'accept' | 'deny') => {
    Alert.alert(
      action === 'accept'
        ? t('admin_player_merges_accept_title')
        : t('admin_player_merges_deny_title'),
      action === 'accept'
        ? t('admin_player_merges_accept_body')
        : t('admin_player_merges_deny_body'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text:
            action === 'accept'
              ? t('admin_player_merges_accept')
              : t('admin_player_merges_deny'),
          style: action === 'deny' ? 'destructive' : 'default',
          onPress: async () => {
            setActingRequestId(requestId)
            setError(null)
            setSuccess(null)
            const result =
              action === 'accept'
                ? await acceptMergeRequest(requestId)
                : await denyMergeRequest(requestId)
            if (result.status !== 'ok') {
              setError(
                action === 'accept'
                  ? t('admin_player_merges_accept_failed')
                  : t('admin_player_merges_deny_failed'),
              )
            } else {
              setSuccess(
                action === 'accept'
                  ? t('admin_player_merges_accept_ok')
                  : t('admin_player_merges_deny_ok'),
              )
              await load()
            }
            setActingRequestId(null)
          },
        },
      ],
    )
  }

  const handleMerge = async () => {
    const alt = Number(altPlayerId)
    const master = Number(masterPlayerId)
    if (!Number.isFinite(alt) || alt <= 0 || !Number.isFinite(master) || master <= 0) {
      setError(t('admin_player_merges_invalid_ids'))
      return
    }
    setMerging(true)
    setError(null)
    setSuccess(null)
    const result = await mergePlayers({
      altPlayerId: alt,
      masterPlayerId: master,
      transferStats,
    })
    if (result.status !== 'ok') {
      setError(t('admin_player_merges_merge_failed'))
    } else {
      const frames = result.transferred_frames ?? 0
      const darts = result.transferred_darts_stats ?? 0
      setSuccess(
        transferStats
          ? t('admin_player_merges_merge_ok_transfer', {frames, darts})
          : t('admin_player_merges_merge_ok'),
      )
      setAltPlayerId('')
      setMasterPlayerId('')
      setTransferStats(false)
      await load()
    }
    setMerging(false)
  }

  const runUnmerge = async (playerId: number) => {
    setActingUnmergeId(playerId)
    setUnmerging(true)
    setError(null)
    setSuccess(null)
    const result = await unmergePlayer(playerId)
    if (result.status !== 'ok') {
      setError(
        result.error === 'player_not_merged'
          ? t('admin_player_merges_not_merged')
          : result.error === 'player_not_found'
            ? t('admin_player_merges_not_found')
            : t('admin_player_merges_unmerge_failed'),
      )
    } else {
      const frames = result.frames_restored ?? 0
      const darts = result.darts_stats_restored ?? 0
      const legacy =
        result.warning === 'no_merge_log'
          ? ` ${t('admin_player_merges_no_log')}`
          : ''
      setSuccess(
        `${t('admin_player_merges_unmerge_ok', {frames, darts})}${legacy}`,
      )
      setUnmergePlayerId('')
      await load()
    }
    setActingUnmergeId(null)
    setUnmerging(false)
  }

  const confirmUnmerge = (playerId: number) => {
    Alert.alert(
      t('admin_player_merges_unmerge_title'),
      t('admin_player_merges_unmerge_body', {id: playerId}),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('admin_player_merges_unmerge'),
          style: 'destructive',
          onPress: () => void runUnmerge(playerId),
        },
      ],
    )
  }

  if (!isLeagueAdmin(state.user)) {
    return null
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="p-4 pb-10"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      keyboardShouldPersistTaps="handled">
      {error ? (
        <View className="mb-3 rounded-lg bg-red-50 dark:bg-red-950/40 p-3">
          <Text className="text-sm text-red-800 dark:text-red-300">{error}</Text>
        </View>
      ) : null}
      {success ? (
        <View className="mb-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3">
          <Text className="text-sm text-emerald-800 dark:text-emerald-300">
            {success}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View className="items-center py-10">
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <View className={cardClass}>
            <Text className="mb-1 text-lg font-semibold">
              {t('admin_player_merges_requests')}
              <Text className="text-sm font-normal text-gray-500">
                {' '}
                ({requests.length})
              </Text>
            </Text>
            <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {t('admin_player_merges_requests_help')}
            </Text>
            {requests.length === 0 ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {t('admin_player_merges_requests_empty')}
              </Text>
            ) : (
              requests.map(row => (
                <View
                  key={row.merge_request_id}
                  className="mb-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                  <Text className="font-medium">
                    #{row.player_id} {row.player_nickname || '—'}
                    <Text className="font-normal text-gray-500">
                      {' '}
                      → #{row.target_id} {row.target_name || '—'}
                    </Text>
                  </Text>
                  <Text className="mb-2 text-xs text-gray-500">
                    {formatWhen(row.created_at, timeZone)}
                  </Text>
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Button
                        small
                        disabled={actingRequestId === row.merge_request_id}
                        onPress={() =>
                          handleAcceptDeny(row.merge_request_id, 'accept')
                        }>
                        {t('admin_player_merges_accept')}
                      </Button>
                    </View>
                    <View className="flex-1">
                      <Pressable
                        disabled={actingRequestId === row.merge_request_id}
                        onPress={() =>
                          handleAcceptDeny(row.merge_request_id, 'deny')
                        }
                        className="rounded-lg bg-red-600 px-3 py-2 items-center disabled:opacity-50">
                        <Text className="text-white text-sm font-medium">
                          {t('admin_player_merges_deny')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          <View className={cardClass}>
            <Text className="mb-1 text-lg font-semibold">
              {t('admin_player_merges_merge')}
            </Text>
            <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {t('admin_player_merges_merge_help')}
            </Text>
            <Text className="mb-1 text-sm font-medium">
              {t('admin_player_merges_alt_id')}
            </Text>
            <TextInput
              className={`${inputClass} mb-3`}
              value={altPlayerId}
              onChangeText={setAltPlayerId}
              keyboardType="number-pad"
              placeholder="e.g. 1001"
              placeholderTextColor={muted}
              editable={!merging}
            />
            <Text className="mb-1 text-sm font-medium">
              {t('admin_player_merges_master_id')}
            </Text>
            <TextInput
              className={`${inputClass} mb-3`}
              value={masterPlayerId}
              onChangeText={setMasterPlayerId}
              keyboardType="number-pad"
              placeholder="e.g. 1002"
              placeholderTextColor={muted}
              editable={!merging}
            />
            <View className="mb-4 flex-row items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
              <View className="flex-1 pr-2">
                <Text className="text-sm font-medium">
                  {t('admin_player_merges_transfer')}
                </Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('admin_player_merges_transfer_help')}
                </Text>
              </View>
              <Switch
                value={transferStats}
                onValueChange={setTransferStats}
                disabled={merging}
              />
            </View>
            <Button
              disabled={
                merging || !altPlayerId.trim() || !masterPlayerId.trim()
              }
              onPress={() => void handleMerge()}>
              {merging
                ? t('admin_player_merges_working')
                : t('admin_player_merges_merge')}
            </Button>
          </View>

          <View className={cardClass}>
            <Text className="mb-1 text-lg font-semibold">
              {t('admin_player_merges_unmerge')}
            </Text>
            <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {t('admin_player_merges_unmerge_help')}
            </Text>
            <Text className="mb-1 text-sm font-medium">
              {t('admin_player_merges_alt_id')}
            </Text>
            <TextInput
              className={`${inputClass} mb-3`}
              value={unmergePlayerId}
              onChangeText={setUnmergePlayerId}
              keyboardType="number-pad"
              placeholder="e.g. 1001"
              placeholderTextColor={muted}
              editable={!unmerging}
            />
            <Pressable
              disabled={unmerging || !unmergePlayerId.trim()}
              onPress={() => {
                const id = Number(unmergePlayerId)
                if (!Number.isFinite(id) || id <= 0) {
                  setError(t('admin_player_merges_invalid_ids'))
                  return
                }
                confirmUnmerge(id)
              }}
              className="rounded-lg bg-amber-600 px-4 py-3 items-center disabled:opacity-50">
              <Text className="text-white font-medium">
                {unmerging
                  ? t('admin_player_merges_working')
                  : t('admin_player_merges_unmerge')}
              </Text>
            </Pressable>
          </View>

          <View className={cardClass}>
            <Text className="mb-1 text-lg font-semibold">
              {t('admin_player_merges_history')}
              <Text className="text-sm font-normal text-gray-500">
                {' '}
                ({history.length})
              </Text>
            </Text>
            <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {t('admin_player_merges_history_help')}
            </Text>
            {history.length === 0 ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {t('admin_player_merges_history_empty')}
              </Text>
            ) : (
              history.map((row, index) => {
                const key =
                  row.merge_log_id != null
                    ? `log-${row.merge_log_id}`
                    : `${row.alt_player_id}-${row.master_player_id}-${row.merged_at}-${index}`
                const frames = row.transferred_frames_count ?? 0
                const darts = row.transferred_darts_stats_count ?? 0
                const canUnmerge = row.active && !row.reverted_at
                return (
                  <View
                    key={key}
                    className="mb-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <Text className="text-xs text-gray-500 mb-1">
                      {formatWhen(row.merged_at, timeZone)} · {row.source}
                      {row.merge_log_id != null
                        ? ` · log #${row.merge_log_id}`
                        : ''}
                    </Text>
                    <Text className="font-medium">
                      #{row.alt_player_id} {row.alt_nickname || '—'}
                      <Text className="font-normal text-gray-500">
                        {' '}
                        → #{row.master_player_id} {row.master_nickname || '—'}
                      </Text>
                    </Text>
                    <Text className="mt-1 text-xs text-gray-500">
                      {row.transfer_stats
                        ? t('admin_player_merges_transfer_counts', {
                            frames,
                            darts,
                          })
                        : row.transfer_stats === false
                          ? t('admin_player_merges_transfer_no')
                          : '—'}
                      {' · '}
                      {row.reverted_at
                        ? t('admin_player_merges_status_reverted', {
                            when: formatWhen(row.reverted_at, timeZone),
                          })
                        : row.active
                          ? t('admin_player_merges_status_active')
                          : t('admin_player_merges_status_inactive')}
                    </Text>
                    {canUnmerge ? (
                      <Pressable
                        disabled={actingUnmergeId === row.alt_player_id}
                        onPress={() => confirmUnmerge(row.alt_player_id)}
                        className="mt-2 self-start rounded-lg bg-amber-600 px-3 py-1.5 disabled:opacity-50">
                        <Text className="text-white text-xs font-medium">
                          {actingUnmergeId === row.alt_player_id
                            ? t('admin_player_merges_working')
                            : t('admin_player_merges_unmerge')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                )
              })
            )}
          </View>
        </>
      )}
    </ScrollView>
  )
}
