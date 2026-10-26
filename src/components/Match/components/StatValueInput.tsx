import * as Haptics from 'expo-haptics'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Alert, Pressable, Text, View} from 'react-native'
import StatNumberPad from './StatNumberPad'

type StatValueInputProps = {
  label: string
  value: number
  ink: string
  accent: string
  disabled?: boolean
  size?: 'default' | 'compact'
  /** `inline` matches StatStepper full-width rows in Race-to-N leg tallies. */
  layout?: 'stack' | 'inline'
  max?: number
  /** Return false to reject (after optional warning). */
  isValid?: (value: number) => boolean
  invalidTitle?: string
  invalidMessage?: string
  onChange: (value: number) => void
}

/** Tappable stat value that opens an in-app number pad. */
export default function StatValueInput({
  label,
  value,
  ink,
  accent,
  disabled = false,
  size = 'default',
  layout = 'stack',
  max = 999,
  isValid,
  invalidTitle,
  invalidMessage,
  onChange,
}: StatValueInputProps) {
  const {t} = useTranslation()
  const [open, setOpen] = useState(false)
  const compact = size === 'compact'
  const inline = layout === 'inline'
  const font = inline ? 16 : compact ? 13 : 16
  const labelSize = inline ? 11 : compact ? 9 : 10
  const boxMinW = inline ? 56 : compact ? 40 : 48
  const boxMinH = inline ? 32 : compact ? 28 : 32

  function applyValue(next: number) {
    if (isValid && !isValid(next)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Alert.alert(
        invalidTitle ?? t('invalid_checkout_title'),
        invalidMessage ?? t('invalid_checkout_message', {value: next}),
        [
          {
            text: t('edit'),
            style: 'cancel',
            onPress: () => setOpen(true),
          },
          {
            text: t('use_anyway'),
            onPress: () => {
              setOpen(false)
              if (next !== value) onChange(next)
            },
          },
        ],
      )
      return
    }
    setOpen(false)
    if (next !== value) onChange(next)
  }

  const labelEl = (
    <Text
      style={{
        color: ink,
        opacity: 0.7,
        fontSize: labelSize,
        fontWeight: '700',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        marginBottom: inline ? 0 : 2,
        flexShrink: 1,
      }}>
      {label}
    </Text>
  )

  const valueBox = (
    <View
      style={{
        minWidth: boxMinW,
        minHeight: boxMinH,
        paddingHorizontal: inline ? 10 : compact ? 6 : 8,
        borderRadius: inline ? 8 : compact ? 6 : 8,
        borderWidth: 1.5,
        borderColor: accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text
        style={{
          color: ink,
          fontSize: font,
          fontWeight: '800',
          fontVariant: ['tabular-nums'],
        }}>
        {value}
      </Text>
    </View>
  )

  return (
    <>
      <Pressable
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${label}`}
        onPress={() => {
          if (disabled) return
          Haptics.selectionAsync()
          setOpen(true)
        }}
        style={
          inline
            ? {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                minHeight: boxMinH,
                gap: 8,
                opacity: disabled ? 0.35 : 1,
              }
            : {
                alignItems: 'center',
                minWidth: compact ? 48 : 56,
                opacity: disabled ? 0.35 : 1,
              }
        }>
        {labelEl}
        {valueBox}
      </Pressable>
      <StatNumberPad
        visible={open}
        title={label}
        value={value}
        max={max}
        accent={accent}
        onCancel={() => setOpen(false)}
        onConfirm={next => {
          // Keep pad mounted until validation resolves (Edit reopens).
          setOpen(false)
          applyValue(next)
        }}
      />
    </>
  )
}
