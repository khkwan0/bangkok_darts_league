import NotificationOptions from '@/components/Preferences/NotificationOptions'
import {useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'

export default function Notifications() {
  const {t} = useTranslation()
  const navigation = useNavigation()

  React.useEffect(() => {
    navigation.setOptions({title: t('notifications')})
  }, [t])
  return <NotificationOptions />
}
