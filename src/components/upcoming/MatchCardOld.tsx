import {MatchInfoDataType} from '@/components/Match/types'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {useMatch} from '@/hooks/useMatch'
import {
  formatMatchDate,
  formatProposedDate,
  getMatchDisplayDate,
  getProposingTeamShortName,
  isIndefinitePostponement,
  parsePostponedProposal,
  resolveIndefinitePostponement,
  shouldShowIndefiniteProposeNewDate,
} from '@/lib/postponedProposal'
import {Ionicons, MaterialIcons} from '@expo/vector-icons'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {LinearGradient} from 'expo-linear-gradient'
import {Link, useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  Dimensions,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text as RNText,
  useColorScheme,
  View,
} from 'react-native'
import {showLocation} from 'react-native-map-link'

const ACCENTS = [
  '#3B82F6',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#F43F5E',
  '#8B5CF6',
] as const

function getCardTheme(isDark: boolean, accent: string) {
  if (isDark) {
    return {
      boardBorder: 'rgba(148,163,184,0.22)',
      gradient: [`${accent}22`, 'rgba(15,23,42,0.96)', 'rgba(15,23,42,0.98)'] as const,
      text: '#F8FAFC',
      textSecondary: 'rgba(226,232,240,0.72)',
      textMuted: 'rgba(148,163,184,0.9)',
      textSubtle: 'rgba(226,232,240,0.55)',
      icon: '#E2E8F0',
      chipText: '#E2E8F0',
      chipBg: 'rgba(148,163,184,0.16)',
      logoRingBg: 'rgba(255,255,255,0.06)',
      logoRingBorder: 'rgba(148,163,184,0.2)',
      surfaceBg: 'rgba(2,6,23,0.45)',
      surfaceBorder: 'rgba(148,163,184,0.2)',
      toolBtnBg: 'rgba(15,23,42,0.55)',
      divider: 'rgba(148,163,184,0.18)',
      outlineBorder: 'rgba(226,232,240,0.35)',
      probTrack: 'rgba(148,163,184,0.15)',
      probAway: 'rgba(148,163,184,0.35)',
      confirm: '#34D399',
      confirmBg: 'rgba(52,211,153,0.1)',
      confirmBorder: 'rgba(52,211,153,0.3)',
      waiting: '#FBBF24',
      waitingBg: 'rgba(251,191,36,0.1)',
      waitingBorder: 'rgba(251,191,36,0.3)',
      postponeBg: 'rgba(251,191,36,0.12)',
      postponeBorder: 'rgba(251,191,36,0.35)',
      postponeText: '#FDE68A',
      indefiniteBg: 'rgba(239,68,68,0.14)',
      indefiniteBorder: 'rgba(248,113,113,0.35)',
      indefiniteText: '#FCA5A5',
      shadow: '#000000',
      shadowOpacity: 0.35,
    }
  }

  return {
    boardBorder: 'rgba(15,23,42,0.1)',
    gradient: [`${accent}18`, '#FFFFFF', '#F8FAFC'] as const,
    text: '#0F172A',
    textSecondary: 'rgba(15,23,42,0.68)',
    textMuted: 'rgba(15,23,42,0.55)',
    textSubtle: 'rgba(15,23,42,0.45)',
    icon: '#334155',
    chipText: '#334155',
    chipBg: 'rgba(15,23,42,0.06)',
    logoRingBg: 'rgba(15,23,42,0.04)',
    logoRingBorder: 'rgba(15,23,42,0.1)',
    surfaceBg: 'rgba(15,23,42,0.04)',
    surfaceBorder: 'rgba(15,23,42,0.1)',
    toolBtnBg: '#F8FAFC',
    divider: 'rgba(15,23,42,0.1)',
    outlineBorder: 'rgba(15,23,42,0.2)',
    probTrack: 'rgba(15,23,42,0.08)',
    probAway: 'rgba(15,23,42,0.18)',
    confirm: '#059669',
    confirmBg: 'rgba(5,150,105,0.1)',
    confirmBorder: 'rgba(5,150,105,0.28)',
    waiting: '#B45309',
    waitingBg: 'rgba(180,83,9,0.1)',
    waitingBorder: 'rgba(180,83,9,0.28)',
    postponeBg: 'rgba(245,158,11,0.12)',
    postponeBorder: 'rgba(217,119,6,0.35)',
    postponeText: '#B45309',
    indefiniteBg: 'rgba(239,68,68,0.1)',
    indefiniteBorder: 'rgba(220,38,38,0.3)',
    indefiniteText: '#DC2626',
    shadow: '#0F172A',
    shadowOpacity: 0.12,
  }
}

function calculateWinProbability(
  homeStats: {won?: number; lost?: number; tied?: number} | null | undefined,
  awayStats: {won?: number; lost?: number; tied?: number} | null | undefined,
) {
  if (!homeStats || !awayStats) return null

  const homeTotal =
    (homeStats.won ?? 0) + (homeStats.lost ?? 0) + (homeStats.tied ?? 0)
  const awayTotal =
    (awayStats.won ?? 0) + (awayStats.lost ?? 0) + (awayStats.tied ?? 0)

  if (homeTotal === 0 && awayTotal === 0) return {home: 50, away: 50}

  const baseProbability = 0.1
  const homeWinRate = homeTotal > 0 ? (homeStats.won ?? 0) / homeTotal : 0
  const awayWinRate = awayTotal > 0 ? (awayStats.won ?? 0) / awayTotal : 0
  const totalRate =
    homeWinRate + baseProbability + awayWinRate + baseProbability
  const homeProbability = Math.round(
    ((homeWinRate + baseProbability) / totalRate) * 100,
  )
  return {
    home: homeProbability,
    away: 100 - homeProbability,
  }
}

function Chip({
  icon,
  label,
  color,
  background,
}: {
  icon: React.ComponentProps<typeof MCI>['name']
  label: string
  color: string
  background: string
}) {
  return (
    <View style={[styles.chip, {backgroundColor: background}]}>
      <MCI name={icon} size={13} color={color} />
      <Text style={[styles.chipText, {color}]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

function mixAccent(hex: string, toward: 0 | 255, amount: number) {
  const raw = hex.replace('#', '')
  const r = parseInt(raw.slice(0, 2), 16)
  const g = parseInt(raw.slice(2, 4), 16)
  const b = parseInt(raw.slice(4, 6), 16)
  const mix = (c: number) => Math.round(c + (toward - c) * amount)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

function AccentButton({
  accent,
  onPress,
  icon,
  label,
  style,
  soft = false,
}: {
  accent: string
  onPress: () => void
  icon: React.ReactNode
  label: string
  style?: object
  soft?: boolean
}) {
  const colors = soft
    ? ([`${accent}33`, `${accent}18`] as const)
    : ([mixAccent(accent, 255, 0.18), accent, mixAccent(accent, 0, 0.18)] as const)

  return (
    <Pressable onPress={onPress} style={({pressed}) => ({opacity: pressed ? 0.88 : 1})}>
      <LinearGradient
        colors={[...colors]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[
          styles.accentBtn,
          soft && {borderWidth: 1, borderColor: `${accent}66`},
          style,
        ]}>
        <View style={styles.accentBtnInner}>
          {icon}
          <Text
            style={[
              styles.accentBtnText,
              soft ? {color: accent} : {color: '#FFFFFF'},
            ]}>
            {label}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  )
}

export default function MatchCardOld({
  matchInfo: propsMatchInfo,
  idx = 0,
}: {
  matchInfo: MatchInfoDataType
  idx?: number
  handlePress?: (idx: number) => void
}) {
  const router = useRouter()
  const {t} = useTranslation()
  const {state} = useLeagueContext()
  const match = useMatch()
  const user = state.user
  const isDark = useColorScheme() === 'dark'
  const [matchInfo, setMatchInfo] = React.useState<MatchInfoDataType | null>(
    null,
  )
  const [isMounted, setIsMounted] = React.useState(false)
  const [showInfo, setShowInfo] = React.useState(false)
  const {width} = Dimensions.get('window')
  const accent = ACCENTS[idx % ACCENTS.length]
  const theme = getCardTheme(isDark, accent)
  const logoSize = Math.min(width * 0.16, 68)

  React.useEffect(() => {
    setMatchInfo(propsMatchInfo)
    setIsMounted(true)
  }, [propsMatchInfo])

  React.useEffect(() => {
    if (
      isMounted &&
      matchInfo &&
      typeof user?.teams !== 'undefined' &&
      user.teams.length > 0
    ) {
      let i = 0
      let found = false
      while (i < user.teams.length && !found) {
        if (user.teams[i].id === matchInfo.home_team_id) {
          const next = {...matchInfo}
          next.team_role_id = user.teams[i].team_role_id
          next.player_team_id = matchInfo.home_team_id
          setMatchInfo({...next})
          found = true
        } else if (user.teams[i].id === matchInfo.away_team_id) {
          const next = {...matchInfo}
          next.team_role_id = user.teams[i].team_role_id
          next.player_team_id = matchInfo.away_team_id
          setMatchInfo({...next})
          found = true
        }
        i++
      }
    }
  }, [isMounted])

  function ShowLocation(lat: number | undefined, long: number | undefined) {
    if (typeof lat === 'number' && typeof long === 'number') {
      showLocation({
        latitude: lat,
        longitude: long,
      })
    }
  }

  async function HandleConfirm() {
    if (!matchInfo) return
    const res = await match.ConfirmMatch(
      matchInfo.match_id,
      matchInfo.player_team_id,
    )
    if (res.status === 'ok') {
      const {confirmed, isHome} = res.data
      if (
        typeof confirmed === 'number' &&
        confirmed &&
        typeof isHome === 'boolean'
      ) {
        const next = {...matchInfo}
        if (isHome) next.home_confirmed = confirmed
        else next.away_confirmed = confirmed
        setMatchInfo({...next})
      }
    }
  }

  async function HandlePostpone() {
    router.push({
      pathname: '/(tabs)/(index)/PostponeScreen',
      params: {matchInfo: JSON.stringify(matchInfo)},
    })
  }

  async function HandleUnconfirm() {
    if (!matchInfo) return
    const res = await match.UnconfirmMatch(
      matchInfo.match_id,
      matchInfo.player_team_id,
    )
    if (res) {
      if (
        typeof res?.unconfirmed === 'boolean' &&
        res.unconfirmed &&
        typeof res?.isHome === 'boolean'
      ) {
        const next = {...matchInfo}
        if (res.isHome) next.home_confirmed = 0
        else next.away_confirmed = 0
        setMatchInfo(next)
      }
    }
  }

  async function HandleShare() {
    if (!matchInfo) return

    const matchDate = formatMatchDate(getMatchDisplayDate(matchInfo))
    let message = `${matchInfo.home_team_short_name} vs ${matchInfo.away_team_short_name}\n${matchDate}\n${matchInfo.name}\n${matchInfo.location}`

    if (matchInfo.latitude !== 0 && matchInfo.longitude !== 0) {
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${matchInfo.latitude},${matchInfo.longitude}`
      message += `\n\n${t('map')}: ${mapUrl}`
    }

    try {
      await Share.share({
        message,
        title: t('share_match'),
      })
    } catch (error) {
      console.error(error)
    }
  }

  const rawPostponedProposal =
    propsMatchInfo?.postponed_proposal ?? matchInfo?.postponed_proposal

  const postponedProposal = React.useMemo(
    () => parsePostponedProposal(rawPostponedProposal),
    [rawPostponedProposal],
  )

  const indefinitePostponement = React.useMemo(() => {
    const source = propsMatchInfo ?? matchInfo
    if (!source) return null
    return resolveIndefinitePostponement(source)
  }, [propsMatchInfo, matchInfo])

  const showProposeNewDate =
    isIndefinitePostponement(postponedProposal) ||
    shouldShowIndefiniteProposeNewDate(
      rawPostponedProposal,
      propsMatchInfo?.date ?? matchInfo?.date,
    ) ||
    !!indefinitePostponement

  const winProb = React.useMemo(
    () =>
      calculateWinProbability(matchInfo?.homeStats, matchInfo?.awayStats),
    [matchInfo?.homeStats, matchInfo?.awayStats],
  )

  if (!isMounted || !matchInfo) return null

  const bothConfirmed =
    matchInfo.home_confirmed > 0 && matchInfo.away_confirmed > 0
  const dateLabel = formatMatchDate(getMatchDisplayDate(matchInfo))
  const canAct =
    matchInfo.team_role_id > 0 || isLeagueAdmin(user)
  const isHomeCaptainSide =
    !matchInfo.home_confirmed &&
    matchInfo.player_team_id === matchInfo.home_team_id &&
    canAct
  const isAwayCaptainSide =
    !matchInfo.away_confirmed &&
    matchInfo.player_team_id === matchInfo.away_team_id &&
    canAct
  const waitingForAway =
    matchInfo.home_confirmed > 0 &&
    !matchInfo.away_confirmed &&
    matchInfo.player_team_id === matchInfo.home_team_id
  const waitingForHome =
    matchInfo.away_confirmed > 0 &&
    !matchInfo.home_confirmed &&
    matchInfo.player_team_id === matchInfo.away_team_id

  const teamNameSize = (name: string) => {
    const len = name.length
    if (len > 12) return Math.max(13, width * 0.034)
    if (len > 8) return Math.max(14, width * 0.038)
    return Math.max(15, width * 0.042)
  }

  function renderCaptainActions(isHome: boolean) {
    const reviewProposal =
      postponedProposal?.newDate && postponedProposal.isHome !== isHome
    const proposeSide =
      postponedProposal?.newDate && postponedProposal.isHome === isHome

    return (
      <View style={[styles.actionsBlock, {borderTopColor: theme.divider}]}>
        {reviewProposal ? (
          <AccentButton
            accent={accent}
            onPress={() => HandlePostpone()}
            icon={
              <Ionicons name="calendar-outline" size={18} color="white" />
            }
            label={t('review_and_confirm')}
          />
        ) : null}

        {!postponedProposal ? (
          <AccentButton
            accent={accent}
            onPress={() => HandleConfirm()}
            icon={
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="white"
              />
            }
            label={t('confirm_attendance')}
          />
        ) : null}

        {postponedProposal?.newDate ? (
          <View
            style={[
              styles.proposalCard,
              {
                backgroundColor: theme.surfaceBg,
                borderColor: theme.surfaceBorder,
              },
            ]}>
            <View style={{flex: 1}}>
              <Text style={[styles.proposalLabel, {color: theme.text}]}>
                {getProposingTeamShortName(matchInfo!, postponedProposal)}{' '}
                {t('proposed_date')}:
              </Text>
              <Text style={[styles.proposalDate, {color: theme.textSecondary}]}>
                {formatProposedDate(postponedProposal.newDate)}
              </Text>
            </View>
            {(proposeSide || reviewProposal) && (
              <AccentButton
                accent={accent}
                soft
                onPress={() => HandlePostpone()}
                icon={
                  <MaterialIcons name="date-range" size={18} color={accent} />
                }
                label={t('propose_new_date')}
                style={{flexShrink: 0}}
              />
            )}
          </View>
        ) : null}

        {showProposeNewDate ? (
          <AccentButton
            accent={accent}
            soft
            onPress={() => HandlePostpone()}
            icon={
              <MaterialIcons name="date-range" size={18} color={accent} />
            }
            label={t('propose_new_date')}
          />
        ) : (
          !postponedProposal?.newDate &&
          !rawPostponedProposal && (
            <AccentButton
              accent={accent}
              soft
              onPress={() => HandlePostpone()}
              icon={
                <MaterialIcons name="schedule" size={18} color={accent} />
              }
              label={t('reschedule')}
            />
          )
        )}
      </View>
    )
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          shadowColor: theme.shadow,
          shadowOpacity: theme.shadowOpacity,
        },
      ]}>
      <LinearGradient
        colors={[...theme.gradient]}
        locations={[0, 0.45, 1]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[
          styles.board,
          {
            borderColor: theme.boardBorder,
          },
        ]}>
        <View style={[styles.stripe, {backgroundColor: accent}]} />

        <Link
          href={{
            pathname: '/Match',
            params: {params: JSON.stringify(matchInfo)},
          }}
          asChild>
          <Pressable style={({pressed}) => ({opacity: pressed ? 0.96 : 1})}>
            <View style={styles.metaRow}>
              <View style={styles.chipsWrap}>
                <Chip
                  icon="calendar"
                  label={dateLabel}
                  color={theme.chipText}
                  background={theme.chipBg}
                />
                {bothConfirmed ? (
                  <Chip
                    icon="check-decagram"
                    label={t('match_confirmed')}
                    color={theme.confirm}
                    background={theme.confirmBg}
                  />
                ) : null}
              </View>
              <View style={styles.scoresheetCta}>
                <MCI
                  name="clipboard-text-outline"
                  size={16}
                  color={accent}
                />
                <Text style={[styles.scoresheetCtaText, {color: accent}]}>
                  Scoresheet
                </Text>
                <MCI name="chevron-right" size={18} color={accent} />
              </View>
            </View>

            {postponedProposal?.newDate && !bothConfirmed ? (
              <View
                style={[
                  styles.postponeBanner,
                  {
                    backgroundColor: theme.postponeBg,
                    borderColor: theme.postponeBorder,
                  },
                ]}>
                <Text
                  style={[
                    styles.postponeBannerTitle,
                    {color: theme.postponeText},
                  ]}>
                  {t('proposed_date')}
                </Text>
                <Text
                  style={[
                    styles.postponeBannerText,
                    {color: theme.postponeText},
                  ]}>
                  {formatProposedDate(postponedProposal.newDate)}
                </Text>
              </View>
            ) : null}

            {indefinitePostponement ? (
              <View
                style={[
                  styles.postponeBanner,
                  {
                    backgroundColor: theme.indefiniteBg,
                    borderColor: theme.indefiniteBorder,
                  },
                ]}>
                {indefinitePostponement.proposingTeamName ? (
                  <Text
                    style={[
                      styles.indefiniteText,
                      {color: theme.indefiniteText},
                    ]}>
                    {indefinitePostponement.proposingTeamName}
                  </Text>
                ) : null}
                <Text
                  style={[styles.indefiniteText, {color: theme.indefiniteText}]}>
                  {t('postponed_indefinitely')}
                </Text>
              </View>
            ) : null}

            <View style={styles.teamsRow}>
              <View style={styles.teamCol}>
                {matchInfo.home_logo ? (
                  <View
                    style={[
                      styles.logoRing,
                      {
                        backgroundColor: theme.logoRingBg,
                        borderColor: theme.logoRingBorder,
                      },
                    ]}>
                    <Image
                      source={{uri: matchInfo.home_logo}}
                      resizeMode="contain"
                      style={{width: logoSize, height: logoSize}}
                    />
                  </View>
                ) : null}
                {matchInfo?.homeStats?.rank != null ? (
                  <Text style={[styles.rank, {color: accent}]}>
                    #{matchInfo.homeStats.rank}
                  </Text>
                ) : null}
                <Text
                  style={[
                    styles.teamName,
                    {
                      color: theme.text,
                      fontSize: teamNameSize(
                        matchInfo.home_team_short_name ?? '',
                      ),
                    },
                  ]}
                  numberOfLines={2}>
                  {matchInfo.home_team_short_name}
                </Text>
                {(matchInfo.homeStats || winProb) && (
                  <Text style={[styles.record, {color: theme.textSecondary}]}>
                    {matchInfo?.homeStats?.won ?? 0}-
                    {matchInfo?.homeStats?.lost ?? 0}-
                    {matchInfo?.homeStats?.tied ?? 0}
                    {winProb ? ` · ${winProb.home}%` : ''}
                  </Text>
                )}
              </View>

              <View style={styles.vsCol}>
                <View
                  style={[
                    styles.vsBadge,
                    {
                      backgroundColor: `${accent}22`,
                      borderColor: `${accent}55`,
                    },
                  ]}>
                  <MCI name="bullseye-arrow" size={20} color={accent} />
                </View>
                <Text style={[styles.vsHint, {color: theme.textSubtle}]}>
                  VS
                </Text>
              </View>

              <View style={styles.teamCol}>
                {matchInfo.away_logo ? (
                  <View
                    style={[
                      styles.logoRing,
                      {
                        backgroundColor: theme.logoRingBg,
                        borderColor: theme.logoRingBorder,
                      },
                    ]}>
                    <Image
                      source={{uri: matchInfo.away_logo}}
                      resizeMode="contain"
                      style={{width: logoSize, height: logoSize}}
                    />
                  </View>
                ) : null}
                {matchInfo?.awayStats?.rank != null ? (
                  <Text style={[styles.rank, {color: accent}]}>
                    #{matchInfo.awayStats.rank}
                  </Text>
                ) : null}
                <Text
                  style={[
                    styles.teamName,
                    {
                      color: theme.text,
                      fontSize: teamNameSize(
                        matchInfo.away_team_short_name ?? '',
                      ),
                    },
                  ]}
                  numberOfLines={2}>
                  {matchInfo.away_team_short_name}
                </Text>
                {(matchInfo.awayStats || winProb) && (
                  <Text style={[styles.record, {color: theme.textSecondary}]}>
                    {matchInfo?.awayStats?.won ?? 0}-
                    {matchInfo?.awayStats?.lost ?? 0}-
                    {matchInfo?.awayStats?.tied ?? 0}
                    {winProb ? ` · ${winProb.away}%` : ''}
                  </Text>
                )}
              </View>
            </View>

            {winProb ? (
              <View
                style={[styles.probTrack, {backgroundColor: theme.probTrack}]}>
                <View
                  style={[
                    styles.probHome,
                    {
                      flex: Math.max(winProb.home, 8),
                      backgroundColor: accent,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.probAway,
                    {
                      flex: Math.max(winProb.away, 8),
                      backgroundColor: theme.probAway,
                    },
                  ]}
                />
              </View>
            ) : null}
          </Pressable>
        </Link>

        <View
          style={[
            styles.venueHeader,
            showInfo
              ? {
                  backgroundColor: theme.surfaceBg,
                  borderColor: theme.surfaceBorder,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  borderBottomWidth: 0,
                  paddingHorizontal: 10,
                  paddingTop: 10,
                  paddingBottom: 8,
                }
              : null,
          ]}>
          <Pressable
            onPress={() =>
              showInfo
                ? ShowLocation(matchInfo.latitude, matchInfo.longitude)
                : setShowInfo(true)
            }
            style={styles.venueHeaderMain}
            accessibilityRole="button"
            accessibilityLabel={matchInfo.name}>
            <Ionicons name="location-outline" size={16} color={accent} />
            <Text
              style={[
                styles.infoToggleLabel,
                {color: showInfo ? theme.text : theme.textSecondary},
              ]}
              numberOfLines={1}>
              {matchInfo.name}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowInfo(v => !v)}
            hitSlop={8}
            style={({pressed}) => [
              styles.infoToggleBtn,
              {
                borderColor: `${accent}66`,
                backgroundColor: showInfo ? `${accent}22` : theme.toolBtnBg,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              showInfo ? 'Hide venue details' : 'Show venue details'
            }
            accessibilityState={{expanded: showInfo}}>
            <Ionicons
              name={showInfo ? 'chevron-up' : 'information-circle-outline'}
              size={20}
              color={theme.icon}
            />
          </Pressable>
        </View>

        {showInfo ? (
          <>
            <View
              style={[
                styles.venueDetails,
                {
                  backgroundColor: theme.surfaceBg,
                  borderColor: theme.surfaceBorder,
                },
              ]}>
              <View style={styles.venueBody}>
                {matchInfo.location ? (
                  <Text
                    style={[styles.venueAddress, {color: theme.textSecondary}]}
                    numberOfLines={2}>
                    {matchInfo.location}
                  </Text>
                ) : null}
                {matchInfo.phone ? (
                  <Text style={[styles.venueMeta, {color: theme.textMuted}]}>
                    {matchInfo.phone}
                  </Text>
                ) : null}
                <Text style={[styles.venueMeta, {color: theme.textMuted}]}>
                  {t('match')} ID: {matchInfo.match_id}
                </Text>
              </View>
              {matchInfo.logo ? (
                <Image
                  source={{uri: matchInfo.logo}}
                  resizeMode="contain"
                  style={styles.venueLogo}
                />
              ) : null}
            </View>

            <View style={styles.toolbar}>
              {(matchInfo.latitude !== 0 || matchInfo.longitude !== 0) && (
                <Pressable
                  onPress={() =>
                    ShowLocation(matchInfo.latitude, matchInfo.longitude)
                  }
                  style={({pressed}) => [
                    styles.toolBtn,
                    {
                      borderColor: `${accent}66`,
                      backgroundColor: theme.toolBtnBg,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}>
                  <View style={styles.toolIconWrap}>
                    <Ionicons
                      name="location-outline"
                      size={22}
                      color={theme.icon}
                    />
                  </View>
                  <RNText style={[styles.toolText, {color: theme.text}]}>
                    {t('map')}
                  </RNText>
                </Pressable>
              )}
              <Pressable
                onPress={HandleShare}
                style={({pressed}) => [
                  styles.toolBtn,
                  {
                    borderColor: `${accent}66`,
                    backgroundColor: theme.toolBtnBg,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <View style={styles.toolIconWrap}>
                  <MCI name="share-outline" size={22} color={theme.icon} />
                </View>
                <RNText style={[styles.toolText, {color: theme.text}]}>
                  {t('share')}
                </RNText>
              </Pressable>
            </View>
          </>
        ) : null}

        {bothConfirmed ? (
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: theme.confirmBg,
                borderColor: theme.confirmBorder,
              },
            ]}>
            <View style={styles.statusHeader}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={theme.confirm}
              />
              <Text style={[styles.statusTitle, {color: theme.confirm}]}>
                {t('match_confirmed')}
              </Text>
            </View>
            <AccentButton
              accent={accent}
              soft
              onPress={() => HandleUnconfirm()}
              icon={
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color={accent}
                />
              }
              label={t('unconfirm')}
            />
          </View>
        ) : null}

        {(waitingForAway || waitingForHome) && (
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: theme.waitingBg,
                borderColor: theme.waitingBorder,
              },
            ]}>
            <View style={styles.statusHeader}>
              <Ionicons name="time-outline" size={18} color={theme.waiting} />
              <Text style={[styles.statusTitle, {color: theme.waiting}]}>
                {waitingForAway
                  ? t('waiting_for_away_team_to_confirm')
                  : t('waiting_for_home_team_to_confirm')}
              </Text>
            </View>
            <AccentButton
              accent={accent}
              soft
              onPress={() => HandleUnconfirm()}
              icon={
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color={accent}
                />
              }
              label={t('unconfirm')}
            />
          </View>
        )}

        {isHomeCaptainSide ? renderCaptainActions(true) : null}
        {isAwayCaptainSide ? renderCaptainActions(false) : null}
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginVertical: 8,
    overflow: 'visible',
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 10,
    elevation: 4,
  },
  board: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 18,
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  chipsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scoresheetCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
    flexShrink: 0,
  },
  scoresheetCtaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  postponeBanner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  postponeBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
  },
  postponeBannerText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  indefiniteText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 2,
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  logoRing: {
    borderRadius: 999,
    padding: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  rank: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  teamName: {
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 20,
  },
  record: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  vsCol: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
    gap: 6,
  },
  vsBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  vsHint: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  probTrack: {
    marginTop: 14,
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  probHome: {
    height: '100%',
  },
  probAway: {
    height: '100%',
  },
  venueHeader: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 14,
  },
  venueHeaderMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  venueDetails: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoToggleLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  infoToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  venueBody: {
    flex: 1,
    minWidth: 0,
  },
  venueAddress: {
    fontSize: 13,
    lineHeight: 18,
  },
  venueMeta: {
    marginTop: 4,
    fontSize: 12,
  },
  venueLogo: {
    width: 56,
    height: 72,
    borderRadius: 8,
  },
  toolbar: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
  },
  toolBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 14,
    minWidth: 96,
  },
  toolIconWrap: {
    width: '100%',
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: {
    alignSelf: 'stretch',
    width: '100%',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
  statusCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  actionsBlock: {
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 20,
  },
  proposalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  proposalLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  proposalDate: {
    fontSize: 13,
  },
  accentBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  accentBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  accentBtnText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
})
