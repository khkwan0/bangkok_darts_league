import {Stack} from 'expo-router'
import {CompetitionSwitcher} from '@/components/navigation/CompetitionSwitcher'
import {SettingsButton} from '@/components/navigation/SettingsButton'

export default function CompletedLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => <CompetitionSwitcher />,
          headerRight: () => <SettingsButton />,
        }}
      />
      <Stack.Screen
        name="Match/index"
        options={{headerRight: () => <SettingsButton />}}
      />
    </Stack>
  )
}
