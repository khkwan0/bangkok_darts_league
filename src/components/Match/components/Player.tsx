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
import {useScoresheetTheme} from './scoresheetTheme'

interface PlayerProps {
  teamId: number | string
  side: string
  frameIndex: number
  frameNumber: number
  frameType?: string
  minPlayers?: number
  maxPlayers?: number
  noPlayers?: number
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
  pressColor,
  label,
  pressed,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
}: {
  filled: boolean
  nickname?: string
  ink: string
  pressColor: string
  label: string
  pressed: boolean
  onPress: () => void
  onLongPress?: () => void
  onPressIn: () => void
  onPressOut: () => void
}) {
  const color = pressed ? pressColor : ink
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{paddingVertical: 2}}>
      <Row alignItems="center" justifyContent="center" style={{gap: 6}}>
        {filled ? (
          <Text
            numberOfLines={2}
            style={{
              color,
              fontSize: 16,
              lineHeight: 20,
              fontWeight: '800',
              textAlign: 'center',
            }}>
            {nickname}
          </Text>
        ) : (
          <>
            <MCI name="plus" size={16} color={color} />
            <Text style={{color, fontSize: 15, fontWeight: '700'}}>
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
  minPlayers,
  maxPlayers,
  noPlayers,
  playerIds,
  refreshing = false,
  ink,
  mark,
}: PlayerProps) {
  const {state, UpdateFramePlayers}: any = useMatchContext()
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const [pressedSlot, setPressedSlot] = useState<number | null>(null)
  const {state: playerState}: any = useLeagueContext()
  const user = playerState.user
  const {home_team_id: homeTeamId, away_team_id: awayTeamId} = state.matchInfo
  const minCount = Math.max(1, Number(minPlayers ?? noPlayers ?? 1))
  const maxCount = Math.max(minCount, Number(maxPlayers ?? minCount))
  const assigned = (playerIds ?? []).filter(
    id => id != null && Number(id) > 0,
  )
  const isFlexible = maxCount > minCount
  // Fixed slots (singles/doubles): always show maxCount slots.
  // Team frames: show filled + one add slot while under max.
  const slotCount = isFlexible
    ? Math.min(maxCount, assigned.length + 1)
    : maxCount

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
    if (state.finalizedHome && state.finalizedAway) {
      Alert.alert(t('match_completed'))
      return
    }
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

  const handleRemovePlayer = (slot: number) => {
    if (state.finalizedHome && state.finalizedAway) {
      Alert.alert(t('match_completed'))
      return
    }
    if (!isPlayerOnTeam()) {
      Alert.alert(t('user_not_on_team'))
      return
    }
    const initial = state.matchInfo.initialFrames[frameIndex]
    Alert.alert(t('remove_player'), t('remove_player_confirm'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('remove'),
        style: 'destructive',
        onPress: () => {
          UpdateFramePlayers(
            frameIndex,
            side,
            slot,
            0,
            '',
            false,
            frameType || initial?.type,
            frameNumber,
          )
        },
      },
    ])
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

  function slotProps(slot: number) {
    const playerId = playerIds[slot]
    const nickname = state?.teams?.[teamId]?.[playerId]?.nickname
    const filled = typeof playerId !== 'undefined' && !!nickname
    return {
      filled,
      nickname,
      ink,
      pressColor: theme.win,
      label: t('player'),
      pressed: pressedSlot === slot,
      onPress: () => handlePlayerSlotPress(slot),
      onLongPress: filled ? () => handleRemovePlayer(slot) : undefined,
      onPressIn: () => setPressedSlot(slot),
      onPressOut: () => setPressedSlot(null),
    }
  }

  if (refreshing) {
    return (
      <View style={{alignItems: 'center', gap: 10}}>
        {Array.from({length: Math.min(slotCount, 4)}, (_, slot) => (
          <PlayerSkeleton key={slot} ink={ink} />
        ))}
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
      {Array.from({length: slotCount}, (_, slot) => (
        <View key={slot} style={slot > 0 ? {marginTop: 8} : undefined}>
          <PlayerSlot {...slotProps(slot)} />
        </View>
      ))}
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
