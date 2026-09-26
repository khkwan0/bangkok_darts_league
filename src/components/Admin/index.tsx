import NavDest from '@/components/NavDest'
import * as Sentry from '@sentry/react-native'
import {useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Button, View} from 'react-native'

export default function Admin() {
  const navigation = useNavigation()
  const {t} = useTranslation()

  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: t('admin'),
    })
  }, [])

  return (
    <View>
      <NavDest
        icon="bullhorn-outline"
        text={t('announcements')}
        url="/Settings/Admin/Announcements"
      />
      <NavDest
        icon="robot-outline"
        text={t('admin_ai_agent')}
        url="/Settings/Admin/AiAgent"
      />
      <NavDest
        icon="email"
        text="Login As Other User"
        url="/Settings/Admin/LoginAsOtherUser"
      />
      <NavDest
        icon="server"
        text="Domain Settings"
        url="/Settings/Admin/DomainSettings"
      />
      <Button title="Test Sentry" onPress={() => Sentry.captureException(new Error('Test Sentry'))} />
    </View>
  )
}
