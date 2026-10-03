import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {useAdminSupportTickets} from '@/hooks/useAdminSupportTickets'
import {refreshAdminSupportUnread} from '@/lib/adminSupportUnread'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {
  messagePreview,
  supportStatusLabelKey,
} from '@/lib/supportTickets'
import {
  SUPPORT_TICKET_STATUSES,
  type AdminSupportTicketListItem,
  type SupportTicketStatus,
} from '@/types/supportTickets'
import {useFocusEffect, useNavigation, useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  useColorScheme,
  View as RNView,
} from 'react-native'

type StatusFilter = SupportTicketStatus | 'all' | 'deleted'

function formatTicketDate(iso: string) {
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

export default function AdminSupportScreen() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const {state} = useLeagueContext()
  const {listTickets, getUnreadCount} = useAdminSupportTickets()

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [items, setItems] = React.useState<AdminSupportTicketListItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    navigation.setOptions({title: t('admin_support')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings' as any)
    }
  }, [router, state.user])

  const load = React.useCallback(async () => {
    try {
      setError(null)
      const result = await listTickets({
        status: statusFilter,
        page: 1,
        pageSize: 50,
      })
      if (result.error) {
        setError(t('admin_support_load_failed'))
        setItems([])
      } else {
        setItems(result.items)
      }
      await refreshAdminSupportUnread(getUnreadCount)
    } catch (e) {
      console.error(e)
      setError(t('admin_support_load_failed'))
      setItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [getUnreadCount, listTickets, statusFilter, t])

  useFocusEffect(
    React.useCallback(() => {
      if (!isLeagueAdmin(state.user)) {
        return
      }
      void load()
    }, [load, state.user]),
  )

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      return
    }
    setLoading(true)
    void load()
  }, [statusFilter])

  function statusColor(status: string) {
    switch (status) {
      case 'open':
        return {bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', fg: '#b45309'}
      case 'in_progress':
        return {bg: isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe', fg: '#1d4ed8'}
      case 'resolved':
        return {bg: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7', fg: '#15803d'}
      case 'closed':
        return {bg: isDark ? 'rgba(148, 163, 184, 0.2)' : '#e2e8f0', fg: '#475569'}
      default:
        return {bg: isDark ? 'rgba(148, 163, 184, 0.2)' : '#e2e8f0', fg: '#475569'}
    }
  }

  const borderColor = isDark ? '#334155' : '#e2e8f0'
  const muted = isDark ? '#94a3b8' : '#64748b'
  const filters: StatusFilter[] = ['all', ...SUPPORT_TICKET_STATUSES, 'deleted']

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{padding: 16, paddingBottom: 40}}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void load()
          }}
        />
      }>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
        contentContainerStyle={{gap: 8}}>
        {filters.map(filter => {
          const active = statusFilter === filter
          const label =
            filter === 'all'
              ? t('admin_support_filter_all')
              : filter === 'deleted'
                ? t('admin_support_filter_deleted')
                : t(supportStatusLabelKey(filter))
          return (
            <Pressable
              key={filter}
              onPress={() => {
                setStatusFilter(filter)
              }}
              className="rounded-full border px-3 py-2"
              style={{
                borderColor: active ? '#0ea5e9' : borderColor,
                backgroundColor: active
                  ? isDark
                    ? 'rgba(14, 165, 233, 0.2)'
                    : 'rgba(14, 165, 233, 0.12)'
                  : 'transparent',
              }}>
              <Text className="text-sm font-semibold">{label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <Text className="mt-4 text-sm" style={{color: '#dc2626'}}>
          {error}
        </Text>
      ) : items.length === 0 ? (
        <Text className="mt-4 text-sm" style={{color: muted}}>
          {t('admin_support_empty')}
        </Text>
      ) : (
        items.map(item => {
          const colors = statusColor(item.status)
          const unread =
            !item.deleted_at && item.unread_user_activity > 0
          const isDeleted = Boolean(item.deleted_at)
          return (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push(`/Settings/Admin/Support/${item.id}` as any)
              }
              className="mb-3 rounded-xl border p-4"
              style={{
                borderColor: unread ? '#38bdf8' : borderColor,
                backgroundColor: unread
                  ? isDark
                    ? 'rgba(14, 165, 233, 0.12)'
                    : 'rgba(14, 165, 233, 0.06)'
                  : 'transparent',
                opacity: isDeleted ? 0.75 : 1,
              }}>
              <RNView className="mb-2 flex-row items-center justify-between">
                <Text className="flex-1 pr-3 font-bold" numberOfLines={1}>
                  #{item.id}{' '}
                  {item.title?.trim() || t('support_request_default_title')}
                </Text>
                <RNView className="flex-row items-center" style={{gap: 6}}>
                  {isDeleted ? (
                    <RNView
                      className="rounded-full px-2 py-0.5"
                      style={{
                        backgroundColor: isDark
                          ? 'rgba(248, 113, 113, 0.2)'
                          : '#fee2e2',
                      }}>
                      <Text
                        className="text-xs font-bold"
                        style={{color: '#b91c1c'}}>
                        {t('admin_support_deleted_badge')}
                      </Text>
                    </RNView>
                  ) : null}
                  <RNView
                    className="rounded-full px-2 py-0.5"
                    style={{backgroundColor: colors.bg}}>
                    <Text
                      className="text-xs font-bold"
                      style={{color: colors.fg}}>
                      {t(supportStatusLabelKey(item.status))}
                    </Text>
                  </RNView>
                </RNView>
              </RNView>
              <Text className="mb-1 text-sm font-semibold">
                {item.player_display_name}
                <Text className="font-normal" style={{color: muted}}>
                  {' '}
                  · #{item.player_id}
                </Text>
              </Text>
              <Text className="text-sm" style={{color: muted}} numberOfLines={2}>
                {messagePreview(item.message)}
              </Text>
              <RNView className="mt-2 flex-row items-center justify-between">
                <Text className="text-xs" style={{color: muted}}>
                  {formatTicketDate(item.created_at)}
                  {item.attachment_count > 0
                    ? ` · ${t('admin_support_attachments', {count: item.attachment_count})}`
                    : ''}
                </Text>
                {unread ? (
                  <RNView className="rounded-full bg-sky-500 px-2 py-0.5">
                    <Text className="text-[10px] font-bold uppercase text-white">
                      {item.unread_user_activity > 1
                        ? String(item.unread_user_activity)
                        : t('support_unread_badge')}
                    </Text>
                  </RNView>
                ) : null}
              </RNView>
            </Pressable>
          )
        })
      )}
    </ScrollView>
  )
}
