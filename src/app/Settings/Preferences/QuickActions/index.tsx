import QuickActionsPreference from '@/components/Preferences/QuickActionsPreference'
import React from 'react'
import {ScrollView} from 'react-native'
import {useNavigation} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {useTheme} from 'expo-router/react-navigation'

export default function QuickActionsScreen() {
  const navigation = useNavigation()
  const {t} = useTranslation()
  const {colors} = useTheme()

  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: t('fab_quick_actions_settings'),
    })
  }, [t, navigation])

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.background}}
      contentContainerStyle={{paddingBottom: 32}}>
      <QuickActionsPreference />
    </ScrollView>
  )
}
