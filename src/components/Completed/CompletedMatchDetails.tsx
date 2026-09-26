import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useMatch} from '@/hooks'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useNavigation, usePathname, useRouter} from 'expo-router'
import {formatBangkokDateMed} from '@/lib/bangkokTime'
import React from 'react'
import {FlatList, Pressable, useColorScheme} from 'react-native'
import {useTranslation} from 'react-i18next'

type Frame = {
  frameId: number
  homePlayers: {nickName: string; playerId: number}[]
  awayPlayers: {nickName: string; playerId: number}[]
  homeWin: number
}

type MatchDetails = Frame[]

type MatchMetadata = {
  matchDate: string
  home_team_id: number
  away_team_id: number
  home_team_name: string
  away_team_name: string
  home_frames: number
  away_frames: number
  first_break_home_team: number
}

function FrameRow({frame, index}: {frame: Frame; index: number}) {
  const {t} = useTranslation()
  const router = useRouter()
  const [homePressed, setHomePressed] = React.useState(false)
  const [awayPressed, setAwayPressed] = React.useState(false)
  const colorScheme = useColorScheme()
  const currentPath = usePathname()

  function handleHomePressIn() {
    setHomePressed(true)
  }

  function handleHomePressOut() {
    setHomePressed(false)
  }

  function handleAwayPressIn() {
    setAwayPressed(true)
  }

  function handleAwayPressOut() {
    setAwayPressed(false)
  }

  const textColor = colorScheme === 'dark' ? 'lightblue' : 'blue'

  return (
    <View className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
      <View className="mb-4">
        <Text className="text-sm font-medium text-slate-500">
          <Text className="font-semibold">{t('frame')}</Text> {index + 1}
        </Text>
      </View>
      <View className="flex-row items-center">
        {/* Home Team Side */}
        <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
          <View style={{flex: 1, alignItems: 'flex-start'}}>
            {frame.homePlayers.map((player, idx) => (
              <Pressable
                key={idx}
                onPressIn={handleHomePressIn}
                onPressOut={handleHomePressOut}
                onPress={() => {
                  router.replace({
                    pathname: './Player',
                    params: {
                      params: JSON.stringify({
                        playerId: player.playerId,
                      }),
                    },
                  })
                }}>
                <Text
                  type="subtitle"
                  style={{color: homePressed ? 'red' : textColor}}>
                  {player.nickName}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{flex: 0.5, alignItems: 'flex-end'}}>
            {frame.homeWin === 1 && (
              <View className="px-2 py-1">
                <MCI name="check-circle" size={24} color="rgb(22, 163, 74)" />
              </View>
            )}
          </View>
        </View>

        {/* Center VS */}
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <Text className="text-base font-semibold text-slate-400">vs</Text>
        </View>

        {/* Away Team Side */}
        <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
          <View style={{flex: 0.5, alignItems: 'flex-start'}}>
            {frame.homeWin === 0 && (
              <View className="px-2 py-1">
                <MCI name="check-circle" size={24} color="rgb(22, 163, 74)" />
              </View>
            )}
          </View>
          <View style={{flex: 1, alignItems: 'flex-end'}}>
            {frame.awayPlayers.map((player, idx) => (
              <Pressable
                key={idx}
                onPressIn={handleAwayPressIn}
                onPressOut={handleAwayPressOut}
                onPress={() => {
                  router.replace({
                    pathname: './Player',
                    params: {
                      params: JSON.stringify({playerId: player.playerId}),
                    },
                  })
                }}>
                <Text
                  key={idx}
                  className="text-right"
                  type="subtitle"
                  style={{color: awayPressed ? 'red' : textColor}}>
                  {player.nickName}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}

export default function CompletedMatchDetails({matchId}: {matchId: number}) {
  const matchHook = useMatch()
  const [matchDetails, setMatchDetails] = React.useState<MatchDetails | null>(
    null,
  )
  const [loading, setLoading] = React.useState(true)
  const navigation = useNavigation()
  const [matchMetadata, setMatchMetadata] =
    React.useState<MatchMetadata | null>(null)
  const colorscheme = useColorScheme()
  const [homePressed, setHomePressed] = React.useState(false)
  const [awayPressed, setAwayPressed] = React.useState(false)
  const isDark = colorscheme === 'dark'
  const router = useRouter()

  React.useEffect(() => {
    async function getMatchDetails(matchId: number) {
      try {
        const res = await matchHook.GetMatchDetails(matchId)
        setMatchDetails(res.data)
        const res2 = await matchHook.GetMatchMetadata(matchId)
        setMatchMetadata(res2.data)
      } catch (error) {
        console.error('Failed to fetch match details:', error)
      } finally {
        setLoading(false)
      }
    }

    if (matchId) {
      getMatchDetails(matchId)
    }
  }, [matchId])

  React.useEffect(() => {
    navigation.setOptions({
      title: `Match #${matchId}`,
    })
  }, [matchId])

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Loading...</Text>
      </View>
    )
  }

  if (!matchDetails) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Match not found</Text>
      </View>
    )
  }

  const isHomeWinner =
    (matchMetadata?.home_frames ?? 0) > (matchMetadata?.away_frames ?? 0)
  const isAwayWinner =
    (matchMetadata?.away_frames ?? 0) > (matchMetadata?.home_frames ?? 0)

  return (
    <View className="flex-1 p-4">
      <View className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm mb-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-base font-medium text-slate-600">
            Match #{matchId}
          </Text>
          {typeof matchMetadata?.matchDate === 'string' && (
            <View>
              <Text type="subtitle">
                {formatBangkokDateMed(matchMetadata.matchDate)}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center">
          <Pressable
            onPressIn={() => {
              setHomePressed(true)
            }}
            onPressOut={() => {
              setHomePressed(false)
            }}
            onPress={() => {
              router.push({
                pathname: '/Completed/Match/Team',
                params: {
                  params: JSON.stringify({teamId: matchMetadata?.home_team_id}),
                },
              })
            }}
            className="flex-1 items-center">
            <Text
              type="subtitle"
              className={`mb-1`}
              style={{
                color: homePressed
                  ? 'red'
                  : isHomeWinner
                    ? 'green'
                    : isDark
                      ? '#eee'
                      : '#000',
              }}>
              {matchMetadata?.home_team_name}
            </Text>
            <Text type="subtitle" className={`mb-1`}>
              {matchMetadata?.home_frames
                ? matchMetadata?.home_frames.toString()
                : '0'}
            </Text>
            {matchMetadata?.first_break_home_team === 1 && (
              <Text className={`mb-1`}>first_break</Text>
            )}
          </Pressable>
          <View className="w-16 items-center">
            <Text className="text-sm text-slate-400 font-medium">vs</Text>
          </View>
          <Pressable
            onPressIn={() => {
              setAwayPressed(true)
            }}
            onPressOut={() => {
              setAwayPressed(false)
            }}
            onPress={() => {
              router.push({
                pathname: '/Completed/Match/Team',
                params: {
                  params: JSON.stringify({teamId: matchMetadata?.away_team_id}),
                },
              })
            }}
            className="flex-1 items-center">
            <Text
              type="subtitle"
              className={`mb-1 text-right`}
              style={{
                color: awayPressed
                  ? 'red'
                  : isAwayWinner
                    ? 'green'
                    : isDark
                      ? '#eee'
                      : '#000',
              }}>
              {matchMetadata?.away_team_name}
            </Text>
            <Text type="subtitle" className={`mb-1`}>
              {matchMetadata?.away_frames
                ? matchMetadata?.away_frames.toString()
                : '0'}
            </Text>
            {matchMetadata?.first_break_home_team === 0 && (
              <Text className={`mb-1`}>first_break</Text>
            )}
          </Pressable>
        </View>
      </View>

      <FlatList
        data={matchDetails}
        renderItem={({item, index}) => <FrameRow frame={item} index={index} />}
        ItemSeparatorComponent={() => <View className="h-4" />}
        keyExtractor={item => item.frameId.toString()}
      />
    </View>
  )
}
