import Button from '@/components/Button'
import MatchBettingRow from '@/components/betting/MatchBettingRow'
import MatchPredictionRow from '@/components/predictions/MatchPredictionRow'
import {MatchInfoDataType} from '@/components/Match/types'
import {ThemedText as Text} from '@/components/ThemedText'
import CupMatchBanner, {
  formatCupBannerLabel,
  getCupTierTheme,
} from '@/components/upcoming/CupMatchBanner'
import {useLeagueContext} from '@/context/LeagueContext'
import {useMatch} from '@/hooks/useMatch'
import {useTeams} from '@/hooks/useTeams'
import {
  formatMatchDate,
  formatProposedDate,
  getMatchDisplayDate,
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
  ScrollView,
  Share,
  StyleSheet,
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

function getCardTheme(isDark: boolean) {
  if (isDark) {
    return {
      page: ['#0B1220', '#111827', '#0F172A'] as const,
      cupPage: ['#1A1205', '#1C1408', '#0F172A'] as const,
      boardBg: 'rgba(15,23,42,0.72)',
      boardBorder: 'rgba(148,163,184,0.22)',
      text: '#F8FAFC',
      textSecondary: 'rgba(226,232,240,0.72)',
      textMuted: 'rgba(226,232,240,0.55)',
      icon: '#E2E8F0',
      logoRingBg: 'rgba(255,255,255,0.06)',
      logoRingBorder: 'rgba(148,163,184,0.2)',
      venueBg: 'rgba(2,6,23,0.45)',
      venueBorder: 'rgba(148,163,184,0.2)',
      venueName: '#F1F5F9',
      shareBg: 'rgba(15,23,42,0.55)',
      shareBorder: 'rgba(226,232,240,0.35)',
      probTrack: 'rgba(148,163,184,0.15)',
      probAway: 'rgba(148,163,184,0.35)',
      confirm: '#34D399',
      confirmBg: 'rgba(52,211,153,0.16)',
      postponeText: '#FDE68A',
      indefiniteBg: 'rgba(239,68,68,0.14)',
      indefiniteBorder: 'rgba(248,113,113,0.35)',
      indefiniteText: '#FCA5A5',
    }
  }
  return {
    page: ['#F8FAFC', '#FFFFFF', '#F1F5F9'] as const,
    cupPage: ['#FFFBEB', '#FFFFFF', '#F8FAFC'] as const,
    boardBg: '#FFFFFF',
    boardBorder: 'rgba(15,23,42,0.1)',
    text: '#0F172A',
    textSecondary: 'rgba(15,23,42,0.68)',
    textMuted: 'rgba(15,23,42,0.45)',
    icon: '#334155',
    logoRingBg: 'rgba(15,23,42,0.04)',
    logoRingBorder: 'rgba(15,23,42,0.1)',
    venueBg: 'rgba(15,23,42,0.04)',
    venueBorder: 'rgba(15,23,42,0.1)',
    venueName: '#0F172A',
    shareBg: '#FFFFFF',
    shareBorder: 'rgba(15,23,42,0.16)',
    probTrack: 'rgba(15,23,42,0.08)',
    probAway: 'rgba(15,23,42,0.18)',
    confirm: '#059669',
    confirmBg: 'rgba(5,150,105,0.12)',
    postponeText: '#B45309',
    indefiniteBg: 'rgba(239,68,68,0.08)',
    indefiniteBorder: 'rgba(220,38,38,0.28)',
    indefiniteText: '#DC2626',
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

function hasLogoUri(uri?: string | null) {
  if (typeof uri !== 'string') return false
  const trimmed = uri.trim()
  if (!trimmed) return false
  if (/\/logos\/?$/i.test(trimmed)) return false
  if (/\/(null|undefined)(\?|$)/i.test(trimmed)) return false
  return true
}

/** Apply captain/player team role synchronously so cards don't grow after remount. */
function withUserTeamRole(
  info: MatchInfoDataType,
  user: {teams?: Array<{id: number; team_role_id: number}>} | null | undefined,
): MatchInfoDataType {
  const teams = user?.teams
  if (!Array.isArray(teams) || teams.length === 0) return info
  for (const team of teams) {
    if (team.id === info.home_team_id) {
      return {
        ...info,
        team_role_id: team.team_role_id,
        player_team_id: info.home_team_id,
      }
    }
    if (team.id === info.away_team_id) {
      return {
        ...info,
        team_role_id: team.team_role_id,
        player_team_id: info.away_team_id,
      }
    }
  }
  return info
}

function TeamLogoMark({
  uri,
  name,
  size,
  accent,
  ringBg,
  ringBorder,
}: {
  uri?: string | null
  name?: string | null
  size: number
  accent: string
  ringBg: string
  ringBorder: string
}) {
  const [failed, setFailed] = React.useState(false)
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  const showImage = hasLogoUri(uri) && !failed

  return (
    <View
      style={[
        styles.logoRing,
        {backgroundColor: ringBg, borderColor: ringBorder},
      ]}>
      {showImage ? (
        <Image
          source={{uri: uri!}}
          resizeMode="contain"
          style={{width: size, height: size}}
          onError={() => setFailed(true)}
        />
      ) : (
        <View
          style={[
            styles.logoInitialWell,
            {
              width: size,
              height: size,
              backgroundColor: `${accent}22`,
            },
          ]}>
          <Text style={[styles.logoInitial, {color: accent, fontSize: size * 0.48}]}>
            {initial}
          </Text>
        </View>
      )}
    </View>
  )
}

export default function MatchCard({
  matchInfo: propsMatchInfo,
  idx,
  embedded = false,
  scoresheetPathname = '/Match',
}: {
  matchInfo: MatchInfoDataType
  idx: number
  handlePress?: (idx: number) => void
  showMineOnly?: boolean
  /** Calendar day: one card, not a full-screen pager page. */
  embedded?: boolean
  /** Route for the scoresheet Link (Settings stack needs its own path). */
  scoresheetPathname?: string
}) {
  const router = useRouter()
  const {t} = useTranslation()
  const {state} = useLeagueContext()
  const match = useMatch()
  const teams = useTeams()
  const user = state.user
  const [matchInfo, setMatchInfo] = React.useState<MatchInfoDataType>(() =>
    withUserTeamRole(propsMatchInfo, state.user),
  )
  const {width} = Dimensions.get('window')
  const pad = Math.max(16, width * 0.04)
  const logoSize = Math.min(width * 0.22, 96)
  const isDark = useColorScheme() === 'dark'
  const theme = getCardTheme(isDark)

  const teamRoleKey =
    user?.teams?.map((t: {id: number; team_role_id: number}) =>
      `${t.id}:${t.team_role_id}`,
    ).join('|') ?? ''

  React.useEffect(() => {
    setMatchInfo(withUserTeamRole(propsMatchInfo, user))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propsMatchInfo, user?.id, teamRoleKey])

  React.useEffect(() => {
    if (!user?.id) return
    // Already resolved from user.teams — skip roster fetch that can resize the card.
    if (
      Array.isArray(user.teams) &&
      user.teams.some(
        (team: {id: number}) =>
          team.id === matchInfo.home_team_id ||
          team.id === matchInfo.away_team_id,
      )
    ) {
      return
    }

    let cancelled = false

    async function resolveMembership() {
      const homeId = Number(matchInfo.home_team_id)
      const awayId = Number(matchInfo.away_team_id)
      if (!homeId || !awayId) return
      const matchId = Number(matchInfo.match_id ?? 0) || null

      const [homeRes, awayRes] = await Promise.all([
        teams.GetPlayers(homeId, true, matchId),
        teams.GetPlayers(awayId, true, matchId),
      ])
      if (cancelled) return

      const homePlayers = Array.isArray(homeRes?.data)
        ? homeRes.data
        : Array.isArray(homeRes)
          ? homeRes
          : []
      const awayPlayers = Array.isArray(awayRes?.data)
        ? awayRes.data
        : Array.isArray(awayRes)
          ? awayRes
          : []

      const uid = Number(user.id)
      const onHome = homePlayers.find(
        (p: {playerId?: number; id?: number; player_id?: number}) =>
          Number(p.playerId ?? p.player_id ?? p.id) === uid,
      )
      if (onHome) {
        setMatchInfo(prev => ({
          ...prev,
          team_role_id: Number(onHome.team_role_id ?? 0),
          player_team_id: homeId,
        }))
        return
      }
      const onAway = awayPlayers.find(
        (p: {playerId?: number; id?: number; player_id?: number}) =>
          Number(p.playerId ?? p.player_id ?? p.id) === uid,
      )
      if (onAway) {
        setMatchInfo(prev => ({
          ...prev,
          team_role_id: Number(onAway.team_role_id ?? 0),
          player_team_id: awayId,
        }))
      }
    }

    resolveMembership()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, matchInfo.home_team_id, matchInfo.away_team_id])

  function ShowLocation(
    lat: number | undefined,
    long: number | undefined,
    address?: string,
  ) {
    // react-native-map-link treats 0 as missing: !(latitude && longitude)
    const hasCoords =
      typeof lat === 'number' &&
      typeof long === 'number' &&
      lat !== 0 &&
      long !== 0
    const trimmedAddress = address?.trim()
    if (!hasCoords && !trimmedAddress) return

    void showLocation({
      ...(hasCoords ? {latitude: lat, longitude: long} : {}),
      ...(trimmedAddress ? {address: trimmedAddress} : {}),
    })
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
        setMatchInfo(next)
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

  const isTournament = Number(matchInfo.tournament_id) > 0
  const divisionName = String(matchInfo.division_name || '').trim()
  const cupBannerLabel = formatCupBannerLabel({
    round: matchInfo.round,
    stage_label: matchInfo.stage_label,
    stage_key: matchInfo.stage_key,
    division_name: matchInfo.division_name,
    fallback: t('cup_match'),
    stageKeyLabels: {
      gold: t('cups_gold'),
      silver: t('cups_silver'),
      bronze: t('cups_bronze'),
    },
  })
  const cupTier = getCupTierTheme(matchInfo.stage_key)
  const accent = isTournament ? cupTier.accent : ACCENTS[idx % ACCENTS.length]
  const bothConfirmed =
    matchInfo.home_confirmed > 0 && matchInfo.away_confirmed > 0
  const dateLabel = formatMatchDate(getMatchDisplayDate(matchInfo))

  // Cap sizes for tablets — width-based sizing alone overflows fixed lineHeight on iPad
  const teamNameSize = (name: string) => {
    const len = name.length
    if (len > 12) return Math.min(17, Math.max(15, width * 0.042))
    if (len > 8) return Math.min(19, Math.max(16, width * 0.048))
    return Math.min(22, Math.max(18, width * 0.052))
  }
  const homeNameSize = teamNameSize(matchInfo.home_team_short_name)
  const awayNameSize = teamNameSize(matchInfo.away_team_short_name)
  const pageColors = isTournament ? theme.cupPage : theme.page
  const cupBoardBg = isDark ? cupTier.boardBgDark : cupTier.boardBgLight

  const cardBody = (
    <>
      {embedded ? null : (
      <LinearGradient
        colors={[...pageColors]}
        locations={[0, 0.55, 1]}
        start={{x: 0.2, y: 0}}
        end={{x: 0.9, y: 1}}
        style={StyleSheet.absoluteFillObject}
      />
      )}
      <View
        style={[
          styles.accentGlow,
          {backgroundColor: isTournament ? cupTier.glow : accent},
        ]}
      />

      <View style={{paddingHorizontal: pad, paddingTop: pad}}>
        <Link
          href={{
            pathname: scoresheetPathname as any,
            params: {params: JSON.stringify(matchInfo)},
          }}
          asChild>
          <Pressable style={({pressed}) => ({opacity: pressed ? 0.96 : 1})}>
            <View
              style={[
                styles.board,
                {
                  backgroundColor: isTournament ? cupBoardBg : theme.boardBg,
                  borderColor: isTournament ? cupTier.border : theme.boardBorder,
                },
                isTournament
                  ? {
                      borderWidth: 2,
                      paddingTop: 0,
                    }
                  : null,
              ]}>
              {!isTournament ? (
                <View style={[styles.stripe, {backgroundColor: accent}]} />
              ) : null}

              {isTournament ? (
                <CupMatchBanner
                  label={cupBannerLabel}
                  stageKey={matchInfo.stage_key}
                />
              ) : null}

              <View style={isTournament ? {paddingTop: 14} : null}>
              {(!isTournament && divisionName) || bothConfirmed ? (
                <View style={styles.metaRow}>
                  <View style={styles.chipsWrap}>
                    {!isTournament && divisionName ? (
                      <Chip
                        icon="shield-outline"
                        label={divisionName}
                        color={accent}
                        background={`${accent}22`}
                      />
                    ) : null}
                    {bothConfirmed ? (
                      <Chip
                        icon="check-decagram"
                        label={t('match_confirmed')}
                        color={theme.confirm}
                        background={theme.confirmBg}
                      />
                    ) : null}
                  </View>
                </View>
              ) : null}

              {postponedProposal?.newDate ? (
                <Text style={[styles.postponeNote, {color: theme.postponeText}]}>
                  {t('postponed_to')}{' '}
                  {formatProposedDate(postponedProposal.newDate)}
                </Text>
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
                        styles.postponeBannerText,
                        {color: theme.indefiniteText},
                      ]}>
                      {indefinitePostponement.proposingTeamName}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.postponeBannerText,
                      {color: theme.indefiniteText},
                    ]}>
                    {t('postponed_indefinitely')}
                  </Text>
                </View>
              ) : null}

              <Text
                style={[styles.matchDate, {color: theme.text}]}
                numberOfLines={2}>
                {dateLabel}
              </Text>

              <View style={styles.teamsRow}>
                <View style={styles.teamCol}>
                  <TeamLogoMark
                    uri={matchInfo.home_logo}
                    name={matchInfo.home_team_short_name}
                    size={logoSize}
                    accent={accent}
                    ringBg={theme.logoRingBg}
                    ringBorder={theme.logoRingBorder}
                  />
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
                        fontSize: homeNameSize,
                        lineHeight: Math.round(homeNameSize * 1.25),
                      },
                    ]}
                    numberOfLines={2}>
                    {matchInfo.home_team_short_name}
                  </Text>
                  <Text style={[styles.record, {color: theme.textSecondary}]}>
                    {matchInfo?.homeStats?.won ?? 0}-
                    {matchInfo?.homeStats?.lost ?? 0}-
                    {matchInfo?.homeStats?.tied ?? 0}
                    {winProb ? ` · ${winProb.home}%` : ''}
                  </Text>
                </View>

                <View style={styles.vsCol}>
                  <View
                    style={[
                      styles.vsBadge,
                      {backgroundColor: `${accent}22`, borderColor: `${accent}55`},
                    ]}>
                    <MCI name="bullseye-arrow" size={22} color={accent} />
                  </View>
                  <Text style={[styles.vsHint, {color: theme.textMuted}]}>VS</Text>
                </View>

                <View style={styles.teamCol}>
                  <TeamLogoMark
                    uri={matchInfo.away_logo}
                    name={matchInfo.away_team_short_name}
                    size={logoSize}
                    accent={accent}
                    ringBg={theme.logoRingBg}
                    ringBorder={theme.logoRingBorder}
                  />
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
                        fontSize: awayNameSize,
                        lineHeight: Math.round(awayNameSize * 1.25),
                      },
                    ]}
                    numberOfLines={2}>
                    {matchInfo.away_team_short_name}
                  </Text>
                  <Text style={[styles.record, {color: theme.textSecondary}]}>
                    {matchInfo?.awayStats?.won ?? 0}-
                    {matchInfo?.awayStats?.lost ?? 0}-
                    {matchInfo?.awayStats?.tied ?? 0}
                    {winProb ? ` · ${winProb.away}%` : ''}
                  </Text>
                </View>
              </View>

              {winProb ? (
                <View style={[styles.probTrack, {backgroundColor: theme.probTrack}]}>
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

              <Pressable
                onPress={() =>
                  ShowLocation(
                    matchInfo.latitude,
                    matchInfo.longitude,
                    matchInfo.location ?? matchInfo.name,
                  )
                }
                style={[
                  styles.venueCard,
                  {
                    backgroundColor: theme.venueBg,
                    borderColor: theme.venueBorder,
                  },
                ]}>
                <View style={styles.venueTitleRow}>
                  <Ionicons name="location-outline" size={18} color={accent} />
                  <Text
                    style={[styles.venueName, {color: theme.venueName}]}
                    numberOfLines={1}>
                    {matchInfo.name}
                  </Text>
                </View>
                <Text
                  style={[styles.venueAddress, {color: theme.textSecondary}]}
                  numberOfLines={2}>
                  {matchInfo.location}
                </Text>
              </Pressable>
              </View>
            </View>
          </Pressable>
        </Link>

        <View style={{paddingHorizontal: pad}}>
          <MatchBettingRow
            matchId={Number(matchInfo.match_id ?? 0)}
            homeShort={matchInfo.home_team_short_name}
            awayShort={matchInfo.away_team_short_name}
            accent={accent}
          />
          <MatchPredictionRow
            matchId={Number(matchInfo.match_id ?? 0)}
            accent={accent}
            pathname={
              scoresheetPathname === '/Match'
                ? '/Predictions/[matchId]'
                : `${scoresheetPathname}/Predictions/[matchId]`
            }
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={HandleShare}
            style={({pressed}) => [
              styles.shareBtn,
              {
                borderColor: `${accent}66`,
                backgroundColor: theme.shareBg,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <MCI name="share-outline" size={18} color={theme.icon} />
            <Text style={[styles.shareText, {color: theme.icon}]}>
              {t('share')}
            </Text>
          </Pressable>

          {bothConfirmed ? (
            <Button
              type="outline"
              onPress={() => HandleUnconfirm()}
              icon={
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color="#F87171"
                />
              }
              style={{borderColor: '#F87171', marginTop: 12}}>
              <Text style={{color: '#F87171', fontSize: 15, fontWeight: '600'}}>
                {t('unconfirm')}
              </Text>
            </Button>
          ) : showProposeNewDate ? (
            <Button
              type="outline"
              onPress={() => HandlePostpone()}
              icon={
                <MaterialIcons name="date-range" size={18} color={theme.icon} />
              }
              style={{
                borderColor: theme.shareBorder,
                marginTop: 12,
              }}>
              <Text
                style={{
                  color: theme.icon,
                  fontSize: 15,
                  fontWeight: '600',
                  textAlign: 'center',
                }}>
                {t('propose_new_date')}
              </Text>
            </Button>
          ) : user.id && matchInfo.player_team_id ? (
            <View style={styles.actionRow}>
              <Button
                type="primary"
                onPress={() => HandleConfirm()}
                icon={
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="white"
                  />
                }
                style={{backgroundColor: accent, flex: 1}}>
                <Text
                  style={{fontSize: 14, color: 'white', fontWeight: '700'}}>
                  {t('confirm_attendance')}
                </Text>
              </Button>
              <Button
                type="outline"
                onPress={() => HandlePostpone()}
                icon={
                  <MaterialIcons name="schedule" size={18} color={theme.icon} />
                }
                style={{
                  borderColor: theme.shareBorder,
                  flex: 1,
                }}>
                <Text
                  style={{
                    color: theme.icon,
                    fontSize: 14,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}>
                  {t('reschedule')}
                </Text>
              </Button>
            </View>
          ) : null}
        </View>
      </View>
    </>
  )

  if (embedded) {
    return (
      <LinearGradient
        colors={[...pageColors]}
        locations={[0, 0.55, 1]}
        start={{x: 0.2, y: 0}}
        end={{x: 0.9, y: 1}}
        style={{
          marginHorizontal: 12,
          marginBottom: 12,
          borderRadius: 20,
          overflow: 'hidden',
        }}>
        {cardBody}
      </LinearGradient>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={{width, paddingBottom: 200}}
      showsVerticalScrollIndicator={false}>
      {cardBody}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  accentGlow: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.18,
  },
  board: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    backgroundColor: 'rgba(15,23,42,0.72)',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
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
    marginBottom: 14,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  postponeNote: {
    color: '#FDE68A',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  postponeBanner: {
    backgroundColor: 'rgba(239,68,68,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  postponeBannerText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  matchDate: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  logoRing: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    marginBottom: 10,
  },
  logoInitialWell: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitial: {
    fontWeight: '800',
  },
  rank: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  teamName: {
    color: '#F8FAFC',
    fontWeight: '800',
    textAlign: 'center',
  },
  record: {
    marginTop: 8,
    color: 'rgba(226,232,240,0.72)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  vsCol: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 28,
    gap: 6,
  },
  vsBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  vsHint: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(226,232,240,0.55)',
  },
  probTrack: {
    marginTop: 16,
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: 'rgba(148,163,184,0.15)',
  },
  probHome: {
    height: '100%',
  },
  probAway: {
    height: '100%',
  },
  venueCard: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    backgroundColor: 'rgba(2,6,23,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  venueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  venueName: {
    flex: 1,
    color: '#F1F5F9',
    fontWeight: '700',
    fontSize: 14,
  },
  venueAddress: {
    color: 'rgba(226,232,240,0.7)',
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    marginTop: 16,
  },
  shareBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  shareText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
})
