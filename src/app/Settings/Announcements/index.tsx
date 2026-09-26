import {formatForumDate} from '@/components/Forums/formatForumDate'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useAnnouncements} from '@/hooks/useAnnouncements'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  getLocalAnnouncementReads,
  isAnnouncementUnreadMerged,
} from '@/lib/announcementReads'
import {syncAnnouncementUnreadFromList} from '@/lib/announcementUnread'
import type {AnnouncementListItem} from '@/types/announcements'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useNavigation, useTheme} from 'expo-router/react-navigation'
import {useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View as RNView,
} from 'react-native'

export default function AnnouncementsScreen() {
  const {t, i18n} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const {colors} = useTheme()
  const {state} = useLeagueContext()
  const {getAnnouncements, syncReads} = useAnnouncements()
  const [items, setItems] = React.useState<AnnouncementListItem[]>([])
  const [localReads, setLocalReads] = React.useState<Record<string, string>>({})
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    navigation.setOptions({title: t('announcements')})
  }, [navigation, t])

  const loadAnnouncements = React.useCallback(async () => {
    try {
      setError(null)
      if (state.user?.id) {
        await syncReads()
      }
      const [result, reads] = await Promise.all([
        getAnnouncements(1, 50),
        getLocalAnnouncementReads(),
      ])
      setLocalReads(reads)
      if (result.error) {
        setError(t('announcements_load_error'))
        setItems([])
      } else {
        setItems(result.items)
      }
      syncAnnouncementUnreadFromList(result.items ?? [], reads)
    } catch (e) {
      console.error(e)
      setError(t('announcements_load_error'))
      setItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [getAnnouncements, state.user?.id, syncReads, t])

  React.useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements, i18n.language])

  function handleRefresh() {
    if (refreshing) {
      return
    }
    setRefreshing(true)
    void loadAnnouncements()
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 px-4 pt-2"
      contentContainerStyle={{flexGrow: 1}}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }>
      {error ? (
        <View className="flex-1 items-center justify-center px-6 py-12">
          <MCI name="alert-circle-outline" size={48} color={colors.text} style={{opacity: 0.35}} />
          <Text className="mt-4 text-center text-red-500">{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center py-12">
          <MCI name="bullhorn-outline" size={48} color={colors.text} style={{opacity: 0.35}} />
          <Text className="mt-4 text-center opacity-60">{t('announcements_empty')}</Text>
        </View>
      ) : (
        items.map(item => {
          const isUnread = isAnnouncementUnreadMerged(item, localReads)
          return (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: '/Settings/Announcements/[id]',
                  params: {id: String(item.id)},
                })
              }
              className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-gray-800/10 dark:border-slate-700">
              <RNView className="flex-row items-start px-4 py-3.5">
                <RNView className="relative mr-3">
                  <RNView className="h-10 w-10 items-center justify-center rounded-full bg-orange-500/15">
                    <MCI name="bullhorn-outline" size={22} color="#FF9800" />
                  </RNView>
                  {isUnread ? (
                    <RNView className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500" />
                  ) : null}
                </RNView>
                <RNView className="flex-1">
                  <Text className="font-semibold">{item.title}</Text>
                  <Text className="mt-1 text-sm opacity-60" numberOfLines={2}>
                    {item.content_preview}
                  </Text>
                  <Text className="mt-2 text-xs opacity-50">
                    {formatForumDate(item.modified_at, i18n.language)}
                  </Text>
                </RNView>
                <MCI name="chevron-right" size={22} color={colors.text} style={{opacity: 0.4}} />
              </RNView>
            </Pressable>
          )
        })
      )}
    </ScrollView>
  )
}
