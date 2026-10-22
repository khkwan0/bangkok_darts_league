import {Stack} from 'expo-router'
import {useStackContentSafeStyle} from '@/hooks/useStackContentSafeStyle'
import {useTranslation} from 'react-i18next'

export default function MoreLayout() {
  const {t} = useTranslation()
  const contentStyle = useStackContentSafeStyle()
  return (
    <Stack screenOptions={{contentStyle}}>
      <Stack.Screen
        name="index"
        options={{title: t('quick_actions'), headerShown: true}}
      />
    </Stack>
  )
}
