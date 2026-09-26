import {ThemedText as Text} from './ThemedText'
import Row from './Row'
import {useMatchContext} from '@/context/MatchContext'
import {useColorScheme, Image, View, Pressable} from 'react-native'
import {router} from 'expo-router'
import config from '@/config'
import {useTeams} from '@/hooks'
import React from 'react'

type PlayerCardPropsType = {
  frameIndex: number
  slot: number
  side: string
  player: any
  frameNumber: number
  frameType: string
  disabled: boolean
  abbrevFirst?: boolean
  abbrevLast?: boolean
  isExisting?: boolean
  mfpp: number
}
export default function PlayerCard({
  frameIndex,
  slot,
  side,
  player,
  frameNumber,
  frameType,
  disabled,
  abbrevFirst = true,
  abbrevLast = true,
  isExisting = false,
  mfpp,
}: PlayerCardPropsType) {
  const {UpdateFramePlayers, UpdateTeams}: any = useMatchContext()
  const [stats, setStats] = React.useState({
    played: 0,
    wins: 0,
    s_played: 0,
    s_wins: 0,
    d_played: 0,
    d_wins: 0,
  })
  const [isPressed, setIsPressed] = React.useState(false)
  const teams = useTeams()
  const {state}: any = useMatchContext()

  async function HandlePress() {
    try {
      let newPlayer = false
      if (isExisting) {
        const res = await teams.AddExistingPlayerToTeam(
          side === 'home'
            ? state.matchInfo.home_team_id
            : state.matchInfo.away_team_id,
          player.id,
        )
        newPlayer = true
      }
      UpdateFramePlayers(
        frameIndex,
        side,
        slot,
        player.id,
        player.nickname,
        newPlayer,
        frameType,
        frameNumber,
        mfpp,
      )
      /*
    dispatch({
      type: 'SET_PLAYER',
      payload: {
        frameIndex: props.frameIndex,
        playerId: props.player.id,
        slot: props.slot,
        side: props.side,
      },
    })
      */
      router.dismissTo('/Match')
    } catch (e) {
      console.log(e)
    }
  }

  React.useEffect(() => {
    if (typeof state.stats !== 'undefined') {
      Object.keys(state.stats).forEach(key => {
        let wins = 0
        let s_wins = 0
        let d_wins = 0
        let played = 0
        let s_played = 0
        let d_played = 0
        if (
          typeof state.stats[key] !== 'undefined' &&
          key === `p${player.id}`
        ) {
          Object.keys(state.stats[key]).forEach(frameKey => {
            played++
            const frameType = state.stats[key][frameKey].type.slice(-1)
            if (frameType === 's') {
              s_played++
            } else if (frameType === 'd') {
              d_played++
            }
            if (state.stats[key][frameKey].win) {
              wins++
              if (frameType === 's') {
                s_wins++
              } else if (frameType === 'd') {
                d_wins++
              }
            }
          })
          setStats({
            wins,
            s_wins,
            d_wins,
            played,
            s_played,
            d_played,
          })
        }
      })
    }
  }, [state.stats])

  const theme = useColorScheme()
  const backgroundColor = theme === 'light' ? 'bg-blue-300' : 'bg-gray-500'
  return (
    <View className={'my-4 p-4 ' + backgroundColor}>
      <Row className={'items-center'}>
        <View style={{flex: 1}}>
          <Text type="subtitle">{player.name ?? player.nickname}</Text>
          <Row>
            {(player.firstname || player.firstName) && (
              <Text type="defaultSemiBold">
                {abbrevFirst
                  ? (player.firstname ?? player.firstName).substr(
                      0,
                      (player.firstname ?? player.firstName).length > 2 ? 3 : 2,
                    )
                  : player.firstname}
              </Text>
            )}
            {(player.lastname || player.lastName) && (
              <Text type="defaultSemiBold">
                &nbsp;
                {abbrevLast
                  ? (player.lastname ?? player.lastName).substr(
                      0,
                      (player.lastname ?? player.lastName).length > 2 ? 3 : 2,
                    )
                  : player.lastname}
              </Text>
            )}
          </Row>
          <Text>#{player.id}</Text>
        </View>
        <View style={{flex: 1}}>
          {typeof player.profile_picture !== 'undefined' &&
            player.profile_picture && (
              <Image
                source={{uri: config.profileUrl + player.profile_picture}}
                width={50}
                height={50}
                resizeMode="contain"
                style={{borderRadius: 50}}
              />
            )}
        </View>
        <View style={{flex: 1, alignItems: 'flex-end'}}>
          <Pressable
            onPressIn={() => setIsPressed(true)}
            onPressOut={() => setIsPressed(false)}
            onPress={HandlePress}
            disabled={disabled}
            className={`p-4 rounded-md ${isPressed ? 'bg-red-500' : disabled ? 'bg-blue-400' : 'bg-blue-800'}`}>
            <Text>select</Text>
          </Pressable>
        </View>
      </Row>
      <View>
        <Text>
          Played: <Text type="subtitle">{stats.played}</Text>
        </Text>
        {stats.played > 0 && (
          <Row>
            <View style={{flex: 1}}>
              <Text type="subtitle">All</Text>
              <Text>W: {stats.wins}</Text>
              <Text>L: {stats.played - stats.wins}</Text>
              {stats.played > 0 && (
                <Text>
                  %: {((stats.wins / stats.played) * 100.0).toFixed(3)}
                </Text>
              )}
            </View>
            <View style={{flex: 1}}>
              <Text type="subtitle">Singles</Text>
              <Text>W: {stats.s_wins}</Text>
              <Text>L: {stats.s_played - stats.s_wins}</Text>
              {stats.s_played > 0 && (
                <Text>
                  %: {((stats.s_wins / stats.s_played) * 100.0).toFixed(3)}
                </Text>
              )}
            </View>
            <View style={{flex: 1}}>
              <Text type="subtitle">Doubles</Text>
              <Text>W: {stats.d_wins}</Text>
              <Text>L: {stats.d_played - stats.d_wins}</Text>
              {stats.d_played > 0 && (
                <Text>
                  %: {((stats.d_wins / stats.d_played) * 100.0).toFixed(3)}
                </Text>
              )}
            </View>
          </Row>
        )}
      </View>
    </View>
  )
}
