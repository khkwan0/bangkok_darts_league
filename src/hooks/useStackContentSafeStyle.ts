import {useContentSafePadding} from '@/hooks/useContentSafePadding'
import type {ViewStyle} from 'react-native'

/**
 * Stack `contentStyle` that keeps screen bodies clear of Duo’s side rail
 * (and Split View’s opposite edge). Apply via screenOptions on tab stacks.
 */
export function useStackContentSafeStyle(
  extra?: ViewStyle,
): ViewStyle {
  const horizontal = useContentSafePadding()
  return {
    ...extra,
    ...horizontal,
  }
}
