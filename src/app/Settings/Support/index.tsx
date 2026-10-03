import TextInput from '@/components/TextInput'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {useSupportTickets} from '@/hooks/useSupportTickets'
import {
  messagePreview,
  supportStatusLabelKey,
} from '@/lib/supportTickets'
import {refreshSupportUnread} from '@/lib/supportUnread'
import type {
  MemberSupportTicketListItem,
  SupportImageAttachment,
} from '@/types/supportTickets'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useFocusEffect, useNavigation, useRouter} from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  useColorScheme,
  View as RNView,
} from 'react-native'
import {Swipeable} from 'react-native-gesture-handler'

type TabKey = 'new' | 'tickets'

const MAX_ATTACHMENTS = 5

function ClosedTicketRow({
  item,
  borderColor,
  muted,
  isDark,
  statusColors,
  onOpen,
  onDelete,
}: {
  item: MemberSupportTicketListItem
  borderColor: string
  muted: string
  isDark: boolean
  statusColors: {bg: string; fg: string}
  onOpen: () => void
  onDelete: () => void
}) {
  const {t} = useTranslation()
  const swipeRef = React.useRef<Swipeable>(null)
  const unread = item.unread_staff_replies > 0

  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        swipeRef.current?.close()
        onDelete()
      }}
      className="mb-3 ml-2 items-center justify-center rounded-xl px-5"
      style={{backgroundColor: '#ef4444', minWidth: 88}}>
      <MCI name="delete-outline" size={22} color="#fff" />
      <Text className="mt-1 text-xs font-bold text-white">
        {t('support_delete')}
      </Text>
    </Pressable>
  )

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}>
      <Pressable
        onPress={onOpen}
        className="mb-3 rounded-xl border p-4"
        style={{
          borderColor: unread ? '#38bdf8' : borderColor,
          backgroundColor: unread
            ? isDark
              ? 'rgba(14, 165, 233, 0.12)'
              : 'rgba(14, 165, 233, 0.06)'
            : isDark
              ? '#0f172a'
              : '#fff',
        }}>
        <RNView className="mb-2 flex-row items-center justify-between">
          <Text className="flex-1 pr-3 font-bold" numberOfLines={1}>
            {item.title?.trim() || t('support_request_default_title')}
          </Text>
          <RNView
            className="rounded-full px-2 py-0.5"
            style={{backgroundColor: statusColors.bg}}>
            <Text className="text-xs font-bold" style={{color: statusColors.fg}}>
              {t(supportStatusLabelKey(item.status))}
            </Text>
          </RNView>
        </RNView>
        <Text className="text-sm" style={{color: muted}} numberOfLines={2}>
          {messagePreview(item.message)}
        </Text>
        <RNView className="mt-2 flex-row items-center justify-between">
          <Text className="text-xs" style={{color: muted}}>
            {t('support_reply_count', {count: item.reply_count})}
          </Text>
          {unread ? (
            <RNView className="rounded-full bg-sky-500 px-2 py-0.5">
              <Text className="text-[10px] font-bold uppercase text-white">
                {t('support_unread_badge')}
              </Text>
            </RNView>
          ) : null}
        </RNView>
      </Pressable>
    </Swipeable>
  )
}

export default function SupportScreen() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const {state} = useLeagueContext()
  const {listTickets, createTicket, getUnreadCount, deleteTicket} =
    useSupportTickets()

  const [tab, setTab] = React.useState<TabKey>('new')
  const [title, setTitle] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [attachments, setAttachments] = React.useState<SupportImageAttachment[]>(
    [],
  )
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const [items, setItems] = React.useState<MemberSupportTicketListItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [listError, setListError] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<number | null>(null)

  React.useEffect(() => {
    navigation.setOptions({title: t('support')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!state.user?.id) {
      router.replace('/Auth' as any)
    }
  }, [router, state.user?.id])

  const loadTickets = React.useCallback(async () => {
    try {
      setListError(null)
      const result = await listTickets(1, 50)
      if (result.error) {
        setListError(t('support_tickets_load_failed'))
        setItems([])
      } else {
        setItems(result.items)
      }
      await refreshSupportUnread(getUnreadCount)
    } catch (e) {
      console.error(e)
      setListError(t('support_tickets_load_failed'))
      setItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [getUnreadCount, listTickets, t])

  useFocusEffect(
    React.useCallback(() => {
      if (!state.user?.id) {
        return
      }
      void loadTickets()
    }, [loadTickets, state.user?.id]),
  )

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
      allowsMultipleSelection: true,
      selectionLimit: MAX_ATTACHMENTS - attachments.length,
    })
    if (result.canceled || !result.assets?.length) {
      return
    }
    const next: SupportImageAttachment[] = result.assets
      .filter(asset => asset.uri)
      .map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `support-${Date.now()}-${index}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      }))
    setAttachments(prev => [...prev, ...next].slice(0, MAX_ATTACHMENTS))
  }

  function removeAttachment(index: number) {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  function mapCreateError(code?: string) {
    switch (code) {
      case 'message_required':
        return t('support_message_required')
      case 'message_too_long':
        return t('support_message_too_long')
      case 'title_too_long':
        return t('support_title_too_long')
      case 'too_many_attachments':
      case 'invalid_file_type':
      case 'file_too_large':
        return t('support_attachments_invalid')
      default:
        return t('support_submit_failed')
    }
  }

  async function handleSubmit() {
    const trimmed = message.trim()
    if (!trimmed) {
      setFormError(t('support_message_required'))
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const result = await createTicket({
        title,
        message: trimmed,
        attachments,
      })
      if (result.error || !result.ticketId) {
        setFormError(mapCreateError(result.error))
        return
      }
      setTitle('')
      setMessage('')
      setAttachments([])
      setTab('tickets')
      router.push(`/Settings/Support/${result.ticketId}` as any)
      void loadTickets()
    } finally {
      setSubmitting(false)
    }
  }

  function confirmDeleteTicket(item: MemberSupportTicketListItem) {
    Alert.alert(
      t('support_delete_confirm_title'),
      t('support_delete_confirm_body'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('support_delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (deletingId) return
              setDeletingId(item.id)
              try {
                const result = await deleteTicket(item.id)
                if (result.error) {
                  Alert.alert(t('support_delete_failed'))
                  return
                }
                setItems(prev => prev.filter(row => row.id !== item.id))
                await refreshSupportUnread(getUnreadCount)
              } finally {
                setDeletingId(null)
              }
            })()
          },
        },
      ],
    )
  }

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

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{padding: 16, paddingBottom: 40}}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        tab === 'tickets' ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void loadTickets()
            }}
          />
        ) : undefined
      }>
      <View
        className="mb-4 flex-row overflow-hidden rounded-xl border"
        style={{borderColor}}>
        {(['new', 'tickets'] as TabKey[]).map(key => {
          const active = tab === key
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              className="flex-1 items-center px-3 py-3"
              style={{
                backgroundColor: active
                  ? isDark
                    ? 'rgba(14, 165, 233, 0.2)'
                    : 'rgba(14, 165, 233, 0.12)'
                  : 'transparent',
              }}>
              <Text className="font-bold" style={{opacity: active ? 1 : 0.6}}>
                {key === 'new'
                  ? t('support_tab_new')
                  : t('support_tab_my_tickets')}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {tab === 'new' ? (
        <View>
          <Text className="mb-3 text-sm" style={{color: muted}}>
            {t('support_description')}
          </Text>
          <Text className="mb-1 font-semibold">
            {t('support_request_title_label')}
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('support_request_title_placeholder')}
            editable={!submitting}
          />
          <Text className="mb-1 mt-4 font-semibold">
            {t('support_message_label')}
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t('support_message_placeholder')}
            multiline
            numberOfLines={6}
            style={{minHeight: 120, textAlignVertical: 'top'}}
            editable={!submitting}
          />

          <Pressable
            onPress={() => void handleAttach()}
            disabled={submitting || attachments.length >= MAX_ATTACHMENTS}
            className="mt-4 flex-row items-center self-start rounded-full px-3 py-2"
            style={{
              backgroundColor: isDark
                ? 'rgba(148, 163, 184, 0.12)'
                : 'rgba(148, 163, 184, 0.14)',
              opacity:
                submitting || attachments.length >= MAX_ATTACHMENTS ? 0.55 : 1,
            }}>
            <MCI
              name="image-plus"
              size={18}
              color="#0ea5e9"
              style={{marginRight: 8}}
            />
            <Text className="text-sm font-semibold" style={{color: '#0ea5e9'}}>
              {t('support_attach_images')}
            </Text>
          </Pressable>
          <Text className="mt-1 text-xs" style={{color: muted}}>
            {t('support_attachments_hint_mobile')}
          </Text>

          {attachments.length > 0 ? (
            <ScrollView
              horizontal
              className="mt-3"
              showsHorizontalScrollIndicator={false}>
              {attachments.map((item, index) => (
                <RNView key={`${item.uri}-${index}`} className="relative mr-3">
                  <Image
                    source={{uri: item.uri}}
                    style={{width: 72, height: 72, borderRadius: 10}}
                  />
                  <Pressable
                    onPress={() => removeAttachment(index)}
                    className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-red-500">
                    <MCI name="close" size={14} color="#fff" />
                  </Pressable>
                </RNView>
              ))}
            </ScrollView>
          ) : null}

          {formError ? (
            <Text className="mt-3 text-sm" style={{color: '#dc2626'}}>
              {formError}
            </Text>
          ) : null}

          <Pressable
            onPress={() => void handleSubmit()}
            disabled={submitting}
            className="mt-5 items-center rounded-xl px-4 py-3"
            style={{
              backgroundColor: '#0ea5e9',
              opacity: submitting ? 0.7 : 1,
            }}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-bold text-white">{t('support_submit')}</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View>
          <Text className="mb-3 text-sm" style={{color: muted}}>
            {t('support_swipe_delete_hint')}
          </Text>
          {loading ? (
            <ActivityIndicator className="mt-8" />
          ) : listError ? (
            <Text className="mt-4 text-sm" style={{color: '#dc2626'}}>
              {listError}
            </Text>
          ) : items.length === 0 ? (
            <Text className="mt-4 text-sm" style={{color: muted}}>
              {t('support_no_tickets_yet')}
            </Text>
          ) : (
            items.map(item => {
              const colors = statusColor(item.status)
              const unread = item.unread_staff_replies > 0
              const openTicket = () =>
                router.push(`/Settings/Support/${item.id}` as any)

              if (item.status === 'closed') {
                return (
                  <ClosedTicketRow
                    key={item.id}
                    item={item}
                    borderColor={borderColor}
                    muted={muted}
                    isDark={isDark}
                    statusColors={colors}
                    onOpen={openTicket}
                    onDelete={() => confirmDeleteTicket(item)}
                  />
                )
              }

              return (
                <Pressable
                  key={item.id}
                  onPress={openTicket}
                  className="mb-3 rounded-xl border p-4"
                  style={{
                    borderColor: unread ? '#38bdf8' : borderColor,
                    backgroundColor: unread
                      ? isDark
                        ? 'rgba(14, 165, 233, 0.12)'
                        : 'rgba(14, 165, 233, 0.06)'
                      : 'transparent',
                  }}>
                  <RNView className="mb-2 flex-row items-center justify-between">
                    <Text className="flex-1 pr-3 font-bold" numberOfLines={1}>
                      {item.title?.trim() || t('support_request_default_title')}
                    </Text>
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
                  <Text
                    className="text-sm"
                    style={{color: muted}}
                    numberOfLines={2}>
                    {messagePreview(item.message)}
                  </Text>
                  <RNView className="mt-2 flex-row items-center justify-between">
                    <Text className="text-xs" style={{color: muted}}>
                      {t('support_reply_count', {count: item.reply_count})}
                    </Text>
                    {unread ? (
                      <RNView className="rounded-full bg-sky-500 px-2 py-0.5">
                        <Text className="text-[10px] font-bold uppercase text-white">
                          {t('support_unread_badge')}
                        </Text>
                      </RNView>
                    ) : null}
                  </RNView>
                </Pressable>
              )
            })
          )}
        </View>
      )}
    </ScrollView>
  )
}
