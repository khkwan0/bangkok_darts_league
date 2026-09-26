import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {Colors} from '@/constants/Colors'
import config from '@/config.js'
import {useLeagueContext} from '@/context/LeagueContext'
import {useHasNewForumPosts} from '@/lib/forumActivity'
import {useHasUnreadAnnouncements} from '@/lib/announcementUnread'
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

export const TabActionSheet = React.forwardRef<BottomSheetModal>(
  function TabActionSheet(_props, ref) {
    const colorScheme = useColorScheme() ?? 'light'
    const colors = Colors[colorScheme]
    const router = useRouter()
    const {t} = useTranslation()
    const {state, openCompetitionPicker} = useLeagueContext()
    const insets = useSafeAreaInsets()
    const {height: windowHeight} = useWindowDimensions()
    const user = state.user
    const hasNewForumPosts = useHasNewForumPosts()
    const hasUnreadAnnouncements = useHasUnreadAnnouncements()
    const competition = state.competition
    // Cap height so short phones (SE, etc.) always get scrollable overflow.
    const snapPoints = React.useMemo(() => {
      const estimatedContentHeight = 760 + Math.max(insets.bottom, 16)
      const minOpenRatio = 0.65
      const maxOpenRatio = windowHeight < 700 ? 0.82 : 0.88
      const ratio = Math.min(
        maxOpenRatio,
        Math.max(minOpenRatio, estimatedContentHeight / windowHeight),
      )
      return [`${Math.round(ratio * 100)}%`]
    }, [insets.bottom, windowHeight])
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

    const navigate = (url: string) => {
      pendingRouteRef.current = url
      if (ref && 'current' in ref && ref.current) {
        ref.current.dismiss()
        return
      }
      pendingRouteRef.current = null
      router.push(url as any)
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

    return (
      <BottomSheetModal
        ref={ref}
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
            // Don't flexGrow — that expands content to fill and can hide overflow.
            flexGrow: 0,
          }}
          showsVerticalScrollIndicator
          // Android: keep bar visible. iOS: indicator still shows while scrolling.
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
          <QuickActionItem
            icon="bullhorn-outline"
            label={t('announcements')}
            iconColor="#FF9800"
            iconBackground="rgba(255, 152, 0, 0.15)"
            showBadge={hasUnreadAnnouncements}
            badgeLabel={t('announcements_new')}
            onPress={() => navigate('/Settings/Announcements')}
          />
          <QuickActionItem
            icon="forum-outline"
            label={t('forums')}
            iconColor="#2196F3"
            iconBackground="rgba(33, 150, 243, 0.15)"
            showBadge={hasNewForumPosts}
            badgeLabel={t('forums_new_posts')}
            onPress={() => navigate('/Settings/Forums')}
          />
          <QuickActionItem
            icon="robot-outline"
            label={t('ai_assistant')}
            iconColor="#9C27B0"
            iconBackground="rgba(156, 39, 176, 0.15)"
            onPress={() => navigate('/Settings/CueChat')}
          />
          <QuickActionItem
            icon="cog"
            label={t('settings')}
            iconColor={colors.tint}
            iconBackground={
              colorScheme === 'dark'
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(10, 126, 164, 0.12)'
            }
            onPress={() => navigate('/Settings')}
          />
          <QuickActionItem
            icon="account-group"
            label={t('teams')}
            iconColor="#4CAF50"
            iconBackground="rgba(76, 175, 80, 0.15)"
            onPress={() => {
              if (competition.type === 'mini') {
                navigate(`/teams/mini-leagues/${competition.id}`)
              } else {
                navigate('/teams')
              }
            }}
          />
          <QuickActionItem
            icon="trophy"
            label={t('tournaments')}
            iconColor="#B45309"
            iconBackground="rgba(180, 83, 9, 0.15)"
            onPress={() => navigate('/(tabs)/(index)/cups')}
          />
          <QuickActionItem
            icon="hand-coin"
            label={t('coin_flip')}
            iconColor="#F59E0B"
            iconBackground="rgba(245, 158, 11, 0.15)"
            onPress={() => navigate('/Settings/CoinFlip')}
          />
          <QuickActionItem
            icon="trophy-outline"
            label={t('change_league')}
            iconColor="#E91E63"
            iconBackground="rgba(233, 30, 99, 0.15)"
            onPress={() => {
              pendingRouteRef.current = null
              if (ref && 'current' in ref && ref.current) {
                ref.current.dismiss()
              }
              const open = () => openCompetitionPicker()
              if (SHEET_DISMISS_NAV_DELAY_MS > 0) {
                setTimeout(open, SHEET_DISMISS_NAV_DELAY_MS)
              } else {
                open()
              }
            }}
          />
          <QuickActionItem
            icon="information-outline"
            label={t('info_and_guides')}
            iconColor="#FF9800"
            iconBackground="rgba(255, 152, 0, 0.15)"
            onPress={() => navigate('/Settings/Info')}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    )
  },
)
