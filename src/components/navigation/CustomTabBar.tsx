import {Colors} from '@/constants/Colors'
import {CompetitionModeBanner} from '@/components/navigation/CompetitionModeBanner'
import {TabActionSheet} from '@/components/navigation/TabActionSheet'
import {
  TAB_FAB_RING_SIZE,
  TAB_FAB_SIZE,
} from '@/components/navigation/tabBarMetrics'
import {useLeagueContext} from '@/context/LeagueContext'
import {useForumActivitySync} from '@/hooks/useForumActivity'
import {useSupportTickets} from '@/hooks/useSupportTickets'
import {useAdminSupportTickets} from '@/hooks/useAdminSupportTickets'
import {useHasNewForumPosts} from '@/lib/forumActivity'
import {refreshSupportUnread, useHasSupportActivity} from '@/lib/supportUnread'
import {refreshAdminSupportUnread} from '@/lib/adminSupportUnread'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {
  getCompetitionPalette,
  isCanonicalCompetition,
} from '@/types/competition'
import {
  type BottomTabBarProps,
  type BottomTabNavigationOptions,
} from "expo-router/js-tabs"
import {PlatformPressable} from "expo-router/react-navigation"
import {BottomSheetModal} from '@expo/ui/community/bottom-sheet'
import * as Haptics from 'expo-haptics'
import React from 'react'
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {useTranslation} from 'react-i18next'

type TabBarItemProps = {
  route: BottomTabBarProps['state']['routes'][number]
  index: number
  isFocused: boolean
  options: BottomTabNavigationOptions
  onPress: () => void
  onLongPress: () => void
  colors: (typeof Colors)['light']
  adjacentToFab?: 'left' | 'right'
}

function TabBarItem({
  route,
  isFocused,
  options,
  onPress,
  onLongPress,
  colors,
  adjacentToFab,
}: TabBarItemProps) {
  const color = isFocused ? colors.tabIconSelected : colors.tabIconDefault
  const label =
    options.tabBarLabel !== undefined
      ? typeof options.tabBarLabel === 'string'
        ? options.tabBarLabel
        : options.tabBarLabel({
            focused: isFocused,
            color,
            position: 'below-icon',
            children: route.name,
          })
      : options.title !== undefined
        ? options.title
        : route.name

  const badge = options.tabBarBadge

  return (
    <PlatformPressable
      accessibilityRole="button"
      accessibilityState={isFocused ? {selected: true} : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarButtonTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.tabItem,
        adjacentToFab === 'left' && styles.tabItemFabLeft,
        adjacentToFab === 'right' && styles.tabItemFabRight,
      ]}>
      {options.tabBarIcon?.({focused: isFocused, color, size: 28})}
      {typeof label === 'string' ? (
        <Text style={[styles.label, {color}]} numberOfLines={1}>
          {label}
        </Text>
      ) : (
        label
      )}
      {badge != null && badge !== false ? (
        <View style={[styles.badge, options.tabBarBadgeStyle]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </PlatformPressable>
  )
}

export function CustomTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  const sheetRef = React.useRef<BottomSheetModal>(null)
  const {state: leagueState} = useLeagueContext()
  const {t} = useTranslation()
  const {refreshForumActivity} = useForumActivitySync()
  const {getUnreadCount: getSupportUnreadCount} = useSupportTickets()
  const {getUnreadCount: getAdminSupportUnreadCount} = useAdminSupportTickets()
  const hasNewForumPosts = useHasNewForumPosts()
  const hasSupportActivity = useHasSupportActivity()
  const showForumFabBadge =
    (leagueState.showForumFabBadge ?? true) && hasNewForumPosts
  const showFabBadge = showForumFabBadge || hasSupportActivity
  const messageBadge =
    leagueState.messageCount > 0 ? String(leagueState.messageCount) : undefined
  const canonical = isCanonicalCompetition(leagueState.competition)
  const competitionAccent = getCompetitionPalette(
    leagueState.competition,
    colorScheme === 'dark',
  ).accent
  const fabBorderColor = canonical
    ? colors.buttonBackground
    : competitionAccent

  const isTabVisible = React.useCallback(
    (routeKey: string) => {
      const {options} = descriptors[routeKey]
      if ((options as {hidden?: boolean}).hidden === true) {
        return false
      }
      const itemStyle = StyleSheet.flatten(options.tabBarItemStyle ?? {})
      return itemStyle.display !== 'none'
    },
    [descriptors],
  )

  const fabAdjacentIndices = React.useMemo(() => {
    const visibleIndices = state.routes.reduce<number[]>((indices, route, index) => {
      if (isTabVisible(route.key)) {
        indices.push(index)
      }
      return indices
    }, [])

    const center = Math.floor(visibleIndices.length / 2)
    return {
      left: visibleIndices[center - 1],
      right: visibleIndices[center],
    }
  }, [state.routes, isTabVisible])

  const openSheet = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    refreshForumActivity()
    void refreshSupportUnread(getSupportUnreadCount)
    if (isLeagueAdmin(leagueState.user)) {
      void refreshAdminSupportUnread(getAdminSupportUnreadCount)
    }
    sheetRef.current?.present()
  }

  const renderRoute = (
    route: BottomTabBarProps['state']['routes'][number],
    index: number,
  ) => {
    const {options} = descriptors[route.key]
    const isFocused = state.index === index
    const adjacentToFab =
      index === fabAdjacentIndices.left
        ? 'left'
        : index === fabAdjacentIndices.right
          ? 'right'
          : undefined

    const onPress = () => {
      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }

      // SDK 58 tabBar props: emitter + navigateToTab (navigation removed).
      const event = emitter.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      })

      if (!isFocused && !event.defaultPrevented) {
        navigateToTab(route.key)
      }
    }

    const onLongPress = () => {
      emitter.emit({
        type: 'tabLongPress',
        target: route.key,
      })
    }

    const isMessagesTab = route.name === 'messages'
    const optionsWithBadge: BottomTabNavigationOptions = isMessagesTab
      ? {
          ...options,
          tabBarBadge: messageBadge,
          tabBarBadgeStyle: messageBadge
            ? {backgroundColor: '#ef4444'}
            : undefined,
        }
      : options

    return (
      <TabBarItem
        key={route.key}
        route={route}
        index={index}
        isFocused={isFocused}
        options={optionsWithBadge}
        onPress={onPress}
        onLongPress={onLongPress}
        colors={colors}
        adjacentToFab={adjacentToFab}
      />
    )
  }

  return (
    <>
      <CompetitionModeBanner />
      <View
        style={[
          styles.container,
          {
            paddingBottom: insets.bottom,
            backgroundColor: colors.background,
            borderTopColor: canonical
              ? colorScheme === 'dark'
                ? '#333'
                : '#e5e5e5'
              : competitionAccent,
            borderTopWidth: canonical ? StyleSheet.hairlineWidth : 2,
          },
        ]}>
        {state.routes.map((route, index) => {
          if (!isTabVisible(route.key)) {
            return null
          }
          return renderRoute(route, index)
        })}

        <View
          style={[styles.fabOverlay, {bottom: insets.bottom + 4}]}
          pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showForumFabBadge && hasSupportActivity
                ? t('quick_actions_forum_and_support')
                : showForumFabBadge
                  ? t('forums_quick_actions_new_posts')
                  : hasSupportActivity
                    ? t('support_quick_actions_unread')
                    : t('quick_actions')
            }
            onPress={openSheet}
            style={({pressed}) => [
              styles.fabButton,
              pressed && styles.fabButtonPressed,
            ]}>
            <View
              style={[
                styles.fabRing,
                {
                  borderColor: fabBorderColor,
                  backgroundColor: '#111',
                },
              ]}>
              <View style={styles.fab}>
                <Image
                  source={require('../../../assets/images/fab-dartboard.png')}
                  style={styles.fabIcon}
                  resizeMode="cover"
                />
              </View>
            </View>
            {showFabBadge ? (
              <View
                style={styles.fabBadge}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            ) : null}
          </Pressable>
        </View>
      </View>

      <TabActionSheet ref={sheetRef} />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 49,
    overflow: 'visible',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    minHeight: 49,
  },
  tabItemFabLeft: {
    paddingRight: TAB_FAB_RING_SIZE / 2 + 12,
  },
  tabItemFabRight: {
    paddingLeft: TAB_FAB_RING_SIZE / 2 + 12,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: '22%',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  fabOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    overflow: 'visible',
  },
  fabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  fabButtonPressed: {
    transform: [{scale: 0.94}],
    opacity: 0.92,
  },
  fabBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  fabRing: {
    width: TAB_FAB_RING_SIZE,
    height: TAB_FAB_RING_SIZE,
    borderRadius: TAB_FAB_RING_SIZE / 2,
    borderWidth: 2,
    padding: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: TAB_FAB_SIZE,
    height: TAB_FAB_SIZE,
    borderRadius: TAB_FAB_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  fabIcon: {
    width: TAB_FAB_SIZE,
    height: TAB_FAB_SIZE,
    borderRadius: TAB_FAB_SIZE / 2,
  },
})
