import NavDest from '@/components/NavDest'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {useNavigation, useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {ScrollView, View} from 'react-native'

export default function AdminLeagueHub() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const {state} = useLeagueContext()
  const isDarts = state.sport === 'darts'

  React.useEffect(() => {
    navigation.setOptions({title: t('admin_league')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings' as any)
    }
  }, [router, state.user])

  if (!isLeagueAdmin(state.user)) {
    return null
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 pb-10">
      <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        {t('admin_league_hub_help')}
      </Text>
      <View>
        <NavDest
          icon="calendar-plus"
          text={t('admin_league_seasons')}
          url="/Settings/Admin/League/Seasons"
        />
        <NavDest
          icon="gamepad-variant-outline"
          text={t('admin_league_game_types')}
          url="/Settings/Admin/League/GameTypes"
        />
        {!isDarts ? (
          <NavDest
            icon="puzzle-outline"
            text={t('admin_league_frame_types')}
            url="/Settings/Admin/League/FrameTypes"
          />
        ) : null}
        <NavDest
          icon="target"
          text={t('admin_league_formats')}
          url="/Settings/Admin/League/Formats"
        />
        <NavDest
          icon="format-list-bulleted"
          text={t('admin_league_divisions')}
          url="/Settings/Admin/League/Divisions"
        />
        <NavDest
          icon="account-group-outline"
          text={t('admin_league_teams')}
          url="/Settings/Admin/League/Teams"
        />
      </View>
    </ScrollView>
  )
}
