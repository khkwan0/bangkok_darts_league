import {Stack} from 'expo-router'
import {CompetitionSwitcher} from '@/components/navigation/CompetitionSwitcher'
import {SettingsButton} from '@/components/navigation/SettingsButton'
import {useStackContentSafeStyle} from '@/hooks/useStackContentSafeStyle'
import {useTranslation} from 'react-i18next'

export default function MoreLayout() {
  const {t} = useTranslation()
  const contentStyle = useStackContentSafeStyle()
  return (
    <Stack screenOptions={{contentStyle}}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerTitle: () => <CompetitionSwitcher />,
          headerRight: () => <SettingsButton />,
          // Custom headerTitle leaves iOS with the route name ("index") otherwise.
          headerBackTitle: t('quick_actions'),
        }}
      />
    </Stack>
  )
}
