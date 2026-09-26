import React from 'react'
import {ActivityIndicator, Button, Image, ScrollView} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import LeagueHistory from '@/components/LeagueHistory'
import StatsHeader from '@/components/PlayerStatistics/StatsHeader'
import Stats from '@/components/Stats'
import StatsDoubles from '@/components/PlayerStatistics/StatsDoubles'
import StatsMatchPerformance from '@/components/PlayerStatistics/StatsMatchPerformance'
import config from '@/config'
import {useSeason, useLeague} from '@/hooks'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {router, useLocalSearchParams} from 'expo-router'

const PlayerStats = () => {
  const season = useSeason()
  const league = useLeague()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams()
  const [playerInfo, setPlayerInfo] = React.useState(
    params.playerInfo ? JSON.parse(params.playerInfo as string) : null,
  )
  const [isLoading, setIsLoading] = React.useState(false)
  const [isDoubleStatsLoading, setIsDoubleStatsLoading] = React.useState(false)
  const [isMatchPerformanceLoading, setIsMatchPerformanceLoading] =
    React.useState(false)
  const [matchPerformance, setMatchPerformance] = React.useState([])
  const [stats, setStats] = React.useState({})
  const [doublesStats, setDoublesStats] = React.useState([])

  React.useEffect(() => {
    ;(async () => {
      try {
        setIsLoading(true)
        const res = await GetStats()
        setStats(res)
      } catch (e) {
        console.log(e)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [playerInfo])

  React.useEffect(() => {
    ;(async () => {
      try {
        setIsDoubleStatsLoading(true)
        const res = await GetDoublesStats()
        setDoublesStats(res)
      } catch (e) {
        console.log(e)
      } finally {
        setIsDoubleStatsLoading(false)
      }
    })()
  }, [playerInfo])

  React.useEffect(() => {
    ;(async () => {
      try {
        setIsMatchPerformanceLoading(true)
        const res = await GetMatchPerformance()
        setMatchPerformance(res)
      } catch (e) {
        console.log(e)
      } finally {
        setIsMatchPerformanceLoading(false)
      }
    })()
  }, [playerInfo])

  async function GetStats() {
    try {
      const res = await season.GetPlayerStats(playerInfo.player_id)
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  async function GetDoublesStats() {
    try {
      const res = await season.GetDoublesStats(playerInfo.player_id)
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  async function GetMatchPerformance() {
    try {
      const res = await season.GetMatchPerformance(playerInfo.player_id)
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  async function HandlePlayerSelect(playerId) {
    try {
      const res = await league.GetPlayerStatsInfo(playerId)
      setPlayerInfo(res)
    } catch (e) {
      console.log(e)
    }
  }

  return (
    <ScrollView
      style={{
        paddingVertical: 20,
        marginBottom: insets.bottom,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
        <View style={{flex: 1}}>
          <Image
            source={{uri: config.profileUrl + playerInfo.pic}}
            width={100}
            height={100}
            resizeMode="contain"
            style={{borderRadius: 50}}
          />
        </View>
        <View style={{flex: 2, alignItems: 'center'}}>
          <Button onPress={() => router.back()}>
            {`${playerInfo.name} (${playerInfo.firstname} ${playerInfo.lastname})`}
          </Button>
          <Text>{playerInfo?.nationality?.en ?? ''}</Text>
          <View>
            {playerInfo.teams.map((team, idx) => {
              if (idx === playerInfo.teams.length - 1) {
                return <Text key={team + '_' + idx}>{team}</Text>
              } else {
                return <Text key={team + '_' + idx}>{`${team}, `}</Text>
              }
            })}
          </View>
        </View>
      </View>
      {isLoading && (
        <View>
          <ActivityIndicator />
        </View>
      )}
      {!isLoading && (
        <View style={{marginVertical: 20, paddingHorizontal: 20}}>
          <StatsHeader />
          <Stats stats={stats} />
        </View>
      )}
      {isDoubleStatsLoading && (
        <View>
          <ActivityIndicator />
        </View>
      )}
      {!isDoubleStatsLoading && (
        <View style={{marginVertical: 20, paddingHorizontal: 20}}>
          <StatsHeader isDoubles={true} />
          <StatsDoubles
            stats={doublesStats}
            playerSelect={HandlePlayerSelect}
          />
        </View>
      )}
      {isMatchPerformanceLoading && (
        <View>
          <ActivityIndicator />
        </View>
      )}
      {!isMatchPerformanceLoading && (
        <View style={{marginVertical: 20, paddingHorizontal: 20}}>
          <StatsHeader isMatchPerformance={true} />
          <StatsMatchPerformance stats={matchPerformance} />
        </View>
      )}
      <View style={{backgroundColor: '#eee', padding: 20}}>
        <View>
          <Text variant="bodyLarge">
            All performance figures are based on confirmed matches only
          </Text>
        </View>
        <View style={{marginVertical: 15}}>
          <Text variant="bodyLarge">
            * Weighted performance: Doubles frames are weighted with 50% weight
          </Text>
        </View>
        <View>
          <Text variant="bodyLarge">
            ** adjusted performance: The overall weighted performance is
            multiplied by (frames-1)/frames in order to account for small sample
            sizes (i.e. it's kind of a penalty for only a few frames played)
          </Text>
        </View>
      </View>
      <View style={{marginVertical: 20}}>
        <View
          style={{
            backgroundColor: '#eee',
            paddingHorizontal: 20,
            paddingVertical: 10,
          }}>
          <Text variant="labelLarge">League History</Text>
        </View>
        <View style={{paddingHorizontal: 20}}>
          <LeagueHistory playerInfo={playerInfo} />
        </View>
      </View>
    </ScrollView>
  )
}

export default PlayerStats
