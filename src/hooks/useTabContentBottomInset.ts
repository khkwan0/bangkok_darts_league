import {
  getTabFabOverflowInset,
  LIVE_SCORES_ACCESSORY_HEIGHT,
} from '@/components/navigation/tabBarMetrics'
import {useShowLiveScoresAccessory} from '@/hooks/useShowLiveScoresAccessory'
import {useIsRegularLayout} from '@/hooks/useLayoutMode'

/**
 * Bottom padding for tab scroll content.
 * Clears the elevated quick-action FAB, and when the live-score BottomAccessory
 * is showing on compact (bar) phones, clears that bar too. Regular/Duo uses
 * the inline accessory in the tab rail, so no extra vertical inset there.
 */
export function useTabContentBottomInset(extra = 28) {
  const showLiveAccessory = useShowLiveScoresAccessory()
  const isRegular = useIsRegularLayout()
  const liveInset =
    showLiveAccessory && !isRegular ? LIVE_SCORES_ACCESSORY_HEIGHT : 0
  return getTabFabOverflowInset(extra) + liveInset
}
