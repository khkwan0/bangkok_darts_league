import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {Colors} from '@/constants/Colors'
import config from '@/config.js'
import {useLeagueContext} from '@/context/LeagueContext'
import {useHasNewForumPosts} from '@/lib/forumActivity'
import {useHasUnreadAnnouncements} from '@/lib/announcementUnread'
import {useHasSupportActivity, useHasUnreadSupport} from '@/lib/supportUnread'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {
  QUICK_ACTION_DEFS,
  resolveFabQuickActions,
  type QuickActionId,
} from '@/lib/quickActions'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@expo/ui/community/bottom-sheet'
import {useRouter} from 'expo-router'
import React from 'react'
import {
  Platform,
  Pressable,
  Text as RNText,
  useColorScheme,
  useWindowDimensions,
  View as RNView,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

/** iOS onDismiss can fire before the sheet animation finishes (expo/expo#48389). */
const SHEET_DISMISS_NAV_DELAY_MS = Platform.OS === 'ios' ? 300 : 0

export type QuickActionsSheetHandle = {
  present: () => void
  dismiss: () => void
}

type QuickActionItemProps = {
  icon: React.ComponentProps<typeof MCI>['name']
  label: string
  iconColor: string
  iconBackground: string
  onPress: () => void
  showBadge?: boolean
  badgeLabel?: string
}

function QuickActionItem({
  icon,
  label,
  iconColor,
  iconBackground,
  onPress,
  showBadge,
  badgeLabel,
}: QuickActionItemProps) {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  const isDark = colorScheme === 'dark'
  const [pressed, setPressed] = React.useState(false)

  return (
    <Pressable
      className="my-2 flex-row items-center overflow-hidden rounded-xl border px-3 py-3"
      accessibilityRole="button"
      accessibilityHint={showBadge ? badgeLabel : undefined}
      android_ripple={{color: iconBackground}}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      style={{
        backgroundColor: pressed ? iconBackground : 'transparent',
        borderColor: pressed ? iconColor : isDark ? '#334155' : '#e2e8f0',
        transform: [{scale: pressed ? 0.985 : 1}],
      }}>
      <RNView className="relative mr-4">
        <View
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{backgroundColor: iconBackground}}>
          <MCI name={icon} color={iconColor} size={24} />
        </View>
        {showBadge ? (
          <RNView
            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : null}
      </RNView>
      <Text className="flex-1 font-bold">{label}</Text>
      {showBadge && badgeLabel ? (
        <RNView className="mr-2 rounded-full bg-red-500 px-2 py-0.5">
          <RNText className="text-xs font-bold text-white">{badgeLabel}</RNText>
        </RNView>
      ) : null}
      <MCI name="chevron-right" color={colors.icon} size={22} />
    </Pressable>
  )
}

/**
 * Quick actions as a bottom sheet on every layout (including Duo landscape).
 * A side Modal fights NativeTabs focus/selection — keep one presentation.
 */
export const TabActionSheet = React.forwardRef<QuickActionsSheetHandle>(
  function TabActionSheet(_props, ref) {
    const colorScheme = useColorScheme() ?? 'light'
    const colors = Colors[colorScheme]
    const router = useRouter()
    const {t} = useTranslation()
    const {state, openCompetitionPicker, LogoutUser} = useLeagueContext()
    const insets = useSafeAreaInsets()
    const {height: windowHeight} = useWindowDimensions()
    const user = state.user
    const hasNewForumPosts = useHasNewForumPosts()
    const hasUnreadAnnouncements = useHasUnreadAnnouncements()
    const hasUnreadSupport = useHasUnreadSupport()
    const hasSupportActivity = useHasSupportActivity()
    const competition = state.competition
    const loggedIn = Boolean(user?.id)
    const sheetRef = React.useRef<BottomSheetModal>(null)

    const actionIds = React.useMemo(
      () =>
        resolveFabQuickActions(state.user?.preferences?.fab_quick_actions),
      [state.user?.preferences?.fab_quick_actions],
    )

    const visibleIds = React.useMemo(() => {
      return actionIds.filter(id => {
        if (id === 'admin') return isLeagueAdmin(user)
        if (id === 'betting') {
          return state.bettingEnabled && state.bettingOptedIn
        }
        if (id === 'predictions') return state.predictionsEnabled
        if (id === 'login') return !loggedIn
        if (id === 'logout') return loggedIn
        return true
      })
    }, [
      actionIds,
      user,
      state.bettingEnabled,
      state.bettingOptedIn,
      state.predictionsEnabled,
      loggedIn,
    ])

    const snapPoints = React.useMemo(() => {
      const estimatedContentHeight =
        160 + visibleIds.length * 72 + Math.max(insets.bottom, 16)
      const minOpenRatio = 0.65
      const maxOpenRatio = windowHeight < 700 ? 0.82 : 0.88
      const ratio = Math.min(
        maxOpenRatio,
        Math.max(minOpenRatio, estimatedContentHeight / windowHeight),
      )
      return [`${Math.round(ratio * 100)}%`]
    }, [insets.bottom, windowHeight, visibleIds.length])

    const pendingRouteRef = React.useRef<string | null>(null)
    const navTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
      null,
    )

    React.useEffect(() => {
      return () => {
        if (navTimeoutRef.current) {
          clearTimeout(navTimeoutRef.current)
        }
      }
    }, [])

    React.useImperativeHandle(
      ref,
      () => ({
        present: () => {
          sheetRef.current?.present()
        },
        dismiss: () => {
          sheetRef.current?.dismiss()
        },
      }),
      [],
    )

    const navigate = (url: string) => {
      pendingRouteRef.current = url
      sheetRef.current?.dismiss()
    }

    const handleSheetDismiss = () => {
      const url = pendingRouteRef.current
      pendingRouteRef.current = null
      if (!url) {
        return
      }
      if (navTimeoutRef.current) {
        clearTimeout(navTimeoutRef.current)
      }
      const go = () => {
        navTimeoutRef.current = null
        router.push(url as any)
      }
      if (SHEET_DISMISS_NAV_DELAY_MS > 0) {
        navTimeoutRef.current = setTimeout(go, SHEET_DISMISS_NAV_DELAY_MS)
      } else {
        go()
      }
    }

    const dismissThen = (fn: () => void) => {
      pendingRouteRef.current = null
      sheetRef.current?.dismiss()
      if (SHEET_DISMISS_NAV_DELAY_MS > 0) {
        setTimeout(fn, SHEET_DISMISS_NAV_DELAY_MS)
      } else {
        fn()
      }
    }

    const onPressAction = (id: QuickActionId) => {
      switch (id) {
        case 'support':
          navigate('/Settings/Support')
          break
        case 'announcements':
          navigate('/Settings/Announcements')
          break
        case 'forums':
          navigate('/Settings/Forums')
          break
        case 'achievements':
          navigate('/Settings/Achievements')
          break
        case 'ai_assistant':
          navigate('/Settings/CueChat')
          break
        case 'settings':
          navigate('/Settings')
          break
        case 'admin':
          navigate('/Settings/Admin')
          break
        case 'teams':
          if (competition?.type === 'mini') {
            navigate(`/teams/mini-leagues/${competition.id}`)
          } else {
            navigate('/teams')
          }
          break
        case 'tournaments':
          navigate('/(tabs)/(index)/cups')
          break
        case 'statistics':
          navigate('/statistics')
          break
        case 'coin_flip':
          navigate('/Settings/CoinFlip')
          break
        case 'change_league':
          dismissThen(() => openCompetitionPicker())
          break
        case 'info_and_guides':
          navigate('/Settings/Info')
          break
        case 'venues':
          navigate('/Settings/Venues')
          break
        case 'players':
          navigate('/Settings/Players')
          break
        case 'betting':
          navigate('/Settings/Betting')
          break
        case 'predictions':
          navigate('/Settings/Predictions')
          break
        case 'preferences':
          navigate('/Settings/Preferences')
          break
        case 'login':
          navigate('/Auth')
          break
        case 'logout':
          dismissThen(() => LogoutUser())
          break
      }
    }

    const badgeFor = (
      id: QuickActionId,
    ): {showBadge?: boolean; badgeLabel?: string} => {
      if (id === 'support') {
        return {
          showBadge: hasUnreadSupport,
          badgeLabel: t('support_new'),
        }
      }
      if (id === 'announcements') {
        return {
          showBadge: hasUnreadAnnouncements,
          badgeLabel: t('announcements_new'),
        }
      }
      if (id === 'forums') {
        return {
          showBadge: hasNewForumPosts,
          badgeLabel: t('forums_new_posts'),
        }
      }
      if (id === 'settings') {
        return {
          showBadge: hasSupportActivity,
          badgeLabel: t('support_new'),
        }
      }
      return {}
    }

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        onDismiss={handleSheetDismiss}
        backgroundStyle={{backgroundColor: colors.background}}>
        <BottomSheetScrollView
          style={{flex: 1}}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
            flexGrow: 0,
          }}
          showsVerticalScrollIndicator
          persistentScrollbar={Platform.OS === 'android'}
          indicatorStyle={colorScheme === 'dark' ? 'white' : 'black'}
          bounces
          alwaysBounceVertical={Platform.OS === 'ios'}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled">
          <View className="mb-4">
            <View className="flex-row items-center justify-between">
              <Text type="subtitle">{t('quick_actions_title')}</Text>
              <Text className="text-sm opacity-60">
                {t('build')} {config.build}
              </Text>
            </View>
            <Text className="mt-1 text-sm opacity-60">
              {t('player_id')}:{' '}
              {typeof user?.id !== 'undefined' && user.id
                ? String(user.id)
                : '—'}
            </Text>
          </View>
          {visibleIds.map(id => {
            const def = QUICK_ACTION_DEFS[id]
            const badge = badgeFor(id)
            const iconColor =
              id === 'settings' || id === 'preferences'
                ? colors.tint
                : def.iconColor
            const iconBackground =
              id === 'settings' || id === 'preferences'
                ? colorScheme === 'dark'
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(10, 126, 164, 0.12)'
                : def.iconBackground
            return (
              <QuickActionItem
                key={id}
                icon={def.icon}
                label={t(def.labelKey)}
                iconColor={iconColor}
                iconBackground={iconBackground}
                showBadge={badge.showBadge}
                badgeLabel={badge.badgeLabel}
                onPress={() => onPressAction(id)}
              />
            )
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>
    )
  },
)
