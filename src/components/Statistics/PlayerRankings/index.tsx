/* eslint-disable react-hooks/exhaustive-deps */
import Row from '@/components/Row'
import TextInput from '@/components/TextInput'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {MiniSeasonChips} from '@/components/mini-leagues/MiniSeasonChips'
import {useLeagueSeasonSelection} from '@/hooks/useLeagueSeasonSelection'
import {useNetwork} from '@/hooks/useNetwork'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import {router, usePathname} from 'expo-router'
import React, {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {ActivityIndicator, FlatList, Pressable} from 'react-native'

type PlayerRanking = {
  playerId: number
  nickname: string
  profile_picture?: string
  played: number
  won: number
  points: number
  win_percentage?: number
  rank?: number
}

type DivisionPlayerRankings = {
  division_id: number
  division_name: string
  players: PlayerRanking[]
}

function PlayerRow({
  player,
  index,
}: {
  player: PlayerRanking
  index: number
}) {
  const currentPath = usePathname()
  const {t} = useTranslation()

  function handlePress(playerId: number) {
    router.push({
      pathname: (currentPath + '/Player') as any,
      params: {
        params: JSON.stringify({playerId})
      },
    })
  }

  const winPercentage =
    player.win_percentage !== undefined
      ? player.win_percentage
      : player.played > 0
        ? ((player.won / player.played) * 100).toFixed(1)
        : '0.0'

  return (
    <Pressable
      onPress={() => handlePress(player.playerId)}
      className="flex-row items-center py-3 px-4 border-b border-gray-200 dark:border-gray-700">
      <View style={{flex: 1}}>
        <Text className="font-medium">#{index + 1}</Text>
      </View>
      <View style={{flex: 4}}>
        <Text className="font-medium">{player.nickname}</Text>
      </View>
      <View style={{flex: 1}} className="items-center">
        <Text>{player.played.toString()}</Text>
      </View>
      <View style={{flex: 1}} className="items-center">
        <Text>{player.won.toString()}</Text>
      </View>
      <View style={{flex: 1}} className="items-center">
        <Text>{winPercentage}%</Text>
      </View>
    </Pressable>
  )
}

function DivisionRankings({
  data,
  minimumGames,
}: {
  data: DivisionPlayerRankings
  minimumGames: number
}) {
  const {t} = useTranslation()

  // Filter players based on minimum games
  const filteredPlayers = data.players.filter(
    player => player.played >= minimumGames,
  )

  // Don't render division if no players meet the minimum
  if (filteredPlayers.length === 0) {
    return null
  }

  return (
    <View className="mb-6">
      <View className="px-4 py-3 bg-gray-100 dark:bg-gray-800">
        <Text type="title" className="text-lg font-bold">
          {data.division_name}
        </Text>
      </View>
      <View className="px-4 py-2 bg-gray-50 dark:bg-gray-900">
        <Row alignItems="center">
          <View style={{flex: 0.5}} />
          <View style={{flex: 4}}>
            <Text className="font-bold text-sm">{t('player')}</Text>
          </View>
          <View style={{flex: 1}} className="items-center">
            <Text className="font-bold text-sm">{t('played')}</Text>
          </View>
          <View style={{flex: 1}} className="items-center">
            <Text className="font-bold text-sm">{t('won')}</Text>
          </View>
          <View style={{flex: 1}} className="items-center">
            <Text className="font-bold text-sm">%</Text>
          </View>
        </Row>
      </View>
      <FlatList
        data={filteredPlayers}
        renderItem={({item, index}) => (
          <PlayerRow player={item} index={index} />
        )}
        scrollEnabled={false}
      />
    </View>
  )
}

export default function PlayerRankings({
  season,
  divisionId,
}: {
  season?: number
  divisionId?: number
}) {
  const {t} = useTranslation()
  const {Get} = useNetwork()
  const [rankings, setRankings] = useState<DivisionPlayerRankings[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [minimumGames, setMinimumGames] = useState<string>('20')
  const listContentStyle = useTabListContentContainerStyle({paddingTop: 10})
  const {seasons, seasonId, setSeasonId, pastSeasonId} =
    useLeagueSeasonSelection(season)
  const effectiveSeason = seasons.length > 0 ? pastSeasonId : season

  // Parse minimum games as number, default to 20 if invalid
  const minimumGamesNum = React.useMemo(() => {
    const parsed = parseInt(minimumGames, 10)
    return isNaN(parsed) || parsed < 0 ? 20 : parsed
  }, [minimumGames])

  React.useEffect(() => {
    async function fetchRankings() {
      try {
        setIsLoading(true)
        setError(null)

        // Build query string with optional parameters
        const queryParams: string[] = []
        if (effectiveSeason !== undefined && effectiveSeason !== null) {
          queryParams.push(`season=${effectiveSeason}`)
        }
        if (divisionId !== undefined && divisionId !== null) {
          queryParams.push(`division_id=${divisionId}`)
        }

        const queryString =
          queryParams.length > 0 ? '?' + queryParams.join('&') : ''
        const endpoint = `/league/0/division/players/stats${queryString}`

        const res = await Get(endpoint)
        // console.log('Player rankings API response:', JSON.stringify(res, null, 2))

        // Check if response is empty (likely an error from useNetwork)
        if (!res || (typeof res === 'object' && Object.keys(res).length === 0)) {
          console.warn('Empty response from API - endpoint may not exist or returned error')
          setError('No data available. The API endpoint may not be available or returned an error.')
          setRankings([])
          return
        }

        // Handle different response formats
        if (res && res.status === 'ok' && res.data) {
          // Response with status: { status: 'ok', data: [...] }
          const _rankings = Object.keys(res.data).map(key => ({
            division_name: key,
            players: res.data[key],
          }))
          setRankings(_rankings as DivisionPlayerRankings[])
          if (_rankings.length === 0) {
            setError('No player rankings found for the selected criteria.')
          }
        }
      } catch (e) {
        console.error('Failed to fetch player rankings:', e)
        const errorMessage =
          e instanceof Error ? e.message : 'Failed to load data'
        setError(errorMessage)
        setRankings([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRankings()
  }, [effectiveSeason, divisionId])

  // Filter out divisions with no players meeting minimum games
  const filteredRankings = rankings.filter(division => {
    const hasPlayers = division.players.some(
      player => player.played >= minimumGamesNum,
    )
    return hasPlayers
  })

  return (
    <View className="flex-1">
      {/* Filter Input */}
      <View className="px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="font-bold text-sm mb-1">
              {t('minimum_games') || 'Minimum Games'}
            </Text>
            <TextInput
              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              value={minimumGames}
              onChangeText={setMinimumGames}
              keyboardType="numeric"
              placeholder="20"
            />
          </View>
          <View className="pt-6">
            <Pressable
              onPress={() => setMinimumGames('20')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
              <Text className="text-center text-sm">
                {t('reset') || 'Reset'}
              </Text>
            </Pressable>
          </View>
        </View>
        <View className="mt-3">
          <MiniSeasonChips
            seasons={seasons}
            seasonId={seasonId}
            onSelect={setSeasonId}
          />
        </View>
      </View>

      {/* Rankings List */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" />
          <Text className="mt-4">{t('loading') || 'Loading...'}</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-red-500 text-center mb-2">{error}</Text>
          <Text className="text-gray-500 text-center text-sm">
            Please check the console for more details.
          </Text>
        </View>
      ) : rankings.length === 0 ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-center mb-2">{t('no_data_available') || 'No data available'}</Text>
          <Text className="text-gray-500 text-center text-sm">
            Try adjusting the season or division filters.
          </Text>
        </View>
      ) : filteredRankings.length === 0 ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-center mb-2">
            No players found with at least {minimumGamesNum} games played.
          </Text>
          <Text className="text-gray-500 text-center text-sm">
            Try lowering the minimum games filter.
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={listContentStyle}
          data={filteredRankings}
          renderItem={({item}) => (
            <DivisionRankings data={item} minimumGames={minimumGamesNum} />
          )}
          keyExtractor={(item, index) =>
            `division-${item.division_id || index}`
          }
        />
      )}
    </View>
  )
}

