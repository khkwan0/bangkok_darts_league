import {
  useBetting,
  type BettingMarket,
} from '@/hooks/useBetting'
import {useLeagueContext} from '@/context/LeagueContext'
import {formatBettingOdds} from '@/lib/bettingOddsFormat'
import {ThemedText as Text} from '@/components/ThemedText'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {LinearGradient} from 'expo-linear-gradient'
import {useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {ActivityIndicator, Pressable, View} from 'react-native'

type Props = {
  matchId: number
  homeShort?: string
  awayShort?: string
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

function moneylineLabel(
  markets: BettingMarket[],
  formatOdds: (n: number) => string,
) {
  const ml = markets.find(m => m.market_type === 'moneyline')
  if (!ml) return null
  const home = ml.selections.find(s => s.selection_key === 'home')?.odds
  const away = ml.selections.find(s => s.selection_key === 'away')?.odds
  if (home == null || away == null) return null
  return `${formatOdds(home)} / ${formatOdds(away)}`
}

function spreadLabel(
  markets: BettingMarket[],
  formatOdds: (n: number) => string,
) {
  const spread = markets.find(m => m.market_type === 'spread')
  if (!spread || spread.line == null) return null
  const home = spread.selections.find(s => s.selection_key === 'home')?.odds
  const away = spread.selections.find(s => s.selection_key === 'away')?.odds
  if (home == null || away == null) return null
  const line = Number(spread.line)
  const homeLine = `${line > 0 ? '+' : ''}${line}`
  const awayLineNum = -line
  const awayLine = `${awayLineNum > 0 ? '+' : ''}${awayLineNum}`
  return `${homeLine} ${formatOdds(home)} / ${awayLine} ${formatOdds(away)}`
}

export default function MatchBettingRow({
  matchId,
  accent = '#3B82F6',
}: Props) {
  const {t} = useTranslation()
  const router = useRouter()
  const {state} = useLeagueContext()
  const betting = useBetting()
  const [markets, setMarkets] = React.useState<BettingMarket[]>([])
  const [loading, setLoading] = React.useState(true)

  const showBetting =
    state.bettingOptedIn && !state.hideBettingUi && !!state.user?.id

  const oddsFormat = state.bettingOddsFormat ?? 'european'
  const formatOdds = React.useCallback(
    (n: number) => formatBettingOdds(n, oddsFormat),
    [oddsFormat],
  )

  React.useEffect(() => {
    if (!showBetting || !matchId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await betting.getMarkets(matchId)
        if (!cancelled) setMarkets(data.markets)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showBetting, matchId])

  if (!showBetting || !matchId) return null

  const start = mixHex(accent, '#000000', 0.15)
  const end = mixHex(accent, '#ffffff', 0.2)
  const mlText = moneylineLabel(markets, formatOdds)
  const spText = spreadLabel(markets, formatOdds)

  return (
    <View style={{marginTop: 10}}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('betting_odds')}
        onPress={() =>
          router.push({
            pathname: '/Betting/[matchId]' as any,
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
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 14,
            minHeight: 52,
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
                fontSize: 16,
                fontWeight: '800',
                color: '#FFFFFF',
                letterSpacing: 0.2,
              }}>
              {t('betting_odds')}
            </Text>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                {mlText ? (
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: 'rgba(255,255,255,0.92)',
                    }}
                    numberOfLines={1}>
                    {mlText}
                  </Text>
                ) : null}
                {mlText && spText ? (
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: 'rgba(255,255,255,0.55)',
                    }}>
                    ·
                  </Text>
                ) : null}
                {spText ? (
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: 'rgba(255,255,255,0.92)',
                    }}
                    numberOfLines={1}>
                    {spText}
                  </Text>
                ) : null}
              </>
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
