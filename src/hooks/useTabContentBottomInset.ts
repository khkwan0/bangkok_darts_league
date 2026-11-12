import {
  getTabFabOverflowInset,
  LIVE_SCORES_ACCESSORY_HEIGHT,
} from '@/components/navigation/tabBarMetrics'
import {useTabBarVisibility} from '@/context/TabBarVisibilityContext'
import {useShowLiveScoresAccessory} from '@/hooks/useShowLiveScoresAccessory'
import {useIsRegularLayout} from '@/hooks/useLayoutMode'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

/**
 * Bottom padding for tab scroll content.
 * Clears the elevated quick-action FAB, and when the live-score BottomAccessory
 * is showing on compact (bar) phones, clears that bar too. Regular/Duo uses
 * the inline accessory in the tab rail, so no extra vertical inset there.
 * When the native tab bar is hidden, only the home-indicator safe area remains.
 */
export function useTabContentBottomInset(extra = 28) {
  const {hidden: tabBarHidden} = useTabBarVisibility()
  const insets = useSafeAreaInsets()
  const showLiveAccessory = useShowLiveScoresAccessory()
  const isRegular = useIsRegularLayout()
  if (tabBarHidden) {
    return Math.max(insets.bottom, 12)
  }
  const liveInset =
    showLiveAccessory && !isRegular ? LIVE_SCORES_ACCESSORY_HEIGHT : 0
  return getTabFabOverflowInset(extra) + liveInset
}
