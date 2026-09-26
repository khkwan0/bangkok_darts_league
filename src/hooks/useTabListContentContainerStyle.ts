import {useTabContentBottomInset} from '@/hooks/useTabContentBottomInset'
import {useSegments} from 'expo-router'
import {StyleSheet, type StyleProp, type ViewStyle} from 'react-native'

function useIsTabScreen() {
  const segments = useSegments()
  return segments[0] === '(tabs)'
}

export function useTabListContentContainerStyle(
  style?: StyleProp<ViewStyle>,
): ViewStyle {
  const isTabScreen = useIsTabScreen()
  const tabBottomInset = useTabContentBottomInset()
  const flat = StyleSheet.flatten(style) ?? {}
  const existingPadding =
    typeof flat.paddingBottom === 'number' ? flat.paddingBottom : 0

  return {
    ...flat,
    paddingBottom: existingPadding + (isTabScreen ? tabBottomInset : 0),
  }
}
