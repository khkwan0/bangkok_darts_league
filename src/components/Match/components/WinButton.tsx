import {Pressable, useColorScheme, View} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {useMatchContext} from '@/context/MatchContext'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import ConfirmDialog from '@/components/ConfirmDialog'
import * as React from 'react'
import {useTranslation} from 'react-i18next'
import * as Haptics from 'expo-haptics'
interface WinButtonProps {
  winner: number
  HandleWin: Function
  ClearWinner: Function
  teamId?: number | string
  side: string
  goldenBreak: boolean
  gameType: string
}
export default function WinButton({
  winner,
  HandleWin,
  ClearWinner,
  teamId,
  side,
  goldenBreak,
}: WinButtonProps) {
  const theme = useColorScheme()
  const borderColor = theme === 'dark' ? '#aaa' : '#222'
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [showConfirmUndo, setShowConfirmUndo] = React.useState(false)
  const {t} = useTranslation()
  const colorScheme = useColorScheme()
  const [isPressed, setIsPressed] = React.useState(false)

  React.useEffect(() => {
    setIsPressed(false)
  }, [winner])

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
        <Pressable className="p-2" onPress={() => setShowConfirmUndo(true)}>
          {colorScheme === 'light' && goldenBreak && (
            <View className="bg-blue-900 rounded-full p-2">
              <MCI name="check" color="yellow" size={30} />
            </View>
          )}
          {colorScheme === 'light' && !goldenBreak && (
            <MCI name="check" color="green" size={30} />
          )}
          {colorScheme === 'dark' && (
            <MCI
              name="check"
              color={goldenBreak ? 'yellow' : 'green'}
              size={30}
            />
          )}
        </Pressable>
      )}
      {winner !== teamId && !winner && (
        <Pressable
          className={`p-2 border rounded-xl ${isPressed ? 'bg-blue-500' : ''}`}
          style={{borderColor: borderColor}}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          onLongPress={() => HandleWin(side, true)}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
            HandleWin(side)
          }}
        >
          <Text type="subtitle">{t('win').toUpperCase()}</Text>
        </Pressable>
      )}
      {winner !== teamId && winner !== 0 && (
        <Pressable className="p-2" onPress={() => setShowConfirm(true)}>
          <MCI name="close-circle-outline" color="red" size={30} />
        </Pressable>
      )}
    </>
  )
}
