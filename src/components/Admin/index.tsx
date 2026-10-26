import NavDest from '@/components/NavDest'
import {useAdminSupportTickets} from '@/hooks/useAdminSupportTickets'
import {
  refreshAdminSupportUnread,
  useAdminSupportUnreadCount,
} from '@/lib/adminSupportUnread'
import * as Sentry from '@sentry/react-native'
import {useFocusEffect, useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Button, View} from 'react-native'

export default function Admin() {
  const navigation = useNavigation()
  const {t} = useTranslation()
  const {getUnreadCount} = useAdminSupportTickets()
  const unreadCount = useAdminSupportUnreadCount()

  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: t('admin'),
    })
  }, [navigation, t])

  useFocusEffect(
    React.useCallback(() => {
      void refreshAdminSupportUnread(getUnreadCount)
    }, [getUnreadCount]),
  )

  return (
    <View>
      <NavDest
        icon="lifebuoy"
        text={t('admin_support')}
        url="/Settings/Admin/Support"
        iconColor="#0EA5E9"
        iconBackground="rgba(14, 165, 233, 0.15)"
        messageCount={unreadCount}
      />
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
      <Button
        title="Test Sentry"
        onPress={() => Sentry.captureException(new Error('Test Sentry'))}
      />
    </View>
  )
}
