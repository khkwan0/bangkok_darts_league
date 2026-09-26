import {Stack} from 'expo-router'
import {CompetitionSwitcher} from '@/components/navigation/CompetitionSwitcher'
import {SettingsButton} from '@/components/navigation/SettingsButton'

export default function MatchLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerRight: () => <SettingsButton />,
          headerTitle: () => <CompetitionSwitcher />,
        }}
      />
      <Stack.Screen
        name="Match/index"
        options={{headerRight: () => <SettingsButton />}}
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
