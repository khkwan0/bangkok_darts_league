/* eslint-disable react-hooks/exhaustive-deps */
import PlayerStatistics from '@/components/PlayerStatistics'
import StatShortcuts from '@/components/Statistics/StatShortcuts'
import {useStatColors} from '@/components/PlayerStatistics/statUi'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {MiniLeagueStats} from '@/components/mini-leagues/MiniLeagueStats'
import {
  MiniSeasonChips,
  useMiniSeasonSelection,
} from '@/components/mini-leagues/MiniSeasonChips'
import {useLeagueContext} from '@/context/LeagueContext'
import {useLeague} from '@/hooks/useLeague'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import {isMiniCompetition} from '@/types/competition'
import type {PlayerInfo} from '@/types/player'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {ActivityIndicator, ScrollView, View as RNView} from 'react-native'

function MiniStatsWithSeason({miniLeagueId}: {miniLeagueId: number}) {
  const {seasons, seasonId, setSeasonId} = useMiniSeasonSelection(miniLeagueId)
  return (
    <RNView className="flex-1">
      <RNView className="px-4 pt-3">
        <MiniSeasonChips
          seasons={seasons}
          seasonId={seasonId}
          onSelect={setSeasonId}
        />
      </RNView>
      <MiniLeagueStats miniLeagueId={miniLeagueId} seasonId={seasonId} />
    </RNView>
  )
}

function GuestStatisticsHome() {
  const listContentStyle = useTabListContentContainerStyle({
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  })

  return (
    <View className="flex-1">
      <ScrollView contentContainerStyle={listContentStyle}>
        <Text type="title" className="mb-2">
          stats_home_title
        </Text>
        <Text className="mb-5" style={{opacity: 0.72}}>
          stats_home_subtitle
        </Text>
        <StatShortcuts variant="grid" showSignIn />
      </ScrollView>
    </View>
  )
}

export default function StatisticsHome() {
  const league = useLeague()
  const [playerInfo, setPlayerInfo] = React.useState<PlayerInfo | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const {t} = useTranslation()
  const {state} = useLeagueContext()
  const user = state.user
  const {colors} = useTheme()
  const statColors = useStatColors()
  const isGuest = user?.id == null

  React.useEffect(() => {
    async function fetchPlayerInfo(userId: number) {
      try {
        setIsLoading(true)
        setError('')
        const info = await league.GetPlayerStatsInfo(userId)
        setPlayerInfo(info)
      } catch (e) {
        setError(t('failed_to_load_player_info'))
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    const userId = user?.id
    if (userId != null && !isMiniCompetition(state.competition)) {
      fetchPlayerInfo(userId)
    }
  }, [user?.id, state.competition])

  if (isMiniCompetition(state.competition)) {
    return <MiniStatsWithSeason miniLeagueId={state.competition.id} />
  }

  if (isGuest) {
    return <GuestStatisticsHome />
  }

  return (
    <View className="flex-1" style={{backgroundColor: colors.background}}>
      <StatShortcuts variant="compact" />
      <View className="flex-1" style={{backgroundColor: 'transparent'}}>
        {isLoading || (!playerInfo && !error) ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={statColors.accent} />
          </View>
        ) : error && !playerInfo ? (
          <View className="flex-1 justify-center px-6">
            <Text style={{textAlign: 'center', color: statColors.muted}}>
              {error}
            </Text>
          </View>
        ) : playerInfo ? (
          <PlayerStatistics playerInfo={playerInfo} path="/statistics" />
        ) : null}
      </View>
    </View>
  )
}
