import PlayerStatistics from '@/components/PlayerStatistics'
import {ThemedText} from '@/components/ThemedText'
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
  const fromId = raw.id
  if (typeof fromId === 'string' || typeof fromId === 'number') {
    const n = Number(fromId)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const direct = raw.playerId
  if (typeof direct === 'string' || typeof direct === 'number') {
    const n = Number(direct)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return null
}

/** Deep-link destination for https://darts.bkkleague.com/player/{id}. */
export default function PlayerDeepLinkScreen() {
  const raw = useLocalSearchParams()
  const playerId = resolvePlayerId(raw as Record<string, unknown>)
  const league = useLeague()
  const [playerInfo, setPlayerInfo] = React.useState<PlayerInfo | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const navigation = useNavigation()
  const {t} = useTranslation()

  React.useEffect(() => {
    navigation.setOptions({
      title: playerInfo?.name || t('player_profile'),
      headerBackTitle: t('back'),
    })
  }, [navigation, playerInfo, t])

  React.useEffect(() => {
    if (!playerId) {
      setFailed(true)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setIsLoading(true)
        setFailed(false)
        const info = await league.GetPlayerStatsInfo(playerId)
        if (!cancelled) {
          if (info) {
            setPlayerInfo(info)
          } else {
            setFailed(true)
          }
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) setFailed(true)
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

  if (failed || !playerInfo) {
    return (
      <View className="flex-1 justify-center items-center px-6">
        <ThemedText className="text-center opacity-70">
          {t('player_not_found')}
        </ThemedText>
      </View>
    )
  }

  return (
    <StatsScopeProvider>
      <PlayerStatistics playerInfo={playerInfo} path="/player" />
    </StatsScopeProvider>
  )
}
