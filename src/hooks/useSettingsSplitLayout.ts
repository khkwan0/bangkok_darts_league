import {useIsRegularLayout} from '@/hooks/useLayoutMode'
import {useWindowDimensions} from 'react-native'

/**
 * Settings master-detail: regular width + landscape (open Duo / iPad landscape).
 */
export function useSettingsSplitLayout(): boolean {
  const isRegular = useIsRegularLayout()
  const {width, height} = useWindowDimensions()
  return isRegular && width > height
}
