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
  /**
   * `stack` — label above controls (player panels).
   * `inline` — label left, controls right; full-width rows for narrow columns.
   */
  layout?: 'stack' | 'inline'
}

export default function StatStepper({
  label,
  value,
  ink,
  accent,
  onDelta,
  disabled = false,
  size = 'default',
  layout = 'stack',
}: StatStepperProps) {
  const compact = size === 'compact'
  const inline = layout === 'inline'
  const bump = (delta: number) => {
    if (disabled) return
    if (delta < 0 && value <= 0) return
    Haptics.selectionAsync()
    onDelta(delta)
  }

  // Inline rows need finger-sized targets in half-width Race-to-N columns.
  const btn = inline ? 32 : compact ? 22 : 28
  const font = inline ? 16 : compact ? 13 : 16
  const labelSize = inline ? 11 : compact ? 9 : 10
  const glyph = inline ? 18 : compact ? 14 : 16
  const radius = inline ? 8 : compact ? 6 : 7

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

  const controls = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: inline ? 8 : compact ? 4 : 6,
      }}>
      <Pressable
        onPress={() => bump(-1)}
        hitSlop={inline ? 8 : compact ? 8 : 10}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        style={{
          width: btn,
          height: btn,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: accent,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled || value <= 0 ? 0.35 : 1,
        }}>
        <Text style={{color: accent, fontWeight: '800', fontSize: glyph}}>
          −
        </Text>
      </Pressable>
      <Text
        style={{
          color: ink,
          fontSize: font,
          fontWeight: '800',
          fontVariant: ['tabular-nums'],
          minWidth: inline ? 22 : compact ? 16 : 20,
          textAlign: 'center',
        }}>
        {value}
      </Text>
      <Pressable
        onPress={() => bump(1)}
        hitSlop={inline ? 8 : compact ? 8 : 10}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        style={{
          width: btn,
          height: btn,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: accent,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.35 : 1,
        }}>
        <Text style={{color: accent, fontWeight: '800', fontSize: glyph}}>
          +
        </Text>
      </Pressable>
    </View>
  )

  if (inline) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          minHeight: btn,
          gap: 8,
        }}>
        {labelEl}
        {controls}
      </View>
    )
  }

  return (
    <View style={{alignItems: 'center', minWidth: compact ? 48 : 56}}>
      {labelEl}
      {controls}
    </View>
  )
}
