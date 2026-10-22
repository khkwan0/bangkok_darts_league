import {useSafeAreaInsets} from 'react-native-safe-area-context'
import type {ViewStyle} from 'react-native'

/**
 * Per-edge horizontal padding so content clears Duo’s vertical side rail
 * (and Split View’s opposite edge). Never collapse left/right into one value.
 */
export function useContentSafePadding(
  extra: {left?: number; right?: number} = {},
): Pick<ViewStyle, 'paddingLeft' | 'paddingRight'> {
  const insets = useSafeAreaInsets()
  return {
    paddingLeft: insets.left + (extra.left ?? 0),
    paddingRight: insets.right + (extra.right ?? 0),
  }
}
