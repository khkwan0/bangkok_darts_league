import {Stack} from 'expo-router'
import {CompetitionSwitcher} from '@/components/navigation/CompetitionSwitcher'
import {SettingsButton} from '@/components/navigation/SettingsButton'
import {useTranslation} from 'react-i18next'

export default function MatchLayout() {
  const {t} = useTranslation()

  return (
    <Stack
      screenOptions={{
        headerBackTitle: t('back'),
      }}>
      <Stack.Screen
        name="index"
        options={{
          // String title is what iOS uses for the back button when headerTitle is custom.
          title: t('back'),
          headerRight: () => <SettingsButton />,
          headerTitle: () => <CompetitionSwitcher />,
          headerBackTitle: t('back'),
        }}
      />
      <Stack.Screen
        name="Player/index"
        options={{
          title: t('player_statistics'),
          headerBackTitle: t('back'),
        }}
      />
      <Stack.Screen
        name="Match/index"
        options={{
          headerRight: () => <SettingsButton />,
          headerBackTitle: t('back'),
        }}
      />
      <Stack.Screen
        name="Betting/[matchId]"
        options={{
          title: 'Betting',
          headerRight: () => <SettingsButton />,
          headerBackTitle: t('back'),
        }}
      />
      <Stack.Screen
        name="Predictions/[matchId]"
        options={{
          title: t('predictions_title'),
          headerRight: () => <SettingsButton />,
          headerBackTitle: t('back'),
        }}
      />
      <Stack.Screen
        name="PostponeScreen/index"
        options={{headerRight: () => <SettingsButton />}}
      />
      <Stack.Screen
        name="cups/index"
        options={{
          title: 'Tournaments',
          headerRight: () => <SettingsButton />,
        }}
      />
      <Stack.Screen
        name="cups/[id]"
        options={{
          title: 'Tournament bracket',
          headerRight: () => <SettingsButton />,
        }}
      />
      <Stack.Screen
        name="cups/manage/index"
        options={{
          title: 'Manage tournaments',
          headerRight: () => <SettingsButton />,
        }}
      />
      <Stack.Screen
        name="cups/manage/create"
        options={{
          title: 'Create tournament',
          headerRight: () => <SettingsButton />,
        }}
      />
      <Stack.Screen
        name="cups/manage/[tournamentId]"
        options={{
          title: 'Tournament admin',
          headerRight: () => <SettingsButton />,
        }}
      />
    </Stack>
  )
}
