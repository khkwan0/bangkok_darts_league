import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  useBetting,
  type BettingMarket,
  type BettingMarketType,
  type BettingMatchup,
  type BettingSelectionKey,
} from '@/hooks/useBetting'
import {
  formatBettingOdds,
  type BettingOddsFormat,
} from '@/lib/bettingOddsFormat'
import config from '@/config.js'
import {Ionicons} from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from 'expo-router'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  useColorScheme,
  View,
} from 'react-native'

const BALANCE_POLL_MS = 5000

const STAKE_CHIPS = [50, 100, 250, 500, 1000]

function formatLine(market: BettingMarket) {
  if (market.line == null) return ''
  const line = Number(market.line)
  if (market.market_type === 'spread') {
    const sign = line > 0 ? '+' : ''
    return `${sign}${line}`
  }
  return String(line)
}

function sel(market: BettingMarket | undefined, key: BettingSelectionKey) {
  return market?.selections.find(s => s.selection_key === key)
}

export default function MatchBettingScreen() {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const navigation = useNavigation()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const params = useLocalSearchParams<{matchId?: string; market?: string}>()
  const matchId = Number(params.matchId)
  const focusMarket = String(params.market || '')

  const {state, dispatch} = useLeagueContext()
  const betting = useBetting()
  const oddsFormat = state.bettingOddsFormat ?? 'european'
  const formatOdds = (n: number) => formatBettingOdds(n, oddsFormat)

  const setOddsFormat = async (format: BettingOddsFormat) => {
    dispatch({type: 'SET_BETTING_ODDS_FORMAT', payload: format})
    try {
      await AsyncStorage.setItem(
        'betting_odds_format',
        JSON.stringify({format}),
      )
    } catch (e) {
      console.error(e)
    }
  }

  const [markets, setMarkets] = React.useState<BettingMarket[]>([])
  const [matchup, setMatchup] = React.useState<BettingMatchup | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [stake, setStake] = React.useState(100)
  const [picked, setPicked] = React.useState<{
    marketType: BettingMarketType
    selectionKey: BettingSelectionKey
    odds: number
    label: string
  } | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [infoOpen, setInfoOpen] = React.useState(false)

  const muted = isDark ? 'rgba(226,232,240,0.65)' : 'rgba(51,65,85,0.7)'
  const cardBg = isDark ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.95)'
  const border = isDark ? 'rgba(148,163,184,0.25)' : 'rgba(15,23,42,0.08)'
  const accent = colors.primary

  const getMarkets = betting.getMarkets
  const refreshAccount = betting.refreshAccount
  const balance = Number(state.bettingBalance) || 0
  const balanceLabel = t('betting_balance', {
    count: balance.toLocaleString(),
  })

  const load = React.useCallback(async () => {
    if (!matchId) return
    setLoading(true)
    try {
      const data = await getMarkets(matchId)
      setMarkets(data.markets)
      setMatchup(data.matchup)
    } finally {
      setLoading(false)
    }
  }, [matchId, getMarkets])

  React.useEffect(() => {
    void load()
  }, [load])

  useFocusEffect(
    React.useCallback(() => {
      void refreshAccount()
      const id = setInterval(() => {
        void refreshAccount()
      }, BALANCE_POLL_MS)
      return () => clearInterval(id)
    }, [refreshAccount]),
  )

  React.useEffect(() => {
    const title = matchup
      ? `${matchup.home_team_short_name} vs ${matchup.away_team_short_name}`
      : t('betting_settings')
    navigation.setOptions({
      title,
      headerBackTitle: t('back'),
      headerRight: () => (
        <Pressable
          onPress={() => setInfoOpen(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('betting_info_title')}
          style={{paddingHorizontal: 4}}>
          <Ionicons
            name="information-circle-outline"
            size={24}
            color={colors.primary}
          />
        </Pressable>
      ),
    })
  }, [navigation, matchup, t, colors.primary])

  const ml = markets.find(m => m.market_type === 'moneyline')
  const spread = markets.find(m => m.market_type === 'spread')

  const pick = (
    market: BettingMarket,
    selectionKey: BettingSelectionKey,
    label: string,
  ) => {
    if (market.status !== 'open') return
    const s = sel(market, selectionKey)
    if (!s) return
    setPicked({
      marketType: market.market_type,
      selectionKey,
      odds: s.odds,
      label,
    })
  }

  const submit = async () => {
    if (!picked || !matchId) return
    setSubmitting(true)
    try {
      const res = await betting.placeBet({
        matchId,
        marketType: picked.marketType,
        selectionKey: picked.selectionKey,
        stake,
      })
      if (res.ok) {
        Alert.alert(t('betting_success'))
        setPicked(null)
        await load()
      } else {
        Alert.alert(
          t('betting_failed'),
          t(res.error, {defaultValue: res.error}),
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  const infoParagraphs = [
    t('betting_info_moneyline'),
    t('betting_info_spread'),
    t('betting_info_odds'),
    t('betting_info_prior'),
    t('betting_info_action'),
    t('betting_info_stats'),
    t('betting_info_virtual'),
  ]

  const infoModal = (
    <Modal
      visible={infoOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setInfoOpen(false)}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,23,42,0.55)',
          justifyContent: 'center',
          padding: 24,
        }}>
        <Pressable
          onPress={() => setInfoOpen(false)}
          style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0}}
        />
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: border,
            padding: 20,
            maxHeight: '80%',
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: colors.text,
                flex: 1,
              }}>
              {t('betting_info_title')}
            </Text>
            <Pressable
              onPress={() => setInfoOpen(false)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('betting_info_close')}>
              <Ionicons name="close" size={22} color={muted} />
            </Pressable>
          </View>
          <ScrollView style={{maxHeight: 420}}>
            {infoParagraphs.map((para, i) => (
              <Text
                key={i}
                style={{
                  color: colors.text,
                  fontSize: 14,
                  lineHeight: 21,
                  marginBottom: i === infoParagraphs.length - 1 ? 0 : 12,
                }}>
                {para}
              </Text>
            ))}
          </ScrollView>
          <Pressable
            onPress={() => setInfoOpen(false)}
            style={{
              marginTop: 16,
              backgroundColor: accent,
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
            }}>
            <Text style={{color: '#fff', fontWeight: '700'}}>
              {t('betting_info_close')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )

  const OddButton = ({
    label,
    odds,
    active,
    onPress,
    disabled,
  }: {
    label: string
    odds: number
    active?: boolean
    onPress: () => void
    disabled?: boolean
  }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: active ? accent : border,
        backgroundColor: active ? accent : cardBg,
        opacity: disabled ? 0.45 : 1,
        alignItems: 'center',
      }}>
      <Text
        style={{
          fontSize: 12,
          color: active ? 'rgba(255,255,255,0.9)' : muted,
          marginBottom: 4,
          textAlign: 'center',
        }}
        numberOfLines={2}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '800',
          color: active ? '#FFFFFF' : accent,
        }}>
        {formatOdds(odds)}
      </Text>
    </Pressable>
  )

  const StatRow = ({
    label,
    homeVal,
    awayVal,
  }: {
    label: string
    homeVal: string
    awayVal: string
  }) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: border,
      }}>
      <Text
        style={{
          flex: 1,
          textAlign: 'center',
          fontWeight: '700',
          color: colors.text,
        }}>
        {homeVal}
      </Text>
      <Text style={{width: 88, textAlign: 'center', fontSize: 12, color: muted}}>
        {label}
      </Text>
      <Text
        style={{
          flex: 1,
          textAlign: 'center',
          fontWeight: '700',
          color: colors.text,
        }}>
        {awayVal}
      </Text>
    </View>
  )

  if (!state.bettingOptedIn) {
    return (
      <>
        <View style={{flex: 1, justifyContent: 'center', padding: 24}}>
          <Text style={{textAlign: 'center', color: muted}}>
            {t('betting_opt_in_body')}
          </Text>
        </View>
        {infoModal}
      </>
    )
  }

  if (loading) {
    return (
      <>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator color={accent} />
        </View>
        {infoModal}
      </>
    )
  }

  const homeName = matchup?.home_team_short_name ?? 'Home'
  const awayName = matchup?.away_team_short_name ?? 'Away'

  const logoUri = (logo: string | null | undefined) => {
    if (!logo) return null
    const trimmed = String(logo).trim()
    if (!trimmed) return null
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    const base = String((config as {logoUrl?: string}).logoUrl || '').replace(
      /\/$/,
      '',
    )
    return base ? `${base}/${trimmed}` : trimmed
  }

  const TeamLogo = ({
    logo,
    name,
  }: {
    logo: string | null | undefined
    name: string
  }) => {
    const uri = logoUri(logo)
    const [failed, setFailed] = React.useState(false)
    const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
    if (!uri || failed) {
      return (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 10,
            backgroundColor: `${String(accent)}22`,
            marginBottom: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{fontSize: 24, fontWeight: '800', color: accent}}>
            {initial}
          </Text>
        </View>
      )
    }
    return (
      <Image
        source={{uri}}
        resizeMode="contain"
        onError={() => setFailed(true)}
        style={{width: 56, height: 56, borderRadius: 10, marginBottom: 8}}
      />
    )
  }

  const highlight = (type: string) =>
    !focusMarket || focusMarket === type ? 1 : 0.55

  return (
    <>
      <ScrollView
        style={{flex: 1, backgroundColor: colors.background}}
        contentContainerStyle={{padding: 16, paddingBottom: 40, gap: 16}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              flexShrink: 1,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: isDark
                ? 'rgba(59,130,246,0.22)'
                : 'rgba(37,99,235,0.12)',
              borderWidth: 1,
              borderColor: isDark
                ? 'rgba(96,165,250,0.45)'
                : 'rgba(37,99,235,0.28)',
            }}>
            <Ionicons name="wallet" size={22} color={accent} />
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '800',
                flexShrink: 1,
              }}>
              {balanceLabel}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: border,
              overflow: 'hidden',
              backgroundColor: cardBg,
            }}>
            {(
              [
                ['european', t('betting_odds_european')],
                ['american', t('betting_odds_american')],
              ] as const
            ).map(([key, label]) => {
              const active = oddsFormat === key
              return (
                <Pressable
                  key={key}
                  onPress={() => setOddsFormat(key)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: active ? accent : 'transparent',
                  }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: active ? '#FFFFFF' : colors.text,
                    }}>
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: border,
            padding: 16,
          }}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <View style={{flex: 1, alignItems: 'center'}}>
              <TeamLogo
                logo={matchup?.home_logo}
                name={matchup?.home_team_short_name ?? homeName}
              />
              <Text
                style={{
                  fontWeight: '800',
                  color: colors.text,
                  textAlign: 'center',
                }}>
                {matchup?.home_team_name ?? homeName}
              </Text>
            </View>
            <Text
              style={{fontWeight: '700', color: muted, paddingHorizontal: 8}}>
              VS
            </Text>
            <View style={{flex: 1, alignItems: 'center'}}>
              <TeamLogo
                logo={matchup?.away_logo}
                name={matchup?.away_team_short_name ?? awayName}
              />
              <Text
                style={{
                  fontWeight: '800',
                  color: colors.text,
                  textAlign: 'center',
                }}>
                {matchup?.away_team_name ?? awayName}
              </Text>
            </View>
          </View>

          {matchup ? (
            <View style={{marginTop: 16}}>
              <StatRow
                label={t('betting_stat_record')}
                homeVal={`${matchup.home.wins}-${matchup.home.losses}-${matchup.home.ties}`}
                awayVal={`${matchup.away.wins}-${matchup.away.losses}-${matchup.away.ties}`}
              />
              <StatRow
                label={t('betting_stat_for')}
                homeVal={String(matchup.home.frames_for)}
                awayVal={String(matchup.away.frames_for)}
              />
              <StatRow
                label={t('betting_stat_against')}
                homeVal={String(matchup.home.frames_against)}
                awayVal={String(matchup.away.frames_against)}
              />
            </View>
          ) : null}
        </View>

        {ml ? (
          <View style={{opacity: highlight('moneyline'), gap: 8}}>
            <Text style={{fontWeight: '700', color: colors.text}}>
              {t('betting_moneyline')}
            </Text>
            <View style={{flexDirection: 'row', gap: 8}}>
              <OddButton
                label={homeName}
                odds={sel(ml, 'home')?.odds ?? 0}
                active={
                  picked?.marketType === 'moneyline' &&
                  picked.selectionKey === 'home'
                }
                disabled={ml.status !== 'open'}
                onPress={() => pick(ml, 'home', homeName)}
              />
              <OddButton
                label={awayName}
                odds={sel(ml, 'away')?.odds ?? 0}
                active={
                  picked?.marketType === 'moneyline' &&
                  picked.selectionKey === 'away'
                }
                disabled={ml.status !== 'open'}
                onPress={() => pick(ml, 'away', awayName)}
              />
            </View>
          </View>
        ) : null}

        {spread ? (
          <View style={{opacity: highlight('spread'), gap: 8}}>
            <Text style={{fontWeight: '700', color: colors.text}}>
              {t('betting_spread')} {formatLine(spread)}
            </Text>
            <View style={{flexDirection: 'row', gap: 8}}>
              <OddButton
                label={`${homeName} ${formatLine(spread)}`}
                odds={sel(spread, 'home')?.odds ?? 0}
                active={
                  picked?.marketType === 'spread' &&
                  picked.selectionKey === 'home'
                }
                disabled={spread.status !== 'open'}
                onPress={() =>
                  pick(spread, 'home', `${homeName} ${formatLine(spread)}`)
                }
              />
              <OddButton
                label={`${awayName} ${
                  spread.line != null
                    ? `${-Number(spread.line) > 0 ? '+' : ''}${-Number(spread.line)}`
                    : ''
                }`}
                odds={sel(spread, 'away')?.odds ?? 0}
                active={
                  picked?.marketType === 'spread' &&
                  picked.selectionKey === 'away'
                }
                disabled={spread.status !== 'open'}
                onPress={() => pick(spread, 'away', awayName)}
              />
            </View>
          </View>
        ) : null}

        {!markets.length ? (
          <Text style={{color: muted, textAlign: 'center'}}>
            {t('betting_no_markets')}
          </Text>
        ) : null}

        {picked ? (
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: border,
              padding: 16,
              gap: 12,
            }}>
            <Text style={{fontWeight: '700', color: colors.text}}>
              {picked.label} @ {formatOdds(picked.odds)}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}>
              <Text style={{fontWeight: '800', color: colors.text, fontSize: 16}}>
                {balanceLabel}
              </Text>
              <Text style={{color: muted, fontWeight: '600'}}>
                {t('betting_remaining', {
                  count: Math.max(0, balance - stake).toLocaleString(),
                })}
              </Text>
            </View>
            <Text style={{color: muted, fontSize: 12}}>{t('betting_stake')}</Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
              {STAKE_CHIPS.map(chip => {
                const unaffordable = chip > balance
                return (
                  <Pressable
                    key={chip}
                    onPress={() => setStake(chip)}
                    disabled={unaffordable}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: stake === chip ? accent : border,
                      opacity: unaffordable ? 0.4 : 1,
                    }}>
                    <Text
                      style={{
                        color: stake === chip ? '#fff' : colors.text,
                        fontWeight: '600',
                      }}>
                      {String(chip)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            <Text style={{color: colors.text}}>
              {`${t('betting_stake')}: ${stake} → ${Math.floor(stake * picked.odds)}`}
            </Text>
            <Pressable
              onPress={submit}
              disabled={submitting || stake > balance}
              style={{
                backgroundColor: accent,
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: 'center',
                opacity: submitting || stake > balance ? 0.7 : 1,
              }}>
              <Text style={{color: '#fff', fontWeight: '700'}}>
                {t('betting_place')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable onPress={() => router.back()} style={{paddingVertical: 8}}>
          <Text style={{textAlign: 'center', color: muted}}>{t('back')}</Text>
        </Pressable>
      </ScrollView>
      {infoModal}
    </>
  )
}
