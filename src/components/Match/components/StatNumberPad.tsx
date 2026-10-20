import * as Haptics from 'expo-haptics'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Modal, Platform, Pressable, Text, View} from 'react-native'
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context'
import {useScoresheetTheme} from './scoresheetTheme'

type StatNumberPadProps = {
  visible: boolean
  title: string
  value: number
  max?: number
  accent: string
  onCancel: () => void
  onConfirm: (value: number) => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const

function StatNumberPadSheet({
  title,
  value,
  max = 999,
  accent,
  onCancel,
  onConfirm,
}: Omit<StatNumberPadProps, 'visible'>) {
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const insets = useSafeAreaInsets()
  const [digits, setDigits] = useState(value > 0 ? String(value) : '')

  useEffect(() => {
    setDigits(value > 0 ? String(value) : '')
  }, [value])

  const display = digits === '' ? '0' : digits
  const parsed = Math.min(max, Math.max(0, Math.trunc(Number(display) || 0)))
  const bottomPad = Math.max(insets.bottom, 16) + 16

  function tap(key: (typeof KEYS)[number]) {
    Haptics.selectionAsync()
    if (key === 'clear') {
      setDigits('')
      return
    }
    if (key === 'back') {
      setDigits(d => d.slice(0, -1))
      return
    }
    setDigits(d => {
      const next = `${d}${key}`.replace(/^0+(?=\d)/, '')
      if (next.length > 3) return d
      const n = Number(next)
      if (!Number.isFinite(n) || n > max) return d
      return next
    })
  }

  return (
    <Pressable
      onPress={onCancel}
      style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
      }}>
      <Pressable
        onPress={e => e.stopPropagation()}
        style={{
          backgroundColor: theme.card,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: bottomPad,
          borderWidth: 1,
          borderColor: theme.cardBorder,
        }}>
        <Text
          style={{
            color: theme.muted,
            fontSize: 12,
            fontWeight: '800',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            textAlign: 'center',
          }}>
          {title}
        </Text>
        <Text
          style={{
            marginTop: 10,
            marginBottom: 14,
            color: theme.text,
            fontSize: 36,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
            textAlign: 'center',
          }}>
          {display}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'center',
          }}>
          {KEYS.map(key => (
            <Pressable
              key={key}
              onPress={() => tap(key)}
              style={{
                width: '30%',
                maxWidth: 110,
                minHeight: 48,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.cardBorder,
                backgroundColor: theme.faint,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text
                style={{
                  color: theme.text,
                  fontSize: key === 'clear' || key === 'back' ? 13 : 22,
                  fontWeight: '800',
                }}>
                {key === 'clear' ? t('clear') : key === 'back' ? '⌫' : key}
              </Text>
            </Pressable>
          ))}
        </View>
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            marginTop: 16,
          }}>
          <Pressable
            onPress={onCancel}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: theme.cardBorder,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{color: theme.muted, fontWeight: '800'}}>
              {t('cancel')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              onConfirm(parsed)
            }}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              backgroundColor: accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{color: '#fff', fontWeight: '800'}}>
              {t('confirm')}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  )
}

export default function StatNumberPad({
  visible,
  ...sheetProps
}: StatNumberPadProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      // Android edge-to-edge: draw under the nav bar so insets apply correctly.
      {...(Platform.OS === 'android'
        ? ({navigationBarTranslucent: true} as object)
        : null)}
      onRequestClose={sheetProps.onCancel}>
      {/* Modal is a new window — remount safe-area so bottom inset is non-zero. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatNumberPadSheet {...sheetProps} />
      </SafeAreaProvider>
    </Modal>
  )
}
