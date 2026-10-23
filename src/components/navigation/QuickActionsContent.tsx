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
import {useRouter} from 'expo-router'
import React from 'react'
import {
  ScrollView,
  Text as RNText,
  useColorScheme,
  View as RNView,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import {Pressable} from 'react-native-gesture-handler'
import {useTranslation} from 'react-i18next'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={showBadge ? badgeLabel : undefined}
      android_ripple={{color: iconBackground}}
      onPress={onPress}
      style={({pressed}) => ({
        marginVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
        // Avoid setState-on-pressIn — that re-render delays navigation in __DEV__.
        backgroundColor: pressed ? iconBackground : 'transparent',
        borderColor: pressed ? iconColor : isDark ? '#334155' : '#e2e8f0',
        transform: [{scale: pressed ? 0.985 : 1}],
      })}>
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

type Props = {
  contentContainerStyle?: StyleProp<ViewStyle>
  /** When true, wrap in ScrollView (default for the More tab screen). */
  scroll?: boolean
}

/** Quick-actions list for the More tab screen. */
export function QuickActionsContent({
  contentContainerStyle,
  scroll = true,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  const router = useRouter()
  const {t} = useTranslation()
  const {state, openCompetitionPicker, LogoutUser} = useLeagueContext()
  const insets = useSafeAreaInsets()
  const user = state.user
  const hasNewForumPosts = useHasNewForumPosts()
  const hasUnreadAnnouncements = useHasUnreadAnnouncements()
  const hasUnreadSupport = useHasUnreadSupport()
  const hasSupportActivity = useHasSupportActivity()
  const competition = state.competition
  const loggedIn = Boolean(user?.id)

  const actionIds = React.useMemo(
    () => resolveFabQuickActions(state.user?.preferences?.fab_quick_actions),
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

  const go = (url: string) => {
    router.push(url as any)
  }

  const onPressAction = (id: QuickActionId) => {
    switch (id) {
      case 'support':
        go('/Settings/Support')
        break
      case 'announcements':
        go('/Settings/Announcements')
        break
      case 'forums':
        go('/Settings/Forums')
        break
      case 'achievements':
        go('/Settings/Achievements')
        break
      case 'ai_assistant':
        go('/Settings/CueChat')
        break
      case 'settings':
        go('/Settings')
        break
      case 'admin':
        go('/Settings/Admin')
        break
      case 'teams':
        if (competition?.type === 'mini') {
          go(`/teams/mini-leagues/${competition.id}`)
        } else {
          go('/teams')
        }
        break
      case 'tournaments':
        go('/(tabs)/(index)/cups')
        break
      case 'statistics':
        go('/statistics')
        break
      case 'coin_flip':
        go('/Settings/CoinFlip')
        break
      case 'change_league':
        openCompetitionPicker()
        break
      case 'info_and_guides':
        go('/Settings/Info')
        break
      case 'venues':
        go('/Settings/Venues')
        break
      case 'players':
        go('/Settings/Players')
        break
      case 'betting':
        go('/Settings/Betting')
        break
      case 'predictions':
        go('/Settings/Predictions')
        break
      case 'preferences':
        go('/Settings/Preferences')
        break
      case 'login':
        go('/Auth')
        break
      case 'logout':
        LogoutUser()
        break
    }
  }

  const badgeFor = (
    id: QuickActionId,
  ): {showBadge?: boolean; badgeLabel?: string} => {
    if (id === 'support') {
      return {showBadge: hasUnreadSupport, badgeLabel: t('support_new')}
    }
    if (id === 'announcements') {
      return {
        showBadge: hasUnreadAnnouncements,
        badgeLabel: t('announcements_new'),
      }
    }
    if (id === 'forums') {
      return {showBadge: hasNewForumPosts, badgeLabel: t('forums_new_posts')}
    }
    if (id === 'settings') {
      return {showBadge: hasSupportActivity, badgeLabel: t('support_new')}
    }
    return {}
  }

  const body = (
    <>
      <View className="mb-4">
        <View className="flex-row items-center justify-between">
          <Text type="subtitle">{t('quick_actions_title')}</Text>
          <Text className="text-sm opacity-60">
            {t('build')} {config.build}
          </Text>
        </View>
        <Text className="mt-1 text-sm opacity-60">
          {t('player_id')}:{' '}
          {typeof user?.id !== 'undefined' && user.id ? String(user.id) : '—'}
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
    </>
  )

  if (!scroll) {
    return <RNView style={contentContainerStyle}>{body}</RNView>
  }

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.background}}
      contentContainerStyle={[
        {
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
        },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled">
      {body}
    </ScrollView>
  )
}
