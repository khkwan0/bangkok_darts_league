import {AdaptiveSplit} from '@/components/layout/AdaptiveSplit'
import {SettingsRootList} from '@/components/Settings/SettingsRootList'
import {useContentSafePadding} from '@/hooks/useContentSafePadding'
import {useSettingsSplitLayout} from '@/hooks/useSettingsSplitLayout'
import {useStackContentSafeStyle} from '@/hooks/useStackContentSafeStyle'
import {settingsHeaderTitleKey} from '@/lib/settingsHeaderTitle'
import {Stack, useNavigation, usePathname} from 'expo-router'
import {useLayoutEffect} from 'react'
import {useTranslation} from 'react-i18next'
import {Platform, View} from 'react-native'

export default function SettingsLayout() {
  const {t} = useTranslation()
  const isSplit = useSettingsSplitLayout()
  const contentStyle = useStackContentSafeStyle()
  const horizontalSafe = useContentSafePadding()
  const pathname = usePathname()
  const parentNavigation = useNavigation()

  // iOS Stack-in-Stack only paints the outer (root) header. Keep its title in
  // sync with the focused Settings route. Android uses this nested stack's headers.
  useLayoutEffect(() => {
    if (Platform.OS !== 'ios') {
      return
    }
    parentNavigation.setOptions({
      title: t(settingsHeaderTitleKey(pathname)),
      headerBackTitle: t('back'),
    })
  }, [parentNavigation, pathname, t])

  const stack = (
    <Stack
      screenOptions={{
        headerShown: Platform.OS !== 'ios',
        headerBackTitle: t('back'),
        // When split, the outer wrapper already applies Duo rail insets.
        contentStyle: isSplit ? undefined : contentStyle,
      }}>
      <Stack.Screen name="index" options={{title: t('settings')}} />
    </Stack>
  )

  if (!isSplit) {
    return stack
  }

  return (
    <View style={[{flex: 1}, horizontalSafe]}>
      <AdaptiveSplit
        split
        listWidth={360}
        list={<SettingsRootList showPaneTitle />}
        detail={stack}
      />
    </View>
  )
}
