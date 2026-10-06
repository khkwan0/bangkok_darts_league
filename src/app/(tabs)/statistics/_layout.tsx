import {Stack} from 'expo-router'
import {CompetitionSwitcher} from '@/components/navigation/CompetitionSwitcher'
import {SettingsButton} from '@/components/navigation/SettingsButton'
import {StatsScopeProvider} from '@/context/StatsScopeContext'

export default function StatisticsLayout() {
  return (
    <StatsScopeProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerTitle: () => <CompetitionSwitcher />,
            headerRight: () => <SettingsButton />,
          }}
        />
      </Stack>
    </StatsScopeProvider>
  )
}
