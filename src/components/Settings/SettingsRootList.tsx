import AppSwitch from '@/components/AppSwitch'
import NavDest from '@/components/NavDest'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {useAccount} from '@/hooks/useAccount'
import {useAdminSupportTickets} from '@/hooks/useAdminSupportTickets'
import {useBetting} from '@/hooks/useBetting'
import {useSettingsSplitLayout} from '@/hooks/useSettingsSplitLayout'
import {useSupportTickets} from '@/hooks/useSupportTickets'
import {
  refreshAdminSupportUnread,
  useAdminSupportUnreadCount,
} from '@/lib/adminSupportUnread'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {
  refreshSupportUnread,
  useSupportUnreadCount,
} from '@/lib/supportUnread'
import config from '@/config.js'
import Feather from '@expo/vector-icons/Feather'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useFocusEffect, usePathname, useRouter} from 'expo-router'
import {useTheme} from 'expo-router/react-navigation'
import React, {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {
  Alert,
  Appearance,
  Image,
  Platform,
  Pressable,
  ScrollView,
  useColorScheme,
  View,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

const SectionHeader = ({title}: {title: string}) => {
  const {colors} = useTheme()
  return (
    <View className="mt-6 mb-2 border-b border-gray-600">
      <Text
        className="text-sm uppercase tracking-wider mb-1"
        style={{color: colors.primary}}>
        {title}
      </Text>
    </View>
  )
}

function isSettingsHref(url: string): boolean {
  return url === '/Settings' || url.startsWith('/Settings/')
}

function hrefIsSelected(pathname: string, url: string): boolean {
  if (!url || !isSettingsHref(url)) return false
  if (pathname === url) return true
  // Keep parent row highlighted while nested (e.g. Preferences/Profile).
  return pathname.startsWith(`${url}/`)
}

type Props = {
  /** When true, show a pane title (split sidebar has no stack header). */
  showPaneTitle?: boolean
}

export function SettingsRootList({showPaneTitle = false}: Props) {
  const {colors} = useTheme()
  const {state, dispatch, openCompetitionPicker} = useLeagueContext()
  const [isDark, setIsDark] = useState(useColorScheme() === 'dark')
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const pathname = usePathname()
  const isSplit = useSettingsSplitLayout()
  const {t} = useTranslation()
  const account = useAccount()
  const {refreshAccount, optIn} = useBetting()
  const {getUnreadCount: getAdminSupportUnread} = useAdminSupportTickets()
  const adminSupportUnread = useAdminSupportUnreadCount()
  const {getUnreadCount: getSupportUnread} = useSupportTickets()
  const supportUnread = useSupportUnreadCount()
  const buildTapRef = React.useRef({
    count: 0,
    timer: null as ReturnType<typeof setTimeout> | null,
  })
  const [logoutPressed, setLogoutPressed] = useState(false)

  const user = state.user
  const competition = state.competition

  const openHref = React.useCallback(
    (url: string) => {
      if (!url) return
      if (isSplit && isSettingsHref(url)) {
        // Pop the detail stack to Settings root, then open the selection fresh.
        if (router.canDismiss()) {
          router.dismissTo('/Settings')
        }
        router.push(url as any)
        return
      }
      router.push(url as any)
    },
    [isSplit, router],
  )

  const refreshSidebarBadges = React.useCallback(() => {
    if (user?.id) {
      void refreshSupportUnread(getSupportUnread)
      void refreshAccount()
    }
    if (!isLeagueAdmin(user)) {
      return
    }
    void refreshAdminSupportUnread(getAdminSupportUnread)
  }, [refreshAccount, getAdminSupportUnread, getSupportUnread, user])

  // Compact: index screen focus. Split: list lives outside the stack, so also refresh on mount.
  useFocusEffect(
    React.useCallback(() => {
      refreshSidebarBadges()
    }, [refreshSidebarBadges]),
  )
  React.useEffect(() => {
    if (!isSplit) return
    refreshSidebarBadges()
  }, [isSplit, refreshSidebarBadges])

  function HandleBuildTap() {
    if (!user?.id || state.bettingOptedIn || !state.bettingEnabled) return
    const ref = buildTapRef.current
    if (ref.timer) clearTimeout(ref.timer)
    ref.count += 1
    ref.timer = setTimeout(() => {
      ref.count = 0
      ref.timer = null
    }, 2000)
    if (ref.count < 8) return
    ref.count = 0
    if (ref.timer) {
      clearTimeout(ref.timer)
      ref.timer = null
    }
    Alert.alert(t('betting_opt_in_title'), t('betting_opt_in_body'), [
      {text: t('betting_opt_in_cancel'), style: 'cancel'},
      {
        text: t('betting_opt_in_confirm'),
        onPress: async () => {
          const res = await optIn()
          if (res && 'error' in res) {
            Alert.alert(t('betting_opt_in_failed'))
          }
        },
      },
    ])
  }

  async function ToggleTheme(value: boolean) {
    try {
      setIsDark(value)
      await AsyncStorage.setItem('theme', value ? 'dark' : 'light')
    } catch (e) {
      console.log(e)
    }
  }

  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      Appearance.setColorScheme(isDark ? 'dark' : 'light')
    }
  }, [isDark])

  React.useEffect(() => {
    async function GetUnreadMessageCount() {
      const count = await account.GetUnreadMessageCount()
      dispatch({type: 'SET_MESSAGE_COUNT', payload: count})
    }
    GetUnreadMessageCount()
  }, [])

  async function HandleLogout() {
    try {
      await AsyncStorage.removeItem('jwt')
      await AsyncStorage.removeItem('user')
      dispatch({type: 'DEL_USER'})
    } catch (e) {
      console.error('Error removing token:', e)
    }
  }

  const teamsUrl =
    competition?.type === 'mini'
      ? `/teams/mini-leagues/${competition.id}`
      : '/teams'

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
      }}>
      <View className="flex-1">
        {showPaneTitle ? (
          <Text className="mb-3 text-2xl font-bold">{t('settings')}</Text>
        ) : null}

        <View className="bg-gray-800/20 dark:bg-gray-200/20 rounded-xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Pressable onPress={HandleBuildTap} hitSlop={8}>
              <Text className="text-sm opacity-75">
                {t('build')} {config.build}
              </Text>
            </Pressable>
            <View className="flex-row items-center space-x-4 gap-x-2 bg-gray-800/30 rounded-lg p-2">
              <Feather name="sun" color={colors.text} size={18} />
              <AppSwitch value={isDark} onValueChange={ToggleTheme} />
              <MCI name="weather-night" color={colors.text} size={18} />
            </View>
          </View>
        </View>

        {typeof user.id !== 'undefined' && (
          <View className="bg-gray-800/20 dark:bg-gray-200/20 rounded-xl p-4 mb-4">
            <View className="flex-row items-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('press_image_to_update')}
                onPress={() => openHref('/Settings/Preferences/Profile')}
                className="items-center">
                <View className="h-24 w-24 rounded-full bg-gray-700/50 items-center justify-center overflow-hidden">
                  {user.profile_picture ? (
                    <Image
                      source={{uri: config.profileUrl + user.profile_picture}}
                      className="h-24 w-24"
                      resizeMode="cover"
                    />
                  ) : (
                    <MCI name="account" size={32} color={colors.text} />
                  )}
                </View>
                <Text className="text-xs mt-1.5 opacity-60 text-center max-w-24">
                  {t('press_image_to_update')}
                </Text>
              </Pressable>
              <View className="flex-1 ml-4">
                <Text className="text-lg font-semibold text-right">
                  {user.nickname}
                </Text>
                <Text className="text-sm opacity-60 text-right">
                  ID: {String(user.id)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {(typeof user?.id === 'undefined' || !user.id) && (
          <View className="my-4">
            <NavDest
              icon="login"
              text={t('login')}
              url="/Auth"
              iconColor="#0a7ea4"
              iconBackground="rgba(10, 126, 164, 0.12)"
              onPress={() => openHref('/Auth')}
            />
          </View>
        )}

        <NavDest
          icon="trophy-variant"
          text={t('achievements')}
          url="/Settings/Achievements"
          iconColor="#EAB308"
          iconBackground="rgba(234, 179, 8, 0.15)"
          selected={hrefIsSelected(pathname, '/Settings/Achievements')}
          onPress={() => openHref('/Settings/Achievements')}
        />
        <NavDest
          icon="robot-outline"
          text={t('ai_assistant')}
          url="/Settings/CueChat"
          iconColor="#9C27B0"
          iconBackground="rgba(156, 39, 176, 0.15)"
          selected={hrefIsSelected(pathname, '/Settings/CueChat')}
          onPress={() => openHref('/Settings/CueChat')}
        />
        <NavDest
          icon="lifebuoy"
          text={t('support')}
          url="/Settings/Support"
          iconColor="#0EA5E9"
          iconBackground="rgba(14, 165, 233, 0.15)"
          messageCount={supportUnread}
          selected={hrefIsSelected(pathname, '/Settings/Support')}
          onPress={() => openHref('/Settings/Support')}
        />

        <SectionHeader title={t('league_management')} />
        {isLeagueAdmin(user) && (
          <NavDest
            icon="account-group"
            text={t('admin')}
            url="/Settings/Admin"
            iconColor="#6366F1"
            iconBackground="rgba(99, 102, 241, 0.15)"
            messageCount={adminSupportUnread}
            selected={hrefIsSelected(pathname, '/Settings/Admin')}
            onPress={() => openHref('/Settings/Admin')}
          />
        )}
        <NavDest
          icon="account-group"
          text={t('teams')}
          url={teamsUrl}
          iconColor="#4CAF50"
          iconBackground="rgba(76, 175, 80, 0.15)"
          onPress={() => openHref(teamsUrl)}
        />
        <NavDest
          icon="trophy"
          text={t('tournaments')}
          url="/(tabs)/(index)/cups"
          iconColor="#B45309"
          iconBackground="rgba(180, 83, 9, 0.15)"
          onPress={() => openHref('/(tabs)/(index)/cups')}
        />
        <NavDest
          icon="bullhorn-outline"
          text={t('announcements')}
          url="/Settings/Announcements"
          iconColor="#FF9800"
          iconBackground="rgba(255, 152, 0, 0.15)"
          selected={hrefIsSelected(pathname, '/Settings/Announcements')}
          onPress={() => openHref('/Settings/Announcements')}
        />
        <NavDest
          icon="forum-outline"
          text={t('forums')}
          url="/Settings/Forums"
          iconColor="#2196F3"
          iconBackground="rgba(33, 150, 243, 0.15)"
          selected={hrefIsSelected(pathname, '/Settings/Forums')}
          onPress={() => openHref('/Settings/Forums')}
        />
        <NavDest
          icon="chart-areaspline-variant"
          text={t('statistics')}
          url="/statistics"
          iconColor="#2196F3"
          iconBackground="rgba(33, 150, 243, 0.15)"
          onPress={() => openHref('/statistics')}
        />
        <NavDest
          icon="trophy-outline"
          text={t('change_league')}
          url=""
          iconColor="#E91E63"
          iconBackground="rgba(233, 30, 99, 0.15)"
          onPress={() => openCompetitionPicker()}
        />
        <NavDest
          icon="information-outline"
          text={t('info_and_guides')}
          url="/Settings/Info"
          iconColor="#FF9800"
          iconBackground="rgba(255, 152, 0, 0.15)"
          selected={hrefIsSelected(pathname, '/Settings/Info')}
          onPress={() => openHref('/Settings/Info')}
        />

        <SectionHeader title={t('people_and_places')} />
        <NavDest
          icon="map-marker"
          text={t('venues')}
          url="/Settings/Venues"
          iconColor="#E91E63"
          iconBackground="rgba(233, 30, 99, 0.15)"
          selected={hrefIsSelected(pathname, '/Settings/Venues')}
          onPress={() => openHref('/Settings/Venues')}
        />
        <NavDest
          icon="account-outline"
          text={t('players')}
          url="/Settings/Players"
          iconColor="#3B82F6"
          iconBackground="rgba(59, 130, 246, 0.15)"
          selected={hrefIsSelected(pathname, '/Settings/Players')}
          onPress={() => openHref('/Settings/Players')}
        />

        <SectionHeader title={t('app_settings')} />
        <NavDest
          icon="hand-coin"
          text={t('coin_flip')}
          url="/Settings/CoinFlip"
          iconColor="#F59E0B"
          iconBackground="rgba(245, 158, 11, 0.15)"
          selected={hrefIsSelected(pathname, '/Settings/CoinFlip')}
          onPress={() => openHref('/Settings/CoinFlip')}
        />
        {state.bettingEnabled && state.bettingOptedIn ? (
          <NavDest
            icon="chart-line"
            text={t('betting_settings')}
            url="/Settings/Betting"
            iconColor="#10B981"
            iconBackground="rgba(16, 185, 129, 0.15)"
            selected={hrefIsSelected(pathname, '/Settings/Betting')}
            onPress={() => openHref('/Settings/Betting')}
          />
        ) : null}
        {state.predictionsEnabled ? (
          <NavDest
            icon="crystal-ball"
            text={t('predictions_settings')}
            url="/Settings/Predictions"
            iconColor="#0EA5E9"
            iconBackground="rgba(14, 165, 233, 0.15)"
            selected={hrefIsSelected(pathname, '/Settings/Predictions')}
            onPress={() => openHref('/Settings/Predictions')}
          />
        ) : null}
        <NavDest
          icon="cog"
          text={t('preferences')}
          url="/Settings/Preferences"
          iconColor={colors.primary}
          iconBackground={
            isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(10, 126, 164, 0.12)'
          }
          selected={hrefIsSelected(pathname, '/Settings/Preferences')}
          onPress={() => openHref('/Settings/Preferences')}
        />
      </View>

      <View className="mt-auto pb-4" style={{paddingBottom: insets.bottom}}>
        {typeof user?.id !== 'undefined' && user.id && (
          <Pressable
            accessibilityRole="button"
            onPressIn={() => setLogoutPressed(true)}
            onPressOut={() => setLogoutPressed(false)}
            onPress={HandleLogout}
            className="flex-row items-center rounded-lg py-3 px-4"
            style={{
              backgroundColor: logoutPressed
                ? 'rgba(239, 68, 68, 0.22)'
                : 'rgba(239, 68, 68, 0.10)',
              borderWidth: 1,
              borderColor: logoutPressed ? '#ef4444' : 'transparent',
              transform: [{scale: logoutPressed ? 0.985 : 1}],
            }}>
            <MCI name="logout" color="#ef4444" size={24} />
            <Text className="ml-4" style={{color: '#ef4444'}}>
              {t('logout')}
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  )
}
