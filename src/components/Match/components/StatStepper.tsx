import * as Haptics from 'expo-haptics'
import {Pressable, Text, View} from 'react-native'

type StatStepperProps = {
  label: string
  value: number
  ink: string
  accent: string
  onDelta: (delta: number) => void
  disabled?: boolean
}

export default function StatStepper({
  label,
  value,
  ink,
  accent,
  onDelta,
  disabled = false,
}: StatStepperProps) {
  const bump = (delta: number) => {
    if (disabled) return
    if (delta < 0 && value <= 0) return
    Haptics.selectionAsync()
    onDelta(delta)
  }

  return (
    <View style={{alignItems: 'center', minWidth: 52}}>
      <Text
        style={{
          color: ink,
          opacity: 0.7,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          marginBottom: 2,
        }}>
        {label}
      </Text>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
        <Pressable
          onPress={() => bump(-1)}
          hitSlop={8}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled || value <= 0 ? 0.35 : 1,
          }}>
          <Text style={{color: accent, fontWeight: '800', fontSize: 14}}>−</Text>
        </Pressable>
        <Text
          style={{
            color: ink,
            fontSize: 16,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
            minWidth: 18,
            textAlign: 'center',
          }}>
          {value}
        </Text>
        <Pressable
          onPress={() => bump(1)}
          hitSlop={8}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.35 : 1,
          }}>
          <Text style={{color: accent, fontWeight: '800', fontSize: 14}}>+</Text>
        </Pressable>
      </View>
    </View>
  )
}
