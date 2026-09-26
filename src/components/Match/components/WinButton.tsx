import ConfirmDialog from '@/components/ConfirmDialog'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import * as React from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, Text} from 'react-native'
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
  const [isPressed, setIsPressed] = React.useState(false)
  const [trackedWinner, setTrackedWinner] = React.useState(winner)

  if (winner !== trackedWinner) {
    setTrackedWinner(winner)
    setIsPressed(false)
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
            HandleWin(side)
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
            ClearWinner()
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
          onPress={() => setShowConfirmUndo(true)}
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
          onLongPress={() => HandleWin(side, true)}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
            HandleWin(side)
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
          onPress={() => setShowConfirm(true)}
          style={{...bar, backgroundColor: theme.faint}}>
          <MCI name="close" color={theme.muted} size={18} />
        </Pressable>
      )}
    </>
  )
}
