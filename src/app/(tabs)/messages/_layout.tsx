import {Stack} from 'expo-router'
import {CompetitionSwitcher} from '@/components/navigation/CompetitionSwitcher'
import {SettingsButton} from '@/components/navigation/SettingsButton'
import {useStackContentSafeStyle} from '@/hooks/useStackContentSafeStyle'
import {useTranslation} from 'react-i18next'

export default function MessagesLayout() {
  const {t} = useTranslation()
  const contentStyle = useStackContentSafeStyle()
  return (
    <Stack
      screenOptions={{
        headerRight: () => <SettingsButton />,
        contentStyle,
      }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerTitle: () => <CompetitionSwitcher />,
          // Custom headerTitle leaves iOS with the route name ("index") otherwise.
          title: t('messages'),
          headerBackTitle: t('messages'),
        }}
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

