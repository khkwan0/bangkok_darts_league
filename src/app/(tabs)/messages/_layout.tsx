import {Stack} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {SettingsButton} from '@/components/navigation/SettingsButton'

export default function MessagesLayout() {
  const {t} = useTranslation()
  return (
    <Stack
      screenOptions={{
        headerRight: () => <SettingsButton />,
      }}>
      <Stack.Screen
        name="index"
        options={{headerShown: true, title: t('messages')}}
      />
      <Stack.Screen
        name="[playerId]/index"
        options={{headerShown: true, title: t('messages')}}
      />
      <Stack.Screen
        name="threadId/index"
        options={{headerShown: true, title: t('messages')}}
      />
    </Stack>
  )
}

