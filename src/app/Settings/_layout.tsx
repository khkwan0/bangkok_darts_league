import {AdaptiveSplit} from '@/components/layout/AdaptiveSplit'
import {SettingsRootList} from '@/components/Settings/SettingsRootList'
import {useContentSafePadding} from '@/hooks/useContentSafePadding'
import {useSettingsSplitLayout} from '@/hooks/useSettingsSplitLayout'
import {useStackContentSafeStyle} from '@/hooks/useStackContentSafeStyle'
import {Stack} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {View} from 'react-native'

export default function SettingsLayout() {
  const {t} = useTranslation()
  const isSplit = useSettingsSplitLayout()
  const contentStyle = useStackContentSafeStyle()
  const horizontalSafe = useContentSafePadding()

  const stack = (
    <Stack
      screenOptions={{
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
