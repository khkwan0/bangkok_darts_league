import * as Haptics from 'expo-haptics'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, Text, View} from 'react-native'
import {useScoresheetTheme} from './scoresheetTheme'

type Props = {
  title: string
  value: number
  max?: number
  accent: string
  onCancel: () => void
  onConfirm: (value: number) => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const

/** Number pad body for the Duo side pane (no modal chrome). */
export default function StatNumberPadInline({
  title,
  value,
  max = 999,
  accent,
  onCancel,
  onConfirm,
}: Props) {
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const [digits, setDigits] = useState(value > 0 ? String(value) : '')

  useEffect(() => {
    setDigits(value > 0 ? String(value) : '')
  }, [value])

  const display = digits === '' ? '0' : digits
  const parsed = Math.min(max, Math.max(0, Math.trunc(Number(display) || 0)))

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
    <View
      style={{
        flex: 1,
        backgroundColor: theme.card,
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
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
      <View style={{flexDirection: 'row', gap: 10, marginTop: 16}}>
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
    </View>
  )
}
