import Button from '@/components/Button'
import {formatForumDate} from '@/components/Forums/formatForumDate'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useAnnouncements} from '@/hooks/useAnnouncements'
import {useLeagueContext} from '@/context/LeagueContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import type {AdminAnnouncementListItem} from '@/types/announcements'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useNavigation, useRouter} from 'expo-router'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  View as RNView,
} from 'react-native'

export default function AdminAnnouncementsScreen() {
  const {t, i18n} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const {colors} = useTheme()
  const {state} = useLeagueContext()
  const {adminGetAnnouncements, adminDelete, adminRestore} = useAnnouncements()
  const [items, setItems] = React.useState<AdminAnnouncementListItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [busyId, setBusyId] = React.useState<number | null>(null)

  React.useEffect(() => {
    navigation.setOptions({title: t('announcements_admin')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings/Admin')
    }
  }, [state.user, router])

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const result = await adminGetAnnouncements(1, 50)
        if (!cancelled) {
          setItems(result.items)
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [adminGetAnnouncements])

  const reload = React.useCallback(async () => {
    try {
      const result = await adminGetAnnouncements(1, 50)
      setItems(result.items)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [adminGetAnnouncements])

  function confirmDelete(item: AdminAnnouncementListItem) {
    Alert.alert(t('announcements_delete_confirm'), item.title, [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('remove'),
        style: 'destructive',
        onPress: async () => {
          setBusyId(item.id)
          const res = await adminDelete(item.id)
          setBusyId(null)
          if (res.status === 'ok') {
            reload()
          } else {
            Alert.alert(t('something_went_wrong'))
          }
        },
      },
    ])
  }

  async function handleRestore(id: number) {
    setBusyId(id)
    const res = await adminRestore(id)
    setBusyId(null)
    if (res.status === 'ok') {
      reload()
    } else {
      Alert.alert(t('something_went_wrong'))
    }
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true)
          reload()
        }} />
      }>
      <Button
        onPress={() =>
          router.push('/Settings/Admin/Announcements/edit?new=1')
        }>
        {t('announcements_create')}
      </Button>

      {items.map(item => (
        <RNView
          key={item.id}
          className="mb-3 mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          <Pressable
            onPress={() =>
              router.push(`/Settings/Admin/Announcements/edit?id=${item.id}`)
            }
            className="px-4 py-3.5">
            <RNView className="flex-row items-start justify-between">
              <RNView className="mr-3 flex-1">
                <Text className="font-semibold">{item.title}</Text>
                {!item.active ? (
                  <Text className="mt-1 text-xs uppercase text-red-500">
                    {t('inactive')}
                  </Text>
                ) : null}
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
          <RNView className="flex-row border-t border-slate-200 px-2 py-2 dark:border-slate-700">
            {item.active ? (
              <Pressable
                onPress={() => confirmDelete(item)}
                disabled={busyId === item.id}
                className="flex-1 items-center py-2">
                {busyId === item.id ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text className="text-red-500">{t('remove')}</Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={() => handleRestore(item.id)}
                disabled={busyId === item.id}
                className="flex-1 items-center py-2">
                {busyId === item.id ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text style={{color: colors.primary}}>{t('announcements_restore')}</Text>
                )}
              </Pressable>
            )}
          </RNView>
        </RNView>
      ))}
    </ScrollView>
  )
}
