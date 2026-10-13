import {
  useBetting,
  type BettingMarket,
  type BettingMarketType,
  type BettingSelectionKey,
} from '@/hooks/useBetting'
import {useLeagueContext} from '@/context/LeagueContext'
import {ThemedText as Text} from '@/components/ThemedText'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  useColorScheme,
  View,
} from 'react-native'

const STAKE_CHIPS = [50, 100, 250, 500, 1000]

type Props = {
  matchId: number
  homeShort?: string
  awayShort?: string
  accent?: string
}

function formatOdds(n: number) {
  return Number(n).toFixed(2)
}

function formatLine(market: BettingMarket) {
  if (market.line == null) return ''
  const line = Number(market.line)
  if (market.market_type === 'spread') {
    const sign = line > 0 ? '+' : ''
    return `${sign}${line}`
  }
  return String(line)
}

export default function MatchBettingRow({
  matchId,
  homeShort = 'Home',
  awayShort = 'Away',
  accent = '#3B82F6',
}: Props) {
  const {t} = useTranslation()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const {state} = useLeagueContext()
  const betting = useBetting()
  const [markets, setMarkets] = React.useState<BettingMarket[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sheet, setSheet] = React.useState<{
    marketType: BettingMarketType
    selectionKey: BettingSelectionKey
    odds: number
    label: string
  } | null>(null)
  const [stake, setStake] = React.useState(100)
  const [submitting, setSubmitting] = React.useState(false)

  const showBetting =
    state.bettingOptedIn && !state.hideBettingUi && !!state.user?.id

  React.useEffect(() => {
    if (!showBetting || !matchId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await betting.getMarkets(matchId)
        if (!cancelled) setMarkets(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showBetting, matchId])

  if (!showBetting) return null

  const locked = markets.some(m => m.status !== 'open') && markets.length > 0
  const allClosed =
    markets.length > 0 && markets.every(m => m.status !== 'open')

  const openSheet = (
    market: BettingMarket,
    selectionKey: BettingSelectionKey,
    label: string,
  ) => {
    if (market.status !== 'open') return
    const sel = market.selections.find(s => s.selection_key === selectionKey)
    if (!sel) return
    setStake(100)
    setSheet({
      marketType: market.market_type,
      selectionKey,
      odds: sel.odds,
      label,
    })
  }

  const submit = async () => {
    if (!sheet) return
    setSubmitting(true)
    try {
      const res = await betting.placeBet({
        matchId,
        marketType: sheet.marketType,
        selectionKey: sheet.selectionKey,
        stake,
      })
      if (res.ok) {
        setSheet(null)
        Alert.alert(t('betting_success'))
        const data = await betting.getMarkets(matchId)
        setMarkets(data)
      } else {
        Alert.alert(t('betting_failed'), res.error)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const ml = markets.find(m => m.market_type === 'moneyline')
  const spread = markets.find(m => m.market_type === 'spread')
  const total = markets.find(m => m.market_type === 'total')

  const chipBg = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.06)'
  const textColor = isDark ? '#F8FAFC' : '#0F172A'
  const muted = isDark ? 'rgba(226,232,240,0.65)' : 'rgba(51,65,85,0.75)'

  const OddChip = ({
    label,
    odds,
    onPress,
    disabled,
  }: {
    label: string
    odds: number
    onPress: () => void
    disabled?: boolean
  }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => ({
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: 8,
        backgroundColor: chipBg,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        alignItems: 'center',
      })}>
      <Text style={{fontSize: 11, color: muted}} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{fontSize: 14, fontWeight: '700', color: accent}}>
        {formatOdds(odds)}
      </Text>
    </Pressable>
  )

  return (
    <View style={{marginTop: 10, gap: 8}}>
      {loading ? (
        <ActivityIndicator size="small" color={accent} />
      ) : allClosed ? (
        <Text style={{fontSize: 12, color: muted}}>{t('betting_locked')}</Text>
      ) : (
        <>
          {ml ? (
            <View style={{flexDirection: 'row', gap: 6}}>
              <OddChip
                label={homeShort}
                odds={
                  ml.selections.find(s => s.selection_key === 'home')?.odds ??
                  0
                }
                disabled={ml.status !== 'open'}
                onPress={() => openSheet(ml, 'home', homeShort)}
              />
              <OddChip
                label={awayShort}
                odds={
                  ml.selections.find(s => s.selection_key === 'away')?.odds ??
                  0
                }
                disabled={ml.status !== 'open'}
                onPress={() => openSheet(ml, 'away', awayShort)}
              />
            </View>
          ) : null}
          {spread ? (
            <View style={{flexDirection: 'row', gap: 6, alignItems: 'center'}}>
              <Text style={{fontSize: 11, color: muted, width: 52}}>
                {t('betting_spread')}
              </Text>
              <OddChip
                label={`${homeShort} ${formatLine(spread)}`}
                odds={
                  spread.selections.find(s => s.selection_key === 'home')
                    ?.odds ?? 0
                }
                disabled={spread.status !== 'open'}
                onPress={() =>
                  openSheet(
                    spread,
                    'home',
                    `${homeShort} ${formatLine(spread)}`,
                  )
                }
              />
              <OddChip
                label={awayShort}
                odds={
                  spread.selections.find(s => s.selection_key === 'away')
                    ?.odds ?? 0
                }
                disabled={spread.status !== 'open'}
                onPress={() => openSheet(spread, 'away', awayShort)}
              />
            </View>
          ) : null}
          {total ? (
            <View style={{flexDirection: 'row', gap: 6, alignItems: 'center'}}>
              <Text style={{fontSize: 11, color: muted, width: 52}}>
                {t('betting_total')} {formatLine(total)}
              </Text>
              <OddChip
                label={t('betting_over')}
                odds={
                  total.selections.find(s => s.selection_key === 'over')
                    ?.odds ?? 0
                }
                disabled={total.status !== 'open'}
                onPress={() =>
                  openSheet(total, 'over', `${t('betting_over')} ${formatLine(total)}`)
                }
              />
              <OddChip
                label={t('betting_under')}
                odds={
                  total.selections.find(s => s.selection_key === 'under')
                    ?.odds ?? 0
                }
                disabled={total.status !== 'open'}
                onPress={() =>
                  openSheet(
                    total,
                    'under',
                    `${t('betting_under')} ${formatLine(total)}`,
                  )
                }
              />
            </View>
          ) : null}
          {locked && !allClosed ? (
            <Text style={{fontSize: 11, color: muted}}>
              {t('betting_locked')}
            </Text>
          ) : null}
        </>
      )}

      <Modal
        visible={!!sheet}
        transparent
        animationType="fade"
        onRequestClose={() => setSheet(null)}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setSheet(null)}>
          <Pressable
            onPress={e => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 20,
              gap: 12,
            }}>
            <Text style={{fontSize: 16, fontWeight: '700', color: textColor}}>
              {sheet?.label}
            </Text>
            <Text style={{color: muted}}>
              @{formatOdds(sheet?.odds ?? 0)} · {t('betting_balance', {
                count: state.bettingBalance,
              })}
            </Text>
            <Text style={{color: muted, fontSize: 12}}>{t('betting_stake')}</Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
              {STAKE_CHIPS.map(chip => (
                <Pressable
                  key={chip}
                  onPress={() => setStake(chip)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor:
                      stake === chip ? accent : chipBg,
                  }}>
                  <Text
                    style={{
                      color: stake === chip ? '#fff' : textColor,
                      fontWeight: '600',
                    }}>
                    {String(chip)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={{color: textColor}}>
              {`${t('betting_stake')}: ${stake} → ${Math.floor(stake * (sheet?.odds ?? 1))}`}
            </Text>
            <Pressable
              onPress={submit}
              disabled={submitting}
              style={{
                backgroundColor: accent,
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: 'center',
                opacity: submitting ? 0.7 : 1,
              }}>
              <Text style={{color: '#fff', fontWeight: '700'}}>
                {t('betting_place')}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
