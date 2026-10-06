import * as Haptics from 'expo-haptics'
import {Pressable, Text, View} from 'react-native'

type StatStepperProps = {
  label: string
  value: number
  ink: string
  accent: string
  onDelta: (delta: number) => void
  disabled?: boolean
  size?: 'default' | 'compact'
}

export default function StatStepper({
  label,
  value,
  ink,
  accent,
  onDelta,
  disabled = false,
  size = 'default',
}: StatStepperProps) {
  const compact = size === 'compact'
  const bump = (delta: number) => {
    if (disabled) return
    if (delta < 0 && value <= 0) return
    Haptics.selectionAsync()
    onDelta(delta)
  }

  const btn = compact ? 18 : 22
  const font = compact ? 13 : 16
  const labelSize = compact ? 9 : 10

  return (
    <View style={{alignItems: 'center', minWidth: compact ? 40 : 52}}>
      <Text
        style={{
          color: ink,
          opacity: 0.7,
          fontSize: labelSize,
          fontWeight: '700',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          marginBottom: 2,
        }}>
        {label}
      </Text>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: compact ? 2 : 4}}>
        <Pressable
          onPress={() => bump(-1)}
          hitSlop={compact ? 6 : 8}
          style={{
            width: btn,
            height: btn,
            borderRadius: compact ? 5 : 6,
            borderWidth: 1,
            borderColor: accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled || value <= 0 ? 0.35 : 1,
          }}>
          <Text style={{color: accent, fontWeight: '800', fontSize: compact ? 12 : 14}}>
            −
          </Text>
        </Pressable>
        <Text
          style={{
            color: ink,
            fontSize: font,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
            minWidth: compact ? 14 : 18,
            textAlign: 'center',
          }}>
          {value}
        </Text>
        <Pressable
          onPress={() => bump(1)}
          hitSlop={compact ? 6 : 8}
          style={{
            width: btn,
            height: btn,
            borderRadius: compact ? 5 : 6,
            borderWidth: 1,
            borderColor: accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.35 : 1,
          }}>
          <Text style={{color: accent, fontWeight: '800', fontSize: compact ? 12 : 14}}>
            +
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
