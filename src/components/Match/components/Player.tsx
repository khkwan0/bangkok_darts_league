import Row from '@/components/Row'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {useMatchContext} from '@/context/MatchContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import {router} from 'expo-router'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Alert, Pressable, View as RNView} from 'react-native'

interface PlayerProps {
  teamId: number | string
  side: string
  frameIndex: number
  frameNumber: number
  frameType?: string
  playerIds: number[]
  refreshing?: boolean
}

export default function Player({
  teamId,
  side,
  frameIndex,
  frameNumber,
  frameType,
  playerIds,
  refreshing = false,
}: PlayerProps) {
  const {state}: any = useMatchContext()
  const {t} = useTranslation()
  const playerPlusIconSize = 20
  const {home_team_id: homeTeamId, away_team_id: awayTeamId} = state.matchInfo
  const textColor = 'rgb(107, 33, 168)'
  const pressedTextColor = 'red'
  const [isPressed, setIsPressed] = useState(false)
  const [isDoublePressed, setIsDoublePressed] = useState(false)
  const {state: playerState}: any = useLeagueContext()
  const user = playerState.user

  const isPlayerOnTeam = () => {
    try {
      /*
      if (isLeagueAdmin(user)) {
        return true
      }
      let playerList = null
      if (side === 'home') {
        playerList = Object.keys(state.teams[homeTeamId])
      } else {
        playerList = Object.keys(state.teams[awayTeamId])
      }
      return playerList.includes(user.id.toString())
      */

      // loosen the restrictions to allow player on either team to add players on the other team
      const playerList = []
      playerList.push(...Object.keys(state.teams[awayTeamId]))
      playerList.push(...Object.keys(state.teams[homeTeamId]))
      const isOnATeam = playerList.includes(user.id.toString()) || isLeagueAdmin(user)
      return isOnATeam
    } catch (e) {
      console.error(e)
      return false
    }
  }

  // Skeleton loading UI for player slot
  const PlayerSkeleton = () => {
    return (
      <RNView className="h-6 rounded bg-gray-300 dark:bg-gray-600 w-20 animate-pulse" />
    )
  }

  const handlePressIn = () => {
    setIsPressed(true)
  }

  const handlePressOut = () => {
    setIsPressed(false)
  }

  const handleDoublePressIn = () => {
    setIsDoublePressed(true)
  }

  const handleDoublePressOut = () => {
    setIsDoublePressed(false)
  }

  const handlePlayerSlotPress = (slot: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    if (typeof user?.id !== 'undefined') {
      if (isPlayerOnTeam()) {
        router.push({
          pathname: '/Match/ChoosePlayer',
          params: {
            params: JSON.stringify({
              teamId: teamId,
              side: side,
              frameIndex: frameIndex,
              frameNumber: frameNumber,
              frameType: frameType,
              slot: slot,
              mfpp: state.matchInfo.initialFrames[frameIndex].mfpp,
            }),
          },
        })
      } else {
        Alert.alert(t('user_not_on_team'))
      }
    } else {
      Alert.alert(t('user_not_logged_in'))
    }
  }

  if (refreshing) {
    return (
      <>
        <Row alignItems="center" justifyContent="center" style={{gap: 10}}>
          <PlayerSkeleton />
        </Row>
        {(frameType === '8d' || frameType === '9d') && (
          <RNView className="pt-6">
            <Row alignItems="center" justifyContent="center" style={{gap: 10}}>
              <PlayerSkeleton />
            </Row>
          </RNView>
        )}
        {((teamId === homeTeamId &&
          state.firstBreak === homeTeamId &&
          state.frameData[frameIndex].frameNumber % 2 === 1) ||
          (teamId === homeTeamId &&
            state.firstBreak === awayTeamId &&
            state.frameData[frameIndex].frameNumber % 2 === 0) ||
          (teamId === awayTeamId &&
            state.firstBreak === awayTeamId &&
            state.frameData[frameIndex].frameNumber % 2 === 1) ||
          (teamId === awayTeamId &&
            state.firstBreak === homeTeamId &&
            state.frameData[frameIndex].frameNumber % 2 === 0)) && (
          <RNView className="w-10 h-4 mt-2 mx-auto rounded bg-gray-300 dark:bg-gray-600 animate-pulse" />
        )}
      </>
    )
  } else {
    return (
      <>
        <Pressable
          onPress={() => handlePlayerSlotPress(0)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}>
          <Row alignItems="center" justifyContent="center" style={{gap: 10}}>
            {typeof playerIds[0] !== 'undefined' &&
              state.teams[teamId]?.[playerIds[0]]?.nickname && (
                <>
                  <Text
                    type="subtitle"
                    style={{color: isPressed ? pressedTextColor : textColor}}>
                    {state?.teams?.[teamId]?.[playerIds[0]]?.nickname ?? ''}
                  </Text>
                </>
              )}
            {(typeof playerIds[0] === 'undefined' ||
              !state?.teams?.[teamId]?.[playerIds[0]]?.nickname) && (
              <>
                <MCI
                  name="plus-circle"
                  size={playerPlusIconSize}
                  color={isPressed ? pressedTextColor : textColor}
                />
                <Text
                  type="subtitle"
                  style={{color: isPressed ? pressedTextColor : textColor}}>
                  {t('player')}
                </Text>
              </>
            )}
          </Row>
        </Pressable>
        {(frameType === '8d' || frameType === '9d') && (
          <Pressable
            className="pt-6"
            onPress={() => handlePlayerSlotPress(1)}
            onPressIn={handleDoublePressIn}
            onPressOut={handleDoublePressOut}>
            <Row
              alignItems="center"
              justifyContent="center"
              style={{gap: 10}}>
              {typeof playerIds[1] !== 'undefined' &&
                state?.teams?.[teamId]?.[playerIds[1]]?.nickname && (
                  <>
                    <Text
                      type="subtitle"
                      style={{
                        color: isDoublePressed ? pressedTextColor : textColor,
                      }}>
                      {state?.teams?.[teamId]?.[playerIds[1]]?.nickname ?? ''}
                    </Text>
                  </>
                )}
              {(typeof playerIds[1] === 'undefined' ||
                !state?.teams?.[teamId]?.[playerIds[1]]?.nickname) && (
                <>
                  <MCI
                    name="plus-circle"
                    size={playerPlusIconSize}
                    color={isDoublePressed ? pressedTextColor : textColor}
                  />
                  <Text
                    type="subtitle"
                    style={{
                      color: isDoublePressed ? pressedTextColor : textColor,
                    }}>
                    {t('player')}
                  </Text>
                </>
              )}
            </Row>
          </Pressable>
        )}
        {teamId === homeTeamId &&
          state.firstBreak === homeTeamId &&
          state.frameData[frameIndex].frameNumber % 2 === 1 && (
            <Text className="text-center" style={{color: textColor}}>
              {t('break')}
            </Text>
          )}
        {teamId === homeTeamId &&
          state.firstBreak === awayTeamId &&
          state.frameData[frameIndex].frameNumber % 2 === 0 && (
            <Text className="text-center" style={{color: textColor}}>
              {t('break')}
            </Text>
          )}
        {teamId === awayTeamId &&
          state.firstBreak === awayTeamId &&
          state.frameData[frameIndex].frameNumber % 2 === 1 && (
            <Text className="text-center" style={{color: textColor}}>
              {t('break')}
            </Text>
          )}
        {teamId === awayTeamId &&
          state.firstBreak === homeTeamId &&
          state.frameData[frameIndex].frameNumber % 2 === 0 && (
            <Text className="text-center" style={{color: textColor}}>
              {t('break')}
            </Text>
          )}
      </>
    )
  }
}
