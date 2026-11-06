import PlayerCard from '@/components/PlayerCard'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {useMatchContext} from '@/context/MatchContext'
import {useThemeColor} from '@/hooks/useThemeColor'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {useLocalSearchParams, useRouter} from 'expo-router'
import {useNavigation} from 'expo-router/react-navigation'
import {t} from 'i18next'
import React from 'react'
import {FlatList, Pressable, Text as RNText} from 'react-native'

export default function ChoosePlayer(props: any) {
  const router = useRouter()
  const {params} = useLocalSearchParams()
  const {state}: any = useMatchContext()
  const {state: leagueState} = useLeagueContext()
  const navigation = useNavigation()
  const {teamId, side, frameIndex, frameNumber, frameType, slot, mfpp} =
    JSON.parse(params as string)

  React.useEffect(() => {
    navigation.setOptions({title: t('roster')})
  }, [])

  const _team = state.teams[teamId as string]
  const team = Object.keys(_team)
    .map((key: string) => _team[key])
    .sort((a: any, b: any) => a.nickname.localeCompare(b.nickname))

  const currentSection = state.matchInfo.initialFrames[frameIndex].section
  const sectionFrames = []
  state.matchInfo.initialFrames.forEach((frame, index) => {
    if (frame.section === currentSection && frame.frameNumber > 0) {
      frame.frameIndex = index
      sectionFrames.push(frame)
    }
  })

  const canMerge = React.useMemo(() => {
    const user = leagueState.user
    if (isLeagueAdmin(user)) return true
    const role = user?.teams?.find(
      (team: {id: number; team_role_id: number}) =>
        Number(team.id) === Number(teamId),
    )?.team_role_id
    return role === 1 || role === 2
  }, [leagueState.user, teamId])

  function openMerge(player: {playerId?: number; id?: number; nickname?: string; name?: string}) {
    const masterPlayerId = Number(player.playerId ?? player.id)
    if (!Number.isInteger(masterPlayerId) || masterPlayerId <= 0) return
    router.push({
      pathname: '/Match/ChoosePlayer/MergePlayer',
      params: {
        mergeParams: JSON.stringify({
          teamId,
          masterPlayerId,
          masterNickname: player.nickname || player.name || `#${masterPlayerId}`,
        }),
      },
    })
  }

  function openMergeHistory() {
    router.push({
      pathname: '/Match/ChoosePlayer/MergeHistory',
      params: {teamIdParams: JSON.stringify({teamId})},
    })
  }

  function HandleChoosePlayer() {
    router.push({
      pathname: '/Match/ChoosePlayer/AddPlayer',
      params: {
        params: JSON.stringify({
          frameIndex,
          slot,
          side,
          frameNumber,
          frameType,
        }),
      },
    })
  }

  return (
    <FlatList
      className="px-2"
      style={{backgroundColor: useThemeColor({}, 'background')}}
      ListHeaderComponent={
        <View className="mt-4">
          <Pressable
            onPress={() => HandleChoosePlayer()}
            className="bg-blue-200 dark:bg-blue-700 py-5 border rounded">
            <Text className="text-center" style={{textAlign: 'center'}}>
              add_new_player
            </Text>
          </Pressable>
          {canMerge ? (
            <View className="mt-3">
              <RNText className="text-center text-xs text-gray-600 dark:text-gray-400 mb-2">
                {t('merge_player_roster_hint')}
              </RNText>
              <Pressable
                onPress={openMergeHistory}
                className="py-3 border border-gray-300 dark:border-gray-500 rounded">
                <Text className="text-center" style={{textAlign: 'center'}}>
                  team_merge_history
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      }
      data={team}
      renderItem={({item, index}) => {
        let disabled = false
        let count = 0
        sectionFrames.forEach(frame => {
          if (
            state.frameData[frame.frameIndex].awayPlayerIds.includes(
              item.playerId,
            ) ||
            state.frameData[frame.frameIndex].homePlayerIds.includes(
              item.playerId,
            )
          ) {
            count++
          }
        })
        const mfpp = state.matchInfo.initialFrames[frameIndex].mfpp
        if (
          count >= mfpp ||
          state.frameData[frameIndex].homePlayerIds.includes(item.playerId) ||
          state.frameData[frameIndex].awayPlayerIds.includes(item.playerId)
        ) {
          disabled = true
        }
        return (
          <PlayerCard
            player={item}
            side={side as string}
            frameIndex={frameIndex}
            frameNumber={frameNumber}
            frameType={frameType as string}
            slot={slot}
            disabled={disabled}
            mfpp={mfpp}
            onMerge={canMerge ? () => openMerge(item) : undefined}
          />
        )
      }}
    />
  )
}
