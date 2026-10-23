import {SettingsButton} from '@/components/navigation/SettingsButton'
import {useStackContentSafeStyle} from '@/hooks/useStackContentSafeStyle'
import {Stack, useNavigation, usePathname} from 'expo-router'
import {useLayoutEffect} from 'react'
import {useTranslation} from 'react-i18next'
import {Platform} from 'react-native'

function teamsHeaderTitleKey(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/teams'
  if (path.includes('/create-match')) return 'create_match'
  if (path.includes('/copy')) return 'add_from_league'
  if (path.includes('/settings')) return 'settings'
  if (path.includes('/players')) return 'players'
  if (path.includes('/team/')) return 'roster'
  if (/\/mini-leagues\/[^/]+\/teams$/.test(path)) return 'teams'
  if (/\/mini-leagues\/[^/]+$/.test(path)) return 'mini_league'
  if (path.includes('/mini-leagues')) return 'mini_leagues'
  return 'teams'
}

export default function TeamsLayout() {
  const {t} = useTranslation()
  const contentStyle = useStackContentSafeStyle()
  const pathname = usePathname()
  const parentNavigation = useNavigation()

  useLayoutEffect(() => {
    if (Platform.OS !== 'ios') {
      return
    }
    parentNavigation.setOptions({
      title: t(teamsHeaderTitleKey(pathname)),
      headerBackTitle: t('back'),
    })
  }, [parentNavigation, pathname, t])

  const nestedHeader = Platform.OS !== 'ios'

  return (
    <Stack
      screenOptions={{
        headerShown: nestedHeader,
        headerRight: () => <SettingsButton />,
        contentStyle,
        headerBackTitle: t('back'),
      }}>
      <Stack.Screen
        name="index"
        options={{headerShown: nestedHeader, title: t('teams')}}
      />
      <Stack.Screen
        name="mini-leagues/index"
        options={{headerShown: nestedHeader, title: t('mini_leagues')}}
      />
      <Stack.Screen
        name="mini-leagues/[id]/index"
        options={{headerShown: nestedHeader, title: t('mini_league')}}
      />
      <Stack.Screen
        name="mini-leagues/[id]/players"
        options={{headerShown: nestedHeader, title: t('players')}}
      />
      <Stack.Screen
        name="mini-leagues/[id]/teams"
        options={{headerShown: nestedHeader, title: t('teams')}}
      />
      <Stack.Screen
        name="mini-leagues/[id]/team/[teamId]"
        options={{headerShown: nestedHeader, title: t('roster')}}
      />
      <Stack.Screen
        name="mini-leagues/[id]/create-match"
        options={{headerShown: nestedHeader, title: t('create_match')}}
      />
      <Stack.Screen
        name="mini-leagues/[id]/copy"
        options={{headerShown: nestedHeader, title: t('add_from_league')}}
      />
      <Stack.Screen
        name="mini-leagues/[id]/settings"
        options={{headerShown: nestedHeader, title: t('settings')}}
      />
    </Stack>
  )
}
