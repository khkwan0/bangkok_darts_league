import {Colors} from '@/constants/Colors'
import {useLeagueContext} from '@/context/LeagueContext'
import {NavigationBar} from 'expo-navigation-bar'
import * as SystemUI from 'expo-system-ui'
import {useEffect} from 'react'
import {AppState, Platform, useColorScheme} from 'react-native'

/**
 * Applies the user's Android system navigation bar preference (visible by
 * default; optionally hidden from Settings → Preferences → Interface) and keeps
 * residual chrome aligned with app light/dark themes when a hidden bar briefly
 * reappears (e.g. after a bottom-edge swipe).
 *
 * Avoid the declarative `<NavigationBar />` component: its unmount path always
 * calls `setHidden`, which rejects with "current activity is no longer available"
 * during backgrounding / Fast Refresh / activity teardown.
 */
export function SystemNavigationBar() {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  const {state} = useLeagueContext()
  const hidden = state.hideSystemNavBar === true

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return
    }

    const apply = () => {
      if (AppState.currentState !== 'active') {
        return
      }

      try {
        NavigationBar.setHidden(hidden)
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
  }, [colorScheme, colors.background, hidden])

  return null
}
