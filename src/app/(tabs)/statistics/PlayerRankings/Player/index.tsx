import PlayerStatistics from '@/components/PlayerStatistics'
import {useLeague} from '@/hooks/useLeague'
import {useLocalSearchParams, useNavigation} from 'expo-router'
import React from 'react'
import {ActivityIndicator, View} from 'react-native'
interface PlayerInfo {
  player_id: number
  name?: string
  firstname?: string
  lastname?: string
  nationality?: {en: string}
  flag?: string
  profile_picture?: string
  gender?: string
  pic?: string | null
}

export default function PlayerStats() {
  const {params} = useLocalSearchParams()
  const {playerId} = JSON.parse(params as string)
  const league = useLeague()
  const [playerInfo, setPlayerInfo] = React.useState<PlayerInfo | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const navigation = useNavigation()
  async function getPlayerInfo(playerId: number) {
    try {
      setIsLoading(true)
      const info = await league.GetPlayerStatsInfo(playerId)
      setPlayerInfo(info)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    if (playerId) {
      getPlayerInfo(playerId)
    }
  }, [playerId])

  React.useEffect(() => {
    navigation.setOptions({
      title: playerInfo?.name,
    })
  }, [playerInfo])

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    )
  } else if (playerInfo) {
    return <PlayerStatistics playerInfo={playerInfo} />
  }
}

