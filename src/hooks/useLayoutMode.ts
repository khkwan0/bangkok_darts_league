import {REGULAR_WIDTH_BREAKPOINT} from '@/lib/layout/constants'
import {useWindowDimensions} from 'react-native'

export type LayoutMode = 'compact' | 'regular'

/**
 * Size-class style layout mode from window width (not Device.deviceType).
 * compact = bar phone / Duo cover / narrow Split View
 * regular = unfolded Duo inner / iPad / wide window
 */
export function useLayoutMode(): LayoutMode {
  const {width} = useWindowDimensions()
  return width >= REGULAR_WIDTH_BREAKPOINT ? 'regular' : 'compact'
}

export function useIsRegularLayout(): boolean {
  return useLayoutMode() === 'regular'
}
