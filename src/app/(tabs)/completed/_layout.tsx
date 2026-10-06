import {Stack} from 'expo-router'
import {CompetitionSwitcher} from '@/components/navigation/CompetitionSwitcher'
import {SettingsButton} from '@/components/navigation/SettingsButton'
import {StatsScopeProvider} from '@/context/StatsScopeContext'
import {useTranslation} from 'react-i18next'

export default function CompletedLayout() {
  const {t} = useTranslation()

  return (
    <StatsScopeProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerTitle: () => <CompetitionSwitcher />,
            headerRight: () => <SettingsButton />,
            // Custom headerTitle leaves iOS with the route name ("index") otherwise.
            headerBackTitle: t('completed'),
          }}
        />
        <Stack.Screen
          name="all/index"
          options={{
            title: t('completed_all'),
            headerBackTitle: t('completed'),
          }}
        />
        <Stack.Screen
          name="Match/index"
          options={{headerRight: () => <SettingsButton />}}
        />
      </Stack>
    </StatsScopeProvider>
  )
}
