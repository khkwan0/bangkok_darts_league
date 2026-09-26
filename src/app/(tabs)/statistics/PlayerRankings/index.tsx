import PlayerRankings from '@/components/Statistics/PlayerRankings'
import {useLocalSearchParams, useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'

export default function PlayerRankingsScreen() {
  const params = useLocalSearchParams()
  const navigation = useNavigation()
  const {t} = useTranslation()

  // Parse optional query parameters
  const season =
    params.season !== undefined
      ? typeof params.season === 'string'
        ? parseInt(params.season, 10)
        : params.season
      : undefined

  const divisionId =
    params.division_id !== undefined
      ? typeof params.division_id === 'string'
        ? parseInt(params.division_id, 10)
        : params.division_id
      : undefined

  React.useEffect(() => {
    navigation.setOptions({
      title: t('player_rankings'),
      headerBackTitle: t('back'),
    })
  }, [navigation, t])

  return <PlayerRankings season={season} divisionId={divisionId} />
}

