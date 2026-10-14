import PlayerStatistics from '@/components/PlayerStatistics'
import {StatsScopeProvider} from '@/context/StatsScopeContext'
import {useLeague} from '@/hooks/useLeague'
import {useLocalSearchParams, useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
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

function resolvePlayerId(raw: Record<string, unknown>): number | null {
  const direct = raw.playerId
  if (typeof direct === 'string' || typeof direct === 'number') {
    const n = Number(direct)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const bundled = raw.params
  if (typeof bundled === 'string') {
    try {
      const parsed = JSON.parse(bundled) as {playerId?: number | string}
      const n = Number(parsed?.playerId)
      return Number.isFinite(n) && n > 0 ? n : null
    } catch {
      return null
    }
  }
  return null
}

export default function HomePlayerStats() {
  const raw = useLocalSearchParams()
  const playerId = resolvePlayerId(raw as Record<string, unknown>)
  const league = useLeague()
  const [playerInfo, setPlayerInfo] = React.useState<PlayerInfo | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const navigation = useNavigation()
  const {t} = useTranslation()

  React.useEffect(() => {
    navigation.setOptions({
      title: playerInfo?.name || t('player_statistics'),
      headerBackTitle: t('back'),
    })
  }, [navigation, playerInfo, t])

  React.useEffect(() => {
    if (!playerId) return
    let cancelled = false
    ;(async () => {
      try {
        setIsLoading(true)
        const info = await league.GetPlayerStatsInfo(playerId)
        if (!cancelled) setPlayerInfo(info)
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [playerId])

  if (!playerId || isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (playerInfo) {
    return (
      <StatsScopeProvider>
        <PlayerStatistics playerInfo={playerInfo} path={undefined} />
      </StatsScopeProvider>
    )
  }

  return null
}
