import {useLeagueContext} from '@/context/LeagueContext'
import {usePredictions} from '@/hooks/usePredictions'
import {ThemedText as Text} from '@/components/ThemedText'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {LinearGradient} from 'expo-linear-gradient'
import {useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {ActivityIndicator, Pressable, View} from 'react-native'

type Props = {
  matchId: number
  accent?: string
}

function mixHex(hex: string, toward: string, amount: number) {
  const parse = (h: string) => {
    const n = h.replace('#', '')
    const full =
      n.length === 3
        ? n
            .split('')
            .map(c => c + c)
            .join('')
        : n
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ] as const
  }
  try {
    const [r1, g1, b1] = parse(hex)
    const [r2, g2, b2] = parse(toward)
    const r = Math.round(r1 + (r2 - r1) * amount)
    const g = Math.round(g1 + (g2 - g1) * amount)
    const b = Math.round(b1 + (b2 - b1) * amount)
    return `rgb(${r},${g},${b})`
  } catch {
    return hex
  }
}

export default function MatchPredictionRow({
  matchId,
  accent = '#0EA5E9',
}: Props) {
  const {t} = useTranslation()
  const router = useRouter()
  const {state} = useLeagueContext()
  const predictions = usePredictions()
  const [summary, setSummary] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  const show =
    state.predictionsEnabled &&
    (state.showPredictionsOnMatchCards ?? true) &&
    !!state.user?.id &&
    Number(matchId) > 0

  React.useEffect(() => {
    if (!show) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await predictions.getMatch(matchId)
        if (cancelled) return
        if (res.ok && res.data?.prediction) {
          const tip = res.data.prediction
          const side =
            tip.predicted_side === 'home'
              ? t('predictions_home')
              : t('predictions_away')
          setSummary(
            t('predictions_row_tip', {
              side,
              margin: tip.predicted_margin,
            }),
          )
        } else {
          setSummary(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [show, matchId])

  if (!show) return null

  const start = mixHex(accent, '#000000', 0.12)
  const end = mixHex(accent, '#ffffff', 0.18)

  return (
    <View style={{marginTop: 8}}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('predictions_title')}
        onPress={() =>
          router.push({
            pathname: '/Predictions/[matchId]' as any,
            params: {matchId: String(matchId)},
          })
        }
        style={({pressed}) => ({
          borderRadius: 14,
          overflow: 'hidden',
          opacity: pressed ? 0.9 : 1,
          transform: [{scale: pressed ? 0.98 : 1}],
        })}>
        <LinearGradient
          colors={[start, accent, end]}
          locations={[0, 0.55, 1]}
          start={{x: 0, y: 0.5}}
          end={{x: 1, y: 0.5}}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 14,
            minHeight: 48,
          }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              paddingRight: 10,
            }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '800',
                color: '#FFFFFF',
                letterSpacing: 0.2,
              }}>
              {t('predictions_title')}
            </Text>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : summary ? (
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.92)',
                }}
                numberOfLines={1}>
                {summary}
              </Text>
            ) : (
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.85)',
                }}>
                {t('predictions_tap_to_tip')}
              </Text>
            )}
          </View>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MCI name="arrow-right" size={20} color="#FFFFFF" />
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  )
}
