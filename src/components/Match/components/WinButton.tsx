import ConfirmDialog from '@/components/ConfirmDialog'
import {useLeagueContext} from '@/context/LeagueContext'
import {useMatchContext} from '@/context/MatchContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import * as React from 'react'
import {useTranslation} from 'react-i18next'
import {Alert, Pressable, Text} from 'react-native'
import {useScoresheetTheme} from './scoresheetTheme'

interface WinButtonProps {
  winner: number
  HandleWin: Function
  ClearWinner: Function
  teamId?: number | string
  side: string
  goldenBreak: boolean
  accent: string
  onAccent: string
}

export default function WinButton({
  winner,
  HandleWin,
  ClearWinner,
  teamId,
  side,
  goldenBreak,
  accent,
  onAccent,
}: WinButtonProps) {
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [showConfirmUndo, setShowConfirmUndo] = React.useState(false)
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const {state}: any = useMatchContext()
  const {state: leagueState}: any = useLeagueContext()
  const user = leagueState.user
  const [isPressed, setIsPressed] = React.useState(false)
  const [trackedWinner, setTrackedWinner] = React.useState(winner)

  if (winner !== trackedWinner) {
    setTrackedWinner(winner)
    setIsPressed(false)
  }

  function canRecord(): boolean {
    if (state.finalizedHome && state.finalizedAway) {
      Alert.alert(t('match_completed'))
      return false
    }
    if (typeof user?.id === 'undefined') {
      Alert.alert(t('user_not_logged_in'))
      return false
    }
    try {
      const {home_team_id: homeTeamId, away_team_id: awayTeamId} =
        state.matchInfo
      const playerList = [
        ...Object.keys(state.teams?.[awayTeamId] ?? {}),
        ...Object.keys(state.teams?.[homeTeamId] ?? {}),
      ]
      if (playerList.includes(user.id.toString()) || isLeagueAdmin(user)) {
        return true
      }
    } catch (e) {
      console.error(e)
    }
    Alert.alert(t('user_not_on_team'))
    return false
  }

  function tryWin(withGoldenBreak = false) {
    if (!canRecord()) return
    HandleWin(side, withGoldenBreak)
  }

  function tryClear() {
    if (!canRecord()) return
    ClearWinner()
  }

  const bar = {
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    alignSelf: 'stretch' as const,
    marginTop: 10,
  }

  return (
    <>
      {showConfirm && (
        <ConfirmDialog
          onConfirm={() => {
            tryWin()
            setShowConfirm(false)
          }}
          onCancel={() => setShowConfirm(false)}
          isVisible={showConfirm}
          title={t('confirm_winner_change')}
          message={t('confirm_winner_change_message')}
        />
      )}
      {showConfirmUndo && (
        <ConfirmDialog
          onConfirm={() => {
            tryClear()
            setShowConfirmUndo(false)
          }}
          onCancel={() => setShowConfirmUndo(false)}
          isVisible={showConfirmUndo}
          title={t('confirm_clear_winner')}
          message={t('confirm_clear_winner_message')}
        />
      )}
      {winner === teamId && (
        <Pressable
          onPress={() => {
            if (!canRecord()) return
            setShowConfirmUndo(true)
          }}
          style={{
            ...bar,
            backgroundColor: goldenBreak ? theme.gold : theme.win,
          }}>
          <MCI
            name={goldenBreak ? 'star' : 'check'}
            color={goldenBreak ? theme.goldInk : '#FFFFFF'}
            size={20}
          />
        </Pressable>
      )}
      {winner !== teamId && !winner && (
        <Pressable
          style={{
            ...bar,
            borderWidth: 1.5,
            borderColor: accent,
            backgroundColor: isPressed ? accent : 'transparent',
          }}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          onLongPress={() => tryWin(true)}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
            tryWin()
          }}>
          <Text
            style={{
              color: isPressed ? onAccent : accent,
              fontSize: 14,
              fontWeight: '800',
              letterSpacing: 0.8,
            }}>
            {t('win').toUpperCase()}
          </Text>
        </Pressable>
      )}
      {winner !== teamId && winner !== 0 && (
        <Pressable
          onPress={() => {
            if (!canRecord()) return
            setShowConfirm(true)
          }}
          style={{...bar, backgroundColor: theme.faint}}>
          <MCI name="close" color={theme.muted} size={18} />
        </Pressable>
      )}
    </>
  )
}
