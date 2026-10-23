import AnnouncementDialog from '@/components/Announcements/AnnouncementDialog'
import TimezoneMismatchDialog from '@/components/TimezoneMismatchDialog'
import LanguageOption from '@/components/LanguageOption'
import {CompetitionBottomAccessory} from '@/components/navigation/CompetitionBottomAccessory'
import {CompetitionPickerModal} from '@/components/navigation/CompetitionPickerModal'
import {CompetitionValidator} from '@/components/navigation/CompetitionValidator'
import {LiveScoresBottomAccessory} from '@/components/navigation/LiveScoresBottomAccessory'
import {useLeagueContext} from '@/context/LeagueContext'
import {LiveScoresProvider} from '@/context/LiveScoresContext'
import {useForumActivitySync} from '@/hooks/useForumActivity'
import {useIsRegularLayout} from '@/hooks/useLayoutMode'
import {useShowLiveScoresAccessory} from '@/hooks/useShowLiveScoresAccessory'
import {useHasNewForumPosts} from '@/lib/forumActivity'
import {useHasSupportActivity} from '@/lib/supportUnread'
import {
  getCompetitionPalette,
  isCanonicalCompetition,
} from '@/types/competition'
import {useAccount} from '@/hooks/useAccount'
import {useAnnouncements} from '@/hooks/useAnnouncements'
import {useBetting} from '@/hooks/useBetting'
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
  isAdminSupportTicketRemoteMessage,
  isAnnouncementRemoteMessage,
  isSupportTicketRemoteMessage,
  presentRemoteNotification,
  setAppBadgeCount,
} from '@/lib/notifications'
import {refreshSupportUnread, setSupportUnreadCount} from '@/lib/supportUnread'
import {
  refreshAdminSupportUnread,
  setAdminSupportUnreadCount,
} from '@/lib/adminSupportUnread'
import {useSupportTickets} from '@/hooks/useSupportTickets'
import {useAdminSupportTickets} from '@/hooks/useAdminSupportTickets'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getMessaging,
  onMessage,
  onTokenRefresh,
} from '@react-native-firebase/messaging'
import * as Notifications from 'expo-notifications'
import {NativeTabs} from 'expo-router/native-tabs'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {AppState, DynamicColorIOS, Platform, useColorScheme, View} from 'react-native'

export default function TabLayout() {
  const {t, i18n} = useTranslation()
  const colorScheme = useColorScheme() ?? 'light'
  const {state, dispatch} = useLeagueContext()
  const account = useAccount()
  const {refreshAccount} = useBetting()
  const {markRead, syncReads, getAnnouncements, getAnnouncement} =
    useAnnouncements()
  const {getUnreadCount: getSupportUnreadCount} = useSupportTickets()
  const {getUnreadCount: getAdminSupportUnreadCount} = useAdminSupportTickets()
  const {refreshForumActivity} = useForumActivitySync()
  const hasNewForumPosts = useHasNewForumPosts()
  const hasSupportActivity = useHasSupportActivity()
  const showMoreBadge =
    ((state.showForumFabBadge ?? true) && hasNewForumPosts) || hasSupportActivity
  const messageBadge =
    state.messageCount > 0
      ? state.messageCount > 99
        ? '99+'
        : String(state.messageCount)
      : undefined
  // Platform.select evaluates every branch; DynamicColorIOS throws off iOS.
  const tintColor =
    Platform.OS === 'ios'
      ? DynamicColorIOS({
          light: isCanonicalCompetition(state.competition)
            ? '#0a7ea4'
            : getCompetitionPalette(state.competition, false).accent,
          dark: isCanonicalCompetition(state.competition)
            ? '#fff'
            : getCompetitionPalette(state.competition, true).accent,
        })
      : isCanonicalCompetition(state.competition)
        ? colorScheme === 'dark'
          ? '#fff'
          : '#0a7ea4'
        : getCompetitionPalette(state.competition, colorScheme === 'dark').accent

  React.useEffect(() => {
    refreshForumActivity()
  }, [refreshForumActivity])
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

  // Restore betting opt-in / balance from DB after login or reinstall.
  React.useEffect(() => {
    if (!state.user?.id) return
    void refreshAccount()
  }, [state.user?.id, refreshAccount])

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

  // Load support unread on startup so menu and quick-action badges are current.
  React.useEffect(() => {
    if (!isMounted) {
      return
    }
    if (!state.user?.id) {
      setSupportUnreadCount(0)
      setAdminSupportUnreadCount(0)
      return
    }
    void refreshSupportUnread(getSupportUnreadCount)
    if (isLeagueAdmin(state.user)) {
      void refreshAdminSupportUnread(getAdminSupportUnreadCount)
    } else {
      setAdminSupportUnreadCount(0)
    }
  }, [
    isMounted,
    state.user,
    getSupportUnreadCount,
    getAdminSupportUnreadCount,
  ])

  // Refresh unread whenever the app returns to foreground
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        if (state.user?.id) {
          syncUnreadFromServer()
          void refreshSupportUnread(getSupportUnreadCount)
          if (isLeagueAdmin(state.user)) {
            void refreshAdminSupportUnread(getAdminSupportUnreadCount)
          }
        }
        if (!showLanguageOption) {
          checkUnreadAnnouncements()
        }
      }
    })

    return () => subscription.remove()
  }, [
    state.user,
    showLanguageOption,
    syncUnreadFromServer,
    checkUnreadAnnouncements,
    getSupportUnreadCount,
    getAdminSupportUnreadCount,
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

        if (isAdminSupportTicketRemoteMessage(remoteMessage)) {
          await presentRemoteNotification(remoteMessage)
          if (state.user?.id && isLeagueAdmin(state.user)) {
            await refreshAdminSupportUnread(getAdminSupportUnreadCount)
          }
          return
        }

        if (isSupportTicketRemoteMessage(remoteMessage)) {
          await presentRemoteNotification(remoteMessage)
          if (state.user?.id) {
            await refreshSupportUnread(getSupportUnreadCount)
          }
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
  }, [
    state.user?.id,
    syncUnreadFromServer,
    checkUnreadAnnouncements,
    getSupportUnreadCount,
  ])

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
    <LiveScoresProvider>
      <CompetitionValidator />
      <CompetitionPickerModal />
      <AnnouncementDialog
        announcement={unreadAnnouncement}
        visible={showAnnouncementDialog && !showLanguageOption}
        submitting={markingAnnouncementRead}
        onDismiss={handleAnnouncementDismiss}
      />
      <TimezoneMismatchDialog />
      {showLanguageOption ? (
        <View className="flex-1 justify-center mx-4">
          <LanguageOption handleLanguageOption={handleLanguageOption} />
        </View>
      ) : (
        <TabsWithLiveScoresAccessory
          tintColor={tintColor}
          messageBadge={messageBadge}
          showMoreBadge={showMoreBadge}
          t={t}
          showCompetitionAccessory={!isCanonicalCompetition(state.competition)}
        />
      )}
    </LiveScoresProvider>
  )
}

// Density-scaled (~25pt). Large FAB PNGs are treated as 1x → enormous in NativeTabs.
const QUICK_ACTIONS_TAB_ICON = require('../../../assets/images/tab-quick-actions.png')

function TabsWithLiveScoresAccessory({
  tintColor,
  messageBadge,
  showMoreBadge,
  t,
  showCompetitionAccessory,
}: {
  tintColor: React.ComponentProps<typeof NativeTabs>['tintColor']
  messageBadge: string | undefined
  showMoreBadge: boolean
  t: (key: string) => string
  showCompetitionAccessory: boolean
}) {
  const showLiveAccessory = useShowLiveScoresAccessory()
  // Bar phones: center FAB-style quick actions. Regular (Duo/iPad): system More look.
  // Trigger order stays static — reordering NativeTabs children remounts/crashes the host.
  const isRegular = useIsRegularLayout()

  return (
    <NativeTabs tintColor={tintColor} minimizeBehavior="onScrollDown">
      {/* Empty BottomAccessory reserves a blank bar — only mount with content. */}
      {showLiveAccessory ? (
        <NativeTabs.BottomAccessory>
          <LiveScoresBottomAccessory />
        </NativeTabs.BottomAccessory>
      ) : showCompetitionAccessory ? (
        <NativeTabs.BottomAccessory>
          <CompetitionBottomAccessory />
        </NativeTabs.BottomAccessory>
      ) : null}
      <NativeTabs.Trigger name="(index)">
        <NativeTabs.Trigger.Icon
          sf={{default: 'house', selected: 'house.fill'}}
          md={{default: 'home', selected: 'home_filled'}}
        />
        <NativeTabs.Trigger.Label>{t('home')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="statistics">
        <NativeTabs.Trigger.Icon
          sf={{default: 'chart.bar', selected: 'chart.bar.fill'}}
          md={{default: 'bar_chart', selected: 'bar_chart'}}
        />
        <NativeTabs.Trigger.Label>{t('statistics')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      {/* Center slot: quick actions (compact icon) / More (regular). */}
      <NativeTabs.Trigger
        name="more"
        role={isRegular ? 'more' : undefined}
        accessibilityLabel={t('quick_actions')}
        // expo-router does not map renderingMode → Android tinting; Material then
        // SRC_IN-tints src icons and the multicolor asset disappears into the bar.
        unstable_nativeProps={
          !isRegular
            ? {
                android: {
                  icon: {
                    type: 'imageSource',
                    imageSource: QUICK_ACTIONS_TAB_ICON,
                    tinting: 'original',
                  },
                  selectedIcon: {
                    type: 'imageSource',
                    imageSource: QUICK_ACTIONS_TAB_ICON,
                    tinting: 'original',
                  },
                },
              }
            : undefined
        }>
        {isRegular ? (
          <NativeTabs.Trigger.Icon
            sf={{
              default: 'ellipsis.circle',
              selected: 'ellipsis.circle.fill',
            }}
            md={{default: 'more_horiz', selected: 'more_horiz'}}
          />
        ) : (
          <NativeTabs.Trigger.Icon
            src={QUICK_ACTIONS_TAB_ICON}
            renderingMode="original"
          />
        )}
        {isRegular ? (
          <NativeTabs.Trigger.Label>{t('quick_actions')}</NativeTabs.Trigger.Label>
        ) : (
          <NativeTabs.Trigger.Label hidden>
            {t('quick_actions')}
          </NativeTabs.Trigger.Label>
        )}
        {showMoreBadge ? <NativeTabs.Trigger.Badge /> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="completed">
        <NativeTabs.Trigger.Icon
          sf={{
            default: 'checkmark.circle',
            selected: 'checkmark.circle.fill',
          }}
          md={{default: 'check_circle', selected: 'check_circle'}}
        />
        <NativeTabs.Trigger.Label>{t('completed')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <NativeTabs.Trigger.Icon
          sf={{default: 'envelope', selected: 'envelope.fill'}}
          md={{default: 'mail', selected: 'mail'}}
        />
        <NativeTabs.Trigger.Label>{t('messages')}</NativeTabs.Trigger.Label>
        {messageBadge ? (
          <NativeTabs.Trigger.Badge>{messageBadge}</NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
