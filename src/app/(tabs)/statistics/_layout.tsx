import {Stack} from 'expo-router'
import {CompetitionSwitcher} from '@/components/navigation/CompetitionSwitcher'
import {SettingsButton} from '@/components/navigation/SettingsButton'
import {StatsScopeProvider} from '@/context/StatsScopeContext'
import {useTranslation} from 'react-i18next'

export const unstable_settings = {
  anchor: 'index',
}

export default function StatisticsLayout() {
  const {t} = useTranslation()

  return (
    <StatsScopeProvider>
      <Stack
        screenOptions={{
          headerBackTitle: t('back'),
        }}>
        <Stack.Screen
          name="index"
          options={{
            headerTitle: () => <CompetitionSwitcher />,
            headerRight: () => <SettingsButton />,
          }}
        />
        <Stack.Screen
          name="LeagueStandings/index"
          options={{
            title: t('league_standings'),
          }}
        />
        <Stack.Screen
          name="TeamStatistics/index"
          options={{
            title: t('team_statistics'),
          }}
        />
        <Stack.Screen
          name="PlayerStatistics/index"
          options={{
            title: t('player_statistics'),
          }}
        />
        <Stack.Screen
          name="PlayerRankings/index"
          options={{
            title: t('player_rankings'),
          }}
        />
        <Stack.Screen
          name="Highlights/index"
          options={{
            title: t('highlights'),
          }}
        />
      </Stack>
    </StatsScopeProvider>
  )
}
