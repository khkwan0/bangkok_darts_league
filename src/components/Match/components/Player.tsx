import Row from '@/components/Row'
import {useLeagueContext} from '@/context/LeagueContext'
import {useMatchContext} from '@/context/MatchContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import {router} from 'expo-router'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Alert, Pressable, Text, View} from 'react-native'

interface PlayerProps {
  teamId: number | string
  side: string
  frameIndex: number
  frameNumber: number
  frameType?: string
  playerIds: number[]
  refreshing?: boolean
  ink: string
  mark: string
}

function PlayerSkeleton({ink}: {ink: string}) {
  return (
    <View
      style={{
        height: 18,
        width: 72,
        borderRadius: 6,
        backgroundColor: ink,
        opacity: 0.25,
      }}
    />
  )
}

function PlayerSlot({
  filled,
  nickname,
  ink,
  label,
  pressed,
  onPress,
  onPressIn,
  onPressOut,
}: {
  filled: boolean
  nickname?: string
  ink: string
  label: string
  pressed: boolean
  onPress: () => void
  onPressIn: () => void
  onPressOut: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{opacity: pressed ? 0.55 : 1, paddingVertical: 2}}>
      <Row alignItems="center" justifyContent="center" style={{gap: 6}}>
        {filled ? (
          <Text
            numberOfLines={2}
            style={{
              color: ink,
              fontSize: 16,
              lineHeight: 20,
              fontWeight: '800',
              textAlign: 'center',
            }}>
            {nickname}
          </Text>
        ) : (
          <>
            <MCI name="plus" size={16} color={ink} />
            <Text style={{color: ink, fontSize: 15, fontWeight: '700'}}>
              {label}
            </Text>
          </>
        )}
      </Row>
    </Pressable>
  )
}

export default function Player({
  teamId,
  side,
  frameIndex,
  frameNumber,
  frameType,
  playerIds,
  refreshing = false,
  ink,
  mark,
}: PlayerProps) {
  const {state}: any = useMatchContext()
  const {t} = useTranslation()
  const [isPressed, setIsPressed] = useState(false)
  const [isDoublePressed, setIsDoublePressed] = useState(false)
  const {state: playerState}: any = useLeagueContext()
  const user = playerState.user
  const {home_team_id: homeTeamId, away_team_id: awayTeamId} = state.matchInfo

  const isPlayerOnTeam = () => {
    try {
      const playerList = []
      playerList.push(...Object.keys(state.teams[awayTeamId]))
      playerList.push(...Object.keys(state.teams[homeTeamId]))
      const isOnATeam =
        playerList.includes(user.id.toString()) || isLeagueAdmin(user)
      return isOnATeam
    } catch (e) {
      console.error(e)
      return false
    }
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

  const hasBreak =
    (teamId === homeTeamId &&
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
      state.frameData[frameIndex].frameNumber % 2 === 0)

  function slotProps(slot: number, pressed: boolean, onPressIn: () => void, onPressOut: () => void) {
    const playerId = playerIds[slot]
    const nickname = state?.teams?.[teamId]?.[playerId]?.nickname
    return {
      filled: typeof playerId !== 'undefined' && !!nickname,
      nickname,
      ink,
      label: t('player'),
      pressed,
      onPress: () => handlePlayerSlotPress(slot),
      onPressIn,
      onPressOut,
    }
  }

  if (refreshing) {
    return (
      <View style={{alignItems: 'center', gap: 10}}>
        <PlayerSkeleton ink={ink} />
        {(frameType === '8d' || frameType === '9d') && <PlayerSkeleton ink={ink} />}
        {hasBreak && (
          <View
            style={{
              width: 48,
              height: 16,
              borderRadius: 999,
              backgroundColor: ink,
              opacity: 0.25,
            }}
          />
        )}
      </View>
    )
  }

  return (
    <View style={{alignItems: 'center'}}>
      <PlayerSlot
        {...slotProps(0, isPressed, () => setIsPressed(true), () => setIsPressed(false))}
      />
      {(frameType === '8d' || frameType === '9d') && (
        <View style={{marginTop: 8}}>
          <PlayerSlot
            {...slotProps(
              1,
              isDoublePressed,
              () => setIsDoublePressed(true),
              () => setIsDoublePressed(false),
            )}
          />
        </View>
      )}
      {hasBreak && (
        <View
          style={{
            marginTop: 8,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: mark,
          }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 0.6,
            }}>
            {t('break').toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  )
}
