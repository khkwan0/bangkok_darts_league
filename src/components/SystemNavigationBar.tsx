import {Colors} from '@/constants/Colors'
import {NavigationBar} from 'expo-navigation-bar'
import * as SystemUI from 'expo-system-ui'
import {useEffect} from 'react'
import {AppState, Platform, useColorScheme} from 'react-native'

/**
 * Hides the Android system navigation bar and keeps residual chrome
 * aligned with app light/dark themes when the bar briefly reappears
 * (e.g. after a bottom-edge swipe).
 *
 * Avoid the declarative `<NavigationBar />` component: its unmount path always
 * calls `setHidden`, which rejects with "current activity is no longer available"
 * during backgrounding / Fast Refresh / activity teardown.
 */
export function SystemNavigationBar() {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return
    }

    const apply = () => {
      if (AppState.currentState !== 'active') {
        return
      }

      try {
        NavigationBar.setHidden(true)
        NavigationBar.setStyle('auto')
      } catch {
        // Activity may already be gone.
      }
      void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {})
    }

    apply()

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        apply()
      }
    })

    return () => sub.remove()
  }, [colorScheme, colors.background])

  return null
}
