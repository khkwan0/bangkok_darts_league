import {Colors} from '@/constants/Colors'
import {NavigationBar} from 'expo-navigation-bar'
import * as SystemUI from 'expo-system-ui'
import {useEffect} from 'react'
import {Platform, useColorScheme} from 'react-native'

/**
 * Keeps the Android system navigation bar aligned with app light/dark themes.
 * `auto` → dark icons on light backgrounds, light icons on dark backgrounds.
 * Background uses expo-system-ui (SDK 57 navigation bar API is style-only).
 */
export function SystemNavigationBar() {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return
    }

    NavigationBar.setStyle('auto')
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {})
  }, [colorScheme, colors.background])

  if (Platform.OS !== 'android') {
    return null
  }

  return <NavigationBar style="auto" />
}
