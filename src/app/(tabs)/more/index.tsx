import {QuickActionsContent} from '@/components/navigation/QuickActionsContent'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import {useNavigation} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'

/**
 * Quick Actions as a normal tab screen — no sheet, no selection hop.
 */
export default function MoreTabScreen() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const listContentStyle = useTabListContentContainerStyle()

  React.useEffect(() => {
    navigation.setOptions({title: t('quick_actions')})
  }, [navigation, t])

  return <QuickActionsContent contentContainerStyle={listContentStyle} />
}
