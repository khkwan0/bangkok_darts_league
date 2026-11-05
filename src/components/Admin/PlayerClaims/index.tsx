import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {useAdminPlayerClaims} from '@/hooks/useAdminPlayerClaims'
import type {ClaimParty, ClaimRequest} from '@/hooks/usePlayerClaim'
import {usePreferredTimeZone} from '@/hooks/usePreferredTimeZone'
import {formatPreferredDateTime} from '@/lib/bangkokTime'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import config from '@/config'
import {MaterialCommunityIcons} from '@expo/vector-icons'
import {useFocusEffect, useNavigation, useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  useColorScheme,
  View,
} from 'react-native'

function formatWhen(iso: string | null | undefined, timeZone: string) {
  if (!iso) return '—'
  return formatPreferredDateTime(iso, timeZone)
}

function statusKey(status: number): string {
  if (status === 0) return 'claim_status_pending'
  if (status === 1) return 'claim_status_approved'
  if (status === 2) return 'claim_status_denied'
  if (status === 3) return 'claim_status_cancelled'
  return 'claim_status_pending'
}

function ClaimPartyCard({
  role,
  hint,
  party,
  fallbackId,
  fallbackName,
  muted,
}: {
  role: string
  hint: string
  party?: ClaimParty
  fallbackId: number
  fallbackName?: string | null
  muted: string
}) {
  const {t} = useTranslation()
  const id = party?.id ?? fallbackId
  const nickname = party?.nickname ?? fallbackName ?? `#${id}`
  const realName = [party?.firstname, party?.lastname].filter(Boolean).join(' ')
  const teams = party?.teams?.map(team => team.name) ?? []
  const photo = party?.profile_picture
    ? `${config.profileUrl}${party.profile_picture}`
    : null
  const statParts: string[] = []
  if (party && party.frame_count > 0) {
    statParts.push(
      t('admin_player_claims_frames', {
        played: party.frame_count,
        won: party.frame_wins,
      }),
    )
  }
  if (party && party.darts_stat_count > 0) {
    statParts.push(
      t('admin_player_claims_darts', {count: party.darts_stat_count}),
    )
  }
  const stats =
    statParts.length > 0
      ? statParts.join(' · ')
      : t('admin_player_claims_no_stats')

  return (
    <View className="flex-row gap-3">
      {photo ? (
        <Image
          source={{uri: photo}}
          className="h-12 w-12 rounded-full"
          style={{width: 48, height: 48, borderRadius: 24}}
        />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
          <MaterialCommunityIcons name="account" size={24} color={muted} />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-xs font-semibold uppercase" style={{color: muted}}>
          {role}
        </Text>
        <Text className="font-semibold">{nickname}</Text>
        <Text className="text-xs" style={{color: muted}}>
          #{id}
          {realName ? ` · ${realName}` : ''}
        </Text>
        <Text className="mt-1 text-sm">
          {teams.length > 0 ? teams.join(', ') : t('claim_no_current_team')}
        </Text>
        <Text className="text-sm">{stats}</Text>
        <Text className="mt-1 text-xs" style={{color: muted}}>
          {hint}
        </Text>
      </View>
    </View>
  )
}

export default function AdminPlayerClaims() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const timeZone = usePreferredTimeZone()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const {state} = useLeagueContext()
  const {listPending, listHistory, approve, deny} = useAdminPlayerClaims()

  const [pending, setPending] = React.useState<ClaimRequest[]>([])
  const [history, setHistory] = React.useState<ClaimRequest[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [actingId, setActingId] = React.useState<number | null>(null)

  const cardClass =
    'mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4'
  const muted = isDark ? '#9CA3AF' : '#6B7280'

  React.useEffect(() => {
    navigation.setOptions({title: t('admin_player_claims')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings' as any)
    }
  }, [router, state.user])

  const load = React.useCallback(async () => {
    setError(null)
    const [p, h] = await Promise.all([listPending(), listHistory()])
    if (p.error || h.error) {
      setError(t('admin_player_claims_load_failed'))
    }
    setPending(p.data)
    setHistory(h.data)
  }, [listPending, listHistory, t])

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

  const transferNotice = (item: ClaimRequest) =>
    t('admin_player_claims_approve_body', {
      frames: item.shell?.frame_count ?? 0,
      wins: item.shell?.frame_wins ?? 0,
      darts: item.shell?.darts_stat_count ?? 0,
      alt:
        item.shell?.nickname ??
        item.shell_nickname ??
        `#${item.shell_player_id}`,
      master:
        item.claimant?.nickname ??
        item.claimant_nickname ??
        `#${item.claimant_player_id}`,
    })

  const handleAction = (item: ClaimRequest, action: 'approve' | 'deny') => {
    const id = item.id
    Alert.alert(
      action === 'approve'
        ? t('admin_player_claims_approve_title')
        : t('admin_player_claims_deny_title'),
      action === 'approve'
        ? transferNotice(item)
        : t('admin_player_claims_deny_body'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text:
            action === 'approve'
              ? t('approve')
              : t('deny'),
          style: action === 'deny' ? 'destructive' : 'default',
          onPress: async () => {
            setActingId(id)
            const res =
              action === 'approve' ? await approve(id) : await deny(id)
            setActingId(null)
            if (res.status !== 'ok') {
              Alert.alert(
                t('error'),
                t(`claim_error_${res.error}`) ||
                  (action === 'approve'
                    ? t('admin_player_claims_approve_failed')
                    : t('admin_player_claims_deny_failed')),
              )
              return
            }
            await load()
          },
        },
      ],
    )
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{padding: 16}}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
      }>
      {error ? (
        <Text className="mb-3 text-red-500">{error}</Text>
      ) : null}

      <View className={cardClass}>
        <Text className="mb-1 text-lg font-semibold">
          {t('admin_player_claims_pending')}
        </Text>
        <Text className="mb-3 text-sm" style={{color: muted}}>
          {t('admin_player_claims_pending_help')}
        </Text>
        {pending.length === 0 ? (
          <Text style={{color: muted}}>
            {t('admin_player_claims_pending_empty')}
          </Text>
        ) : (
          pending.map(item => (
            <View
              key={item.id}
              className="mb-3 border-t border-gray-200 dark:border-gray-700 pt-3">
              <Text className="mb-2 text-sm" style={{color: muted}}>
                #{item.id} · {formatWhen(item.created_at, timeZone)}
              </Text>
              <ClaimPartyCard
                role={t('admin_player_claims_alt')}
                hint={t('admin_player_claims_alt_hint')}
                party={item.shell}
                fallbackId={item.shell_player_id}
                fallbackName={item.shell_nickname}
                muted={muted}
              />
              <Text className="my-2 text-center text-xs" style={{color: muted}}>
                {t('admin_player_claims_merges_into')}
              </Text>
              <ClaimPartyCard
                role={t('admin_player_claims_master')}
                hint={t('admin_player_claims_master_hint')}
                party={item.claimant}
                fallbackId={item.claimant_player_id}
                fallbackName={item.claimant_nickname}
                muted={muted}
              />
              <Text className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                {transferNotice(item)}
              </Text>
              <View className="mt-2 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    small
                    disabled={actingId === item.id}
                    onPress={() => handleAction(item, 'approve')}>
                    {t('approve')}
                  </Button>
                </View>
                <View className="flex-1">
                  <Button
                    small
                    type="outline"
                    disabled={actingId === item.id}
                    onPress={() => handleAction(item, 'deny')}>
                    {t('deny')}
                  </Button>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View className={cardClass}>
        <Text className="mb-1 text-lg font-semibold">
          {t('admin_player_claims_history')}
        </Text>
        <Text className="mb-3 text-sm" style={{color: muted}}>
          {t('admin_player_claims_history_help')}
        </Text>
        {history.length === 0 ? (
          <Text style={{color: muted}}>
            {t('admin_player_claims_history_empty')}
          </Text>
        ) : (
          history.map(item => (
            <View
              key={`h-${item.id}`}
              className="mb-3 border-t border-gray-200 dark:border-gray-700 pt-3">
              <Text className="font-semibold">
                {item.claimant_nickname ?? `#${item.claimant_player_id}`}
                {' → '}
                {item.shell_nickname ?? `#${item.shell_player_id}`}
              </Text>
              <Text className="mt-1 text-sm" style={{color: muted}}>
                {t(statusKey(item.status))}
                {item.resolved_by
                  ? ` · ${t('admin_player_claims_resolved_by')}: ${
                      item.resolved_by_nickname ?? `#${item.resolved_by}`
                    }`
                  : ''}
              </Text>
              <Text className="mt-1 text-xs" style={{color: muted}}>
                {t('admin_player_claims_requested')}:{' '}
                {formatWhen(item.created_at, timeZone)}
                {item.resolved_at
                  ? ` · ${t('admin_player_claims_resolved')}: ${formatWhen(item.resolved_at, timeZone)}`
                  : ''}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}
