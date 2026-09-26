import AnnouncementDialog from '@/components/Announcements/AnnouncementDialog'
import LanguageOption from '@/components/LanguageOption'
import {CompetitionPickerModal} from '@/components/navigation/CompetitionPickerModal'
import {CompetitionValidator} from '@/components/navigation/CompetitionValidator'
import {CustomTabBar} from '@/components/navigation/CustomTabBar'
import {TabBarIcon} from '@/components/navigation/TabBarIcon'
import {useLeagueContext} from '@/context/LeagueContext'
import {useAccount} from '@/hooks/useAccount'
import {useAnnouncements} from '@/hooks/useAnnouncements'
import i18n from '@/i18n'
import {syncAnnouncementUnreadFromList} from '@/lib/announcementUnread'
import {
  findLatestAnnouncementForDialog,
  getLocalAnnouncementReads,
  isAnnouncementUnreadMerged,
} from '@/lib/announcementReads'
import {
  applyBadgeFromRemoteMessage,
  getBadgeFromRemoteMessage,
  isAnnouncementRemoteMessage,
  presentRemoteNotification,
  setAppBadgeCount,
} from '@/lib/notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getMessaging,
  onMessage,
  onTokenRefresh,
} from '@react-native-firebase/messaging'
import * as Notifications from 'expo-notifications'
import {Tabs} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {AppState, Platform, View} from 'react-native'

export default function TabLayout() {
  const {t, i18n} = useTranslation()
  const {state, dispatch} = useLeagueContext()
  const account = useAccount()
  const {markRead, syncReads, getAnnouncements, getAnnouncement} =
    useAnnouncements()
  const [isMounted, setIsMounted] = React.useState(false)
  const [showLanguageOption, setShowLanguageOption] = React.useState(false)
  const [unreadAnnouncement, setUnreadAnnouncement] = React.useState<{
    id: number
    title: string
    content: string
    created_at: string
    modified_at: string
  } | null>(null)
  const [showAnnouncementDialog, setShowAnnouncementDialog] = React.useState(false)
  const [markingAnnouncementRead, setMarkingAnnouncementRead] = React.useState(false)
  const announcementCheckGenerationRef = React.useRef(0)
  const announcementCheckInFlightRef = React.useRef(false)
  const announcementCheckPendingRef = React.useRef(false)
  const suppressedAnnouncementIdsRef = React.useRef<Set<number>>(new Set())
  const visibleAnnouncementIdRef = React.useRef<number | null>(null)
  const hasFetchedThreads = React.useRef(false)
  const accountRef = React.useRef(account)
  const dispatchRef = React.useRef(dispatch)
  const announcementsRef = React.useRef({
    markRead,
    syncReads,
    getAnnouncements,
    getAnnouncement,
  })

  React.useEffect(() => {
    accountRef.current = account
    dispatchRef.current = dispatch
    announcementsRef.current = {
      markRead,
      syncReads,
      getAnnouncements,
      getAnnouncement,
    }
  })

  React.useEffect(() => {
    visibleAnnouncementIdRef.current = showAnnouncementDialog
      ? (unreadAnnouncement?.id ?? null)
      : null
  }, [showAnnouncementDialog, unreadAnnouncement?.id])

  const checkUnreadAnnouncements = React.useCallback(async (options?: {
    presentDialog?: boolean
  }) => {
    const presentDialog = options?.presentDialog !== false
    if (announcementCheckInFlightRef.current) {
      announcementCheckPendingRef.current = true
      return
    }
    announcementCheckInFlightRef.current = true
    const generation = ++announcementCheckGenerationRef.current

    try {
      const jwt = await AsyncStorage.getItem('jwt')
      if (jwt?.trim() && !state.user?.id) {
        return
      }

      const applyAnnouncement = (
        announcement: {
          id: number
          title: string
          content: string
          created_at: string
          modified_at: string
          read_at?: string | null
        } | null,
        localReads: Awaited<ReturnType<typeof getLocalAnnouncementReads>>,
      ) => {
        if (generation !== announcementCheckGenerationRef.current) {
          return
        }
        if (
          presentDialog &&
          announcement &&
          isAnnouncementUnreadMerged(announcement, localReads) &&
          !suppressedAnnouncementIdsRef.current.has(announcement.id) &&
          visibleAnnouncementIdRef.current !== announcement.id
        ) {
          setUnreadAnnouncement(announcement)
          setShowAnnouncementDialog(true)
          if (Platform.OS !== 'web') {
            void Notifications.dismissAllNotificationsAsync()
          }
        } else if (
          !presentDialog ||
          !announcement ||
          !isAnnouncementUnreadMerged(announcement, localReads) ||
          suppressedAnnouncementIdsRef.current.has(announcement.id)
        ) {
          if (visibleAnnouncementIdRef.current == null) {
            setUnreadAnnouncement(null)
            setShowAnnouncementDialog(false)
          }
        }
      }

      const resolveDialogAnnouncement = async (
        items: {
          id: number
          modified_at: string
          read_at?: string | null
        }[],
        localReads: Awaited<ReturnType<typeof getLocalAnnouncementReads>>,
      ) => {
        const latestListItem = findLatestAnnouncementForDialog(items, localReads)
        if (!latestListItem) {
          applyAnnouncement(null, localReads)
          return
        }
        const announcement = await announcementsRef.current.getAnnouncement(
          latestListItem.id,
        )
        applyAnnouncement(announcement, localReads)
      }

      if (state.user?.id) {
        await announcementsRef.current.syncReads()
        if (generation !== announcementCheckGenerationRef.current) {
          return
        }
        const [localReads, result] = await Promise.all([
          getLocalAnnouncementReads(),
          announcementsRef.current.getAnnouncements(1, 50),
        ])
        if (generation !== announcementCheckGenerationRef.current) {
          return
        }
        const items = result.items ?? []
        syncAnnouncementUnreadFromList(items, localReads)
        if (presentDialog) {
          await resolveDialogAnnouncement(items, localReads)
        }
        return
      }

      const [localReads, result] = await Promise.all([
        getLocalAnnouncementReads(),
        announcementsRef.current.getAnnouncements(1, 50),
      ])
      if (generation !== announcementCheckGenerationRef.current) {
        return
      }
      const items = result.items ?? []
      syncAnnouncementUnreadFromList(items, localReads)

      if (!presentDialog) {
        return
      }

      await resolveDialogAnnouncement(items, localReads)
    } catch (e) {
      console.error('Error checking unread announcements:', e)
    } finally {
      announcementCheckInFlightRef.current = false
      if (announcementCheckPendingRef.current) {
        announcementCheckPendingRef.current = false
        void checkUnreadAnnouncements()
      }
    }
  }, [state.user?.id])

  const refreshAnnouncementBadge = React.useCallback(async () => {
    try {
      const jwt = await AsyncStorage.getItem('jwt')
      if (jwt?.trim() && !state.user?.id) {
        return
      }
      if (state.user?.id) {
        await announcementsRef.current.syncReads()
      }
      const [localReads, result] = await Promise.all([
        getLocalAnnouncementReads(),
        announcementsRef.current.getAnnouncements(1, 50),
      ])
      syncAnnouncementUnreadFromList(result.items ?? [], localReads)
    } catch (e) {
      console.error('Error refreshing announcement badge:', e)
    }
  }, [state.user?.id])

  async function handleAnnouncementDismiss() {
    if (!unreadAnnouncement || markingAnnouncementRead) {
      return
    }
    const dismissedId = unreadAnnouncement.id
    setMarkingAnnouncementRead(true)
    announcementCheckGenerationRef.current += 1
    suppressedAnnouncementIdsRef.current.add(dismissedId)
    visibleAnnouncementIdRef.current = null
    try {
      await announcementsRef.current.markRead(dismissedId)
      setShowAnnouncementDialog(false)
      setUnreadAnnouncement(null)
      await refreshAnnouncementBadge()
    } catch (e) {
      console.error('Error marking announcement read:', e)
    } finally {
      setMarkingAnnouncementRead(false)
    }
  }

  const syncUnreadFromServer = React.useCallback(async () => {
    try {
      const unreadCount = await accountRef.current.GetUnreadMessageCount()
      if (typeof unreadCount === 'number') {
        dispatchRef.current({type: 'SET_MESSAGE_COUNT', payload: unreadCount})
        await setAppBadgeCount(unreadCount)
      }

      const res = await accountRef.current.GetMessageThreads()
      if (res.status === 'ok' && Array.isArray(res.data)) {
        dispatchRef.current({type: 'SET_MESSAGE_THREADS', payload: res.data})
      }
    } catch (e) {
      console.error('Error syncing unread messages:', e)
    }
  }, [])

  React.useEffect(() => {
    async function getLanguage() {
      try {
        const lang = await AsyncStorage.getItem('language')
        if (!lang) {
          setShowLanguageOption(true)
        } else {
          await i18n.changeLanguage(lang)
        }
      } catch (error) {
        console.log(error)
      } finally {
        setIsMounted(true)
      }
    }
    getLanguage()
  }, [])

  // Fetch message threads on app startup if user is logged in
  React.useEffect(() => {
    async function fetchInitialThreads() {
      if (
        state.user?.id &&
        !hasFetchedThreads.current &&
        state.messageThreads.length === 0
      ) {
        try {
          await syncUnreadFromServer()
          hasFetchedThreads.current = true
        } catch (e) {
          console.error('Error fetching initial threads:', e)
        }
      }
    }

    if (isMounted) {
      fetchInitialThreads()
    }
  }, [
    isMounted,
    state.user?.id,
    state.messageThreads.length,
    syncUnreadFromServer,
  ])

  // Check for unread announcements after language is chosen and auth is ready
  React.useEffect(() => {
    if (!isMounted || showLanguageOption) {
      return
    }
    checkUnreadAnnouncements()
  }, [
    isMounted,
    showLanguageOption,
    state.user?.id,
    i18n.language,
    checkUnreadAnnouncements,
  ])

  // Keep app icon badge in sync with in-app unread count
  React.useEffect(() => {
    if (!isMounted || Platform.OS === 'web') {
      return
    }
    setAppBadgeCount(state.messageCount)
  }, [state.messageCount, isMounted])

  // Refresh unread whenever the app returns to foreground
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        if (state.user?.id) {
          syncUnreadFromServer()
        }
        if (!showLanguageOption) {
          checkUnreadAnnouncements()
        }
      }
    })

    return () => subscription.remove()
  }, [
    state.user?.id,
    showLanguageOption,
    syncUnreadFromServer,
    checkUnreadAnnouncements,
  ])

  // Keep FCM token fresh and listen for foreground pushes (stable listener)
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      return
    }

    const messaging = getMessaging()

    const unsubscribeToken = onTokenRefresh(messaging, async () => {
      if (!state.user?.id) {
        return
      }
      try {
        await accountRef.current.RefreshPushToken()
      } catch (e) {
        console.error('Error refreshing FCM token:', e)
      }
    })

    if (state.user?.id) {
      accountRef.current.RefreshPushToken().catch((e: unknown) => {
        console.error('Error ensuring FCM token:', e)
      })
    }

    const unsubscribeMessage = onMessage(messaging, async remoteMessage => {
      console.log('Notification received in foreground:', remoteMessage?.data)
      try {
        if (isAnnouncementRemoteMessage(remoteMessage)) {
          await checkUnreadAnnouncements()
          return
        }

        await presentRemoteNotification(remoteMessage)

        if (!state.user?.id) {
          return
        }

        // Optimistic UI update from payload badge so the tab updates immediately
        const payloadBadge = getBadgeFromRemoteMessage(remoteMessage)
        if (payloadBadge != null) {
          dispatchRef.current({type: 'SET_MESSAGE_COUNT', payload: payloadBadge})
          await setAppBadgeCount(payloadBadge)
        } else {
          await applyBadgeFromRemoteMessage(remoteMessage)
        }

        await syncUnreadFromServer()
      } catch (e) {
        console.error('Error handling foreground notification:', e)
      }
    })

    return () => {
      unsubscribeMessage()
      unsubscribeToken()
    }
  }, [state.user?.id, syncUnreadFromServer, checkUnreadAnnouncements])

  async function handleLanguageOption(lang: string) {
    try {
      await AsyncStorage.setItem('language', lang)
      await i18n.changeLanguage(lang)
      if (state.user?.id) {
        await account.SaveLanguage(lang)
      }
      setShowLanguageOption(false)
    } catch (error) {
      console.log(error)
    }
  }

  if (!isMounted) {
    return null
  }

  return (
    <>
      <CompetitionValidator />
      <CompetitionPickerModal />
      <AnnouncementDialog
        announcement={unreadAnnouncement}
        visible={showAnnouncementDialog && !showLanguageOption}
        submitting={markingAnnouncementRead}
        onDismiss={handleAnnouncementDismiss}
      />
      {showLanguageOption ? (
        <View className="flex-1 justify-center mx-4">
          <LanguageOption handleLanguageOption={handleLanguageOption} />
        </View>
      ) : (
        <Tabs tabBar={props => <CustomTabBar {...props} />}>
      <Tabs.Screen
        name="(index)"
        options={{
          headerTitle: t('bangkok_darts_league'),
          headerShown: false,
          tabBarIcon: ({color, focused}) => (
            <TabBarIcon
              name={focused ? 'home' : 'home-outline'}
              color={color}
            />
          ),
          tabBarLabel: t('home'),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: t('statistics'),
          headerShown: false,
          tabBarIcon: ({color, focused}) => (
            <TabBarIcon
              name={focused ? 'stats-chart' : 'stats-chart-outline'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="completed"
        options={{
          title: t('completed'),
          headerShown: false,
          tabBarIcon: ({color, focused}) => (
            <TabBarIcon
              name={focused ? 'code-slash' : 'code-slash-outline'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('messages'),
          headerShown: false,
          tabBarIcon: ({color, focused}) => (
            <TabBarIcon
              name={focused ? 'mail' : 'mail-outline'}
              color={color}
            />
          ),
          tabBarLabel: t('messages'),
        }}
      />
    </Tabs>
      )}
    </>
  )
}
