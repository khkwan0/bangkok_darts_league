import TextInput from '@/components/TextInput'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {useAdminSupportTickets} from '@/hooks/useAdminSupportTickets'
import {refreshAdminSupportUnread} from '@/lib/adminSupportUnread'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {
  supportAttachmentUrl,
  supportStatusLabelKey,
} from '@/lib/supportTickets'
import {
  SUPPORT_TICKET_STATUSES,
  type AdminSupportTicketDetail,
  type SupportImageAttachment,
  type SupportTicketAttachment,
  type SupportTicketReply,
  type SupportTicketStatus,
} from '@/types/supportTickets'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  useColorScheme,
  View as RNView,
} from 'react-native'

const MAX_ATTACHMENTS = 5

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

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

function AttachmentList({
  attachments,
  apiUrl,
}: {
  attachments: SupportTicketAttachment[]
  apiUrl?: string | null
}) {
  const {t} = useTranslation()
  if (!attachments.length) {
    return null
  }
  return (
    <RNView className="mt-3 gap-2">
      {attachments.map(item => {
        const url = supportAttachmentUrl(item.stored_filename, apiUrl)
        if (item.kind === 'image') {
          return (
            <Pressable key={item.id} onPress={() => void Linking.openURL(url)}>
              <Image
                source={{uri: url}}
                style={{width: '100%', height: 180, borderRadius: 10}}
                resizeMode="cover"
              />
            </Pressable>
          )
        }
        return (
          <Pressable
            key={item.id}
            onPress={() => void Linking.openURL(url)}
            className="flex-row items-center rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
            <MCI name="file-document-outline" size={18} color="#64748b" />
            <Text className="ml-2 flex-1 text-sm" numberOfLines={1}>
              {item.original_filename || t('support_attachment')}
            </Text>
          </Pressable>
        )
      })}
    </RNView>
  )
}

function ReplyBubble({
  reply,
  apiUrl,
  isDark,
}: {
  reply: SupportTicketReply
  apiUrl?: string | null
  isDark: boolean
}) {
  const {t} = useTranslation()
  const isStaff = reply.is_staff
  const unread = Boolean(!isStaff && reply.is_unread)
  return (
    <RNView
      className="mb-3 rounded-xl border p-4"
      style={{
        borderColor: unread
          ? '#38bdf8'
          : isStaff
            ? isDark
              ? '#1e3a5f'
              : '#bfdbfe'
            : isDark
              ? '#334155'
              : '#e2e8f0',
        backgroundColor: unread
          ? isDark
            ? 'rgba(14, 165, 233, 0.15)'
            : 'rgba(14, 165, 233, 0.08)'
          : isStaff
            ? isDark
              ? 'rgba(59, 130, 246, 0.12)'
              : '#eff6ff'
            : isDark
              ? 'rgba(148, 163, 184, 0.08)'
              : '#f8fafc',
      }}>
      <RNView className="mb-2 flex-row items-center justify-between">
        <RNView className="flex-row items-center">
          <Text className="font-semibold">
            {isStaff
              ? `${t('support_reply_from_staff')} (${reply.author_display_name})`
              : reply.author_display_name}
          </Text>
          {unread ? (
            <RNView className="ml-2 rounded-full bg-sky-500 px-2 py-0.5">
              <Text className="text-[10px] font-bold uppercase text-white">
                {t('support_unread_badge')}
              </Text>
            </RNView>
          ) : null}
        </RNView>
        <Text className="text-xs opacity-60">
          {formatTicketDate(reply.created_at)}
        </Text>
      </RNView>
      <Text className="text-sm">{reply.message}</Text>
      <AttachmentList attachments={reply.attachments} apiUrl={apiUrl} />
    </RNView>
  )
}

export default function AdminSupportTicketDetailScreen() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const params = useLocalSearchParams<{ticketId: string}>()
  const ticketId = parseInt(firstParam(params.ticketId) ?? '', 10)
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const {apiUrl, state} = useLeagueContext()
  const {getTicket, updateTicket, replyToTicket, getUnreadCount} =
    useAdminSupportTickets()

  const [ticket, setTicket] = React.useState<AdminSupportTicketDetail | null>(
    null,
  )
  const [status, setStatus] = React.useState<SupportTicketStatus>('open')
  const [adminNotes, setAdminNotes] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [reply, setReply] = React.useState('')
  const [attachments, setAttachments] = React.useState<SupportImageAttachment[]>(
    [],
  )
  const [sending, setSending] = React.useState(false)

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings' as any)
    }
  }, [router, state.user])

  const loadTicket = React.useCallback(async () => {
    if (!Number.isFinite(ticketId) || ticketId <= 0) {
      setError(t('support_ticket_not_found'))
      setLoading(false)
      setRefreshing(false)
      return
    }
    try {
      setError(null)
      const data = await getTicket(ticketId)
      if (!data) {
        setTicket(null)
        setError(t('support_ticket_not_found'))
        navigation.setOptions({title: t('admin_support')})
      } else {
        setTicket(data)
        setStatus(data.status)
        setAdminNotes(data.admin_notes ?? '')
        navigation.setOptions({
          title: `#${data.id} ${data.title?.trim() || t('support_request_default_title')}`,
        })
      }
      await refreshAdminSupportUnread(getUnreadCount)
    } catch (e) {
      console.error(e)
      setError(t('support_ticket_not_found'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [getTicket, getUnreadCount, navigation, t, ticketId])

  React.useEffect(() => {
    void loadTicket()
  }, [loadTicket])

  async function handleAttach() {
    if (attachments.length >= MAX_ATTACHMENTS) {
      Alert.alert(t('support_too_many_attachments'))
      return
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(
        t('support_image_permission_title'),
        t('support_image_permission_body'),
      )
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    })
    if (result.canceled || !result.assets?.[0]?.uri) {
      return
    }
    const asset = result.assets[0]
    setAttachments(prev =>
      [
        ...prev,
        {
          uri: asset.uri,
          name: asset.fileName || `admin-support-${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        },
      ].slice(0, MAX_ATTACHMENTS),
    )
  }

  async function handleSave() {
    if (!ticket) return
    setSaving(true)
    try {
      const result = await updateTicket(ticket.id, {
        status,
        admin_notes: adminNotes.trim() || null,
      })
      if (result.error || !result.ticket) {
        Alert.alert(t('admin_support_save_failed'))
        return
      }
      setTicket(result.ticket)
      setStatus(result.ticket.status)
      setAdminNotes(result.ticket.admin_notes ?? '')
      await refreshAdminSupportUnread(getUnreadCount)
    } finally {
      setSaving(false)
    }
  }

  async function handleSendReply() {
    const trimmed = reply.trim()
    if (!trimmed || !ticket) return
    setSending(true)
    try {
      const result = await replyToTicket(ticket.id, {
        message: trimmed,
        attachments,
      })
      if (result.error || !result.ticket) {
        Alert.alert(t('support_reply_failed'))
        return
      }
      setTicket(result.ticket)
      setStatus(result.ticket.status)
      setAdminNotes(result.ticket.admin_notes ?? '')
      setReply('')
      setAttachments([])
      await refreshAdminSupportUnread(getUnreadCount)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (!ticket) {
    return (
      <View className="flex-1 p-4">
        <Text>{error || t('support_ticket_not_found')}</Text>
      </View>
    )
  }

  const muted = isDark ? '#94a3b8' : '#64748b'
  const borderColor = isDark ? '#334155' : '#e2e8f0'

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{padding: 16, paddingBottom: 40}}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void loadTicket()
          }}
        />
      }>
      <RNView
        className="mb-4 rounded-xl border p-4"
        style={{borderColor}}>
        <Text className="mb-1 font-bold">{ticket.player_display_name}</Text>
        <Text className="text-sm" style={{color: muted}}>
          #{ticket.player_id}
          {ticket.player_email ? ` · ${ticket.player_email}` : ''}
        </Text>
        <Text className="mt-2 text-xs" style={{color: muted}}>
          {t('support_ticket_opened', {
            date: formatTicketDate(ticket.created_at),
          })}
        </Text>
      </RNView>

      <Text className="mb-3 font-bold">{t('support_conversation')}</Text>

      <RNView
        className="mb-3 rounded-xl border p-4"
        style={{
          borderColor: ticket.initial_message_unread ? '#38bdf8' : borderColor,
          backgroundColor: ticket.initial_message_unread
            ? isDark
              ? 'rgba(14, 165, 233, 0.15)'
              : 'rgba(14, 165, 233, 0.08)'
            : isDark
              ? 'rgba(148,163,184,0.08)'
              : '#fff',
        }}>
        <RNView className="mb-2 flex-row items-center justify-between">
          <RNView className="flex-row items-center">
            <Text className="font-semibold">
              {t('admin_support_original_message')}
            </Text>
            {ticket.initial_message_unread ? (
              <RNView className="ml-2 rounded-full bg-sky-500 px-2 py-0.5">
                <Text className="text-[10px] font-bold uppercase text-white">
                  {t('support_unread_badge')}
                </Text>
              </RNView>
            ) : null}
          </RNView>
          <Text className="text-xs opacity-60">
            {formatTicketDate(ticket.created_at)}
          </Text>
        </RNView>
        <Text className="text-sm">{ticket.message}</Text>
        <AttachmentList attachments={ticket.attachments} apiUrl={apiUrl} />
      </RNView>

      {ticket.replies.map(item => (
        <ReplyBubble
          key={item.id}
          reply={item}
          apiUrl={apiUrl}
          isDark={isDark}
        />
      ))}

      <Text className="mb-2 mt-2 font-bold">{t('admin_support_manage')}</Text>
      <Text className="mb-2 text-sm font-semibold">{t('admin_support_status')}</Text>
      <RNView className="mb-4 flex-row flex-wrap" style={{gap: 8}}>
        {SUPPORT_TICKET_STATUSES.map(value => {
          const active = status === value
          return (
            <Pressable
              key={value}
              onPress={() => setStatus(value)}
              className="rounded-full border px-3 py-2"
              style={{
                borderColor: active ? '#0ea5e9' : borderColor,
                backgroundColor: active
                  ? isDark
                    ? 'rgba(14, 165, 233, 0.2)'
                    : 'rgba(14, 165, 233, 0.12)'
                  : 'transparent',
              }}>
              <Text className="text-sm font-semibold">
                {t(supportStatusLabelKey(value))}
              </Text>
            </Pressable>
          )
        })}
      </RNView>

      <Text className="mb-1 text-sm font-semibold">
        {t('admin_support_notes')}
      </Text>
      <TextInput
        value={adminNotes}
        onChangeText={setAdminNotes}
        placeholder={t('admin_support_notes_placeholder')}
        multiline
        numberOfLines={4}
        style={{minHeight: 100, textAlignVertical: 'top'}}
        editable={!saving}
      />
      <Pressable
        onPress={() => void handleSave()}
        disabled={saving}
        className="mt-3 items-center rounded-xl px-4 py-3"
        style={{
          backgroundColor: '#64748b',
          opacity: saving ? 0.7 : 1,
        }}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-bold text-white">{t('admin_support_save')}</Text>
        )}
      </Pressable>

      <Text className="mb-2 mt-6 font-bold">{t('support_add_reply')}</Text>
      <TextInput
        value={reply}
        onChangeText={setReply}
        placeholder={t('support_message_placeholder')}
        multiline
        numberOfLines={4}
        style={{minHeight: 100, textAlignVertical: 'top'}}
        editable={!sending}
      />
      <Pressable
        onPress={() => void handleAttach()}
        disabled={sending || attachments.length >= MAX_ATTACHMENTS}
        className="mt-3 flex-row items-center self-start rounded-full px-3 py-2"
        style={{
          backgroundColor: isDark
            ? 'rgba(148, 163, 184, 0.12)'
            : 'rgba(148, 163, 184, 0.14)',
          opacity: sending || attachments.length >= MAX_ATTACHMENTS ? 0.55 : 1,
        }}>
        <MCI name="image-plus" size={18} color="#0ea5e9" style={{marginRight: 8}} />
        <Text className="text-sm font-semibold" style={{color: '#0ea5e9'}}>
          {t('support_attach_images')}
        </Text>
      </Pressable>
      {attachments.length > 0 ? (
        <ScrollView horizontal className="mt-3" showsHorizontalScrollIndicator={false}>
          {attachments.map((item, index) => (
            <RNView key={`${item.uri}-${index}`} className="relative mr-3">
              <Image
                source={{uri: item.uri}}
                style={{width: 72, height: 72, borderRadius: 10}}
              />
              <Pressable
                onPress={() =>
                  setAttachments(prev => prev.filter((_, i) => i !== index))
                }
                className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-red-500">
                <MCI name="close" size={14} color="#fff" />
              </Pressable>
            </RNView>
          ))}
        </ScrollView>
      ) : null}
      <Pressable
        onPress={() => void handleSendReply()}
        disabled={sending || !reply.trim()}
        className="mt-4 items-center rounded-xl px-4 py-3"
        style={{
          backgroundColor: '#0ea5e9',
          opacity: sending || !reply.trim() ? 0.7 : 1,
        }}>
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-bold text-white">{t('support_send_reply')}</Text>
        )}
      </Pressable>
    </ScrollView>
  )
}
