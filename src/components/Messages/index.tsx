import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import config from '@/config'
import Ionicons from '@expo/vector-icons/Ionicons'
import {formatRelativeMessageListDate} from '@/lib/bangkokTime'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {MessagesProps, Thread} from './types'

export default function Messages({
  threads,
  loading,
  onThreadPress,
  onThreadDelete,
  onThreadMarkAllRead,
  onMarkAllThreadsRead,
  onDeleteAllThreads,
  footerBusy,
}: MessagesProps) {
  const {t} = useTranslation()
  const insets = useSafeAreaInsets()
  const listContentStyle = useTabListContentContainerStyle()

  const showThreadOptions = (item: Thread) => {
    const buttons: {text: string; onPress?: () => void; style?: 'cancel' | 'destructive'}[] = []
    if (onThreadDelete) {
      buttons.push({
        text: t('delete'),
        style: 'destructive',
        onPress: () => onThreadDelete(item),
      })
    }
    if (onThreadMarkAllRead) {
      buttons.push({
        text: t('mark_all_read'),
        onPress: () => onThreadMarkAllRead(item),
      })
    }
    if (buttons.length === 0) return
    buttons.push({text: t('cancel'), style: 'cancel'})
    Alert.alert(t('options'), '', buttons)
  }

  const renderThreadItem = ({item}: {item: Thread}) => {
    const threadId = item.id || item.thread_id || item.root_id
    const displayName = item.other_player_nickname || t('unknown')
    const profilePicture = item.other_player_profile_picture
    const lastMessagePreview =
      item.last_message_preview || item.last_message || item.title || ''
    const lastMessageDate = item.last_message_at || item.created_at
    const unreadCount = item.unread_count || 0

    const dateText = lastMessageDate
      ? formatRelativeMessageListDate(lastMessageDate, t('yesterday'))
      : ''

    return (
      <TouchableOpacity
        onPress={() => onThreadPress(item)}
        onLongPress={() => showThreadOptions(item)}
        className="px-4 py-3 border-b border-white/10"
        activeOpacity={0.7}>
        <View className="relative">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center flex-1 mr-2">
              {profilePicture ? (
                <Image
                  source={{uri: config.profileUrl + profilePicture}}
                  className="w-10 h-10 rounded-full mr-3"
                />
              ) : (
                <View className="w-10 h-10 rounded-full mr-3 bg-white/10 justify-center items-center">
                  <Ionicons name="person" size={20} color="#8E8E93" />
                </View>
              )}
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-base font-bold" numberOfLines={1}>
                    {displayName}
                  </Text>
                  {unreadCount > 0 && (
                    <View
                      className="ml-2 rounded-full min-w-[20px] h-5 px-1.5 justify-center items-center"
                      style={{backgroundColor: '#ef4444'}}>
                      <Text className="text-white text-xs font-semibold">
                        {String(unreadCount)}
                      </Text>
                    </View>
                  )}
                </View>
                {lastMessagePreview ? (
                  <Text className="text-sm opacity-70 mt-0.5" numberOfLines={1}>
                    {lastMessagePreview}
                  </Text>
                ) : null}
              </View>
            </View>
            {dateText ? (
              <Text className="text-sm opacity-60 ml-2">{dateText}</Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  const showFooter =
    threads.length > 0 && (onMarkAllThreadsRead || onDeleteAllThreads)
  const hasUnreadThreads = threads.some(t => (t.unread_count || 0) > 0)

  const listFooter = showFooter ? (
    <View
      className="border-t border-white/10 bg-black/20"
      style={{paddingBottom: Math.max(insets.bottom, 12)}}>
      <View className="flex-row flex-wrap justify-center gap-x-6 gap-y-2 px-4 py-3">
        {onMarkAllThreadsRead ? (
          <TouchableOpacity
            onPress={() => onMarkAllThreadsRead()}
            disabled={footerBusy || !hasUnreadThreads}
            activeOpacity={0.7}
            className="py-2">
            <Text
              className="text-base font-semibold text-blue-400"
              style={{
                opacity: footerBusy || !hasUnreadThreads ? 0.45 : 1,
              }}>
              {t('mark_all_conversations_read')}
            </Text>
          </TouchableOpacity>
        ) : null}
        {onDeleteAllThreads ? (
          <TouchableOpacity
            onPress={() => onDeleteAllThreads()}
            disabled={footerBusy}
            activeOpacity={0.7}
            className="py-2">
            <Text
              className="text-base font-semibold text-red-400"
              style={{opacity: footerBusy ? 0.5 : 1}}>
              {t('delete_all_threads')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  ) : null

  return (
    <View className="flex-1">
      <FlatList
        data={threads}
        renderItem={renderThreadItem}
        contentContainerStyle={listContentStyle}
        keyExtractor={(item, index) => {
          const threadId = item.id || item.thread_id || item.root_id
          return threadId ? String(threadId) : `thread-${index}`
        }}
        ListEmptyComponent={
          <View className="py-8 justify-center items-center">
            <Text className="opacity-60">{t('no_messages')}</Text>
          </View>
        }
        ListFooterComponent={listFooter}
      />
    </View>
  )
}
