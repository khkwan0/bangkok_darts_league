import Button from '@/components/Button'
import {MatchInfoDataType} from '@/components/Match/types'
import {ThemedText as Text} from '@/components/ThemedText'
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

export default function MatchCard({
  matchInfo: propsMatchInfo,
  idx,
}: {
  matchInfo: MatchInfoDataType
  idx: number
  handlePress?: (idx: number) => void
  showMineOnly?: boolean
}) {
  const router = useRouter()
  const {t} = useTranslation()
  const {state} = useLeagueContext()
  const match = useMatch()
  const teams = useTeams()
  const user = state.user
  const [matchInfo, setMatchInfo] = React.useState<MatchInfoDataType | null>(
    null,
  )
  const [isMounted, setIsMounted] = React.useState(false)
  const {width} = Dimensions.get('window')
  const accent = ACCENTS[idx % ACCENTS.length]
  const pad = Math.max(16, width * 0.04)
  const logoSize = Math.min(width * 0.22, 96)

  React.useEffect(() => {
    setMatchInfo(propsMatchInfo)
    setIsMounted(true)
  }, [propsMatchInfo])

  React.useEffect(() => {
    if (!isMounted || !matchInfo || !user?.id) return

    let cancelled = false

    async function resolveMembership() {
      if (Array.isArray(user.teams) && user.teams.length > 0) {
        for (const team of user.teams) {
          if (team.id === matchInfo!.home_team_id) {
            if (!cancelled) {
              setMatchInfo({
                ...matchInfo!,
                team_role_id: team.team_role_id,
                player_team_id: matchInfo!.home_team_id,
              })
            }
            return
          }
          if (team.id === matchInfo!.away_team_id) {
            if (!cancelled) {
              setMatchInfo({
                ...matchInfo!,
                team_role_id: team.team_role_id,
                player_team_id: matchInfo!.away_team_id,
              })
            }
            return
          }
        }
      }

      const homeId = Number(matchInfo!.home_team_id)
      const awayId = Number(matchInfo!.away_team_id)
      if (!homeId || !awayId) return
      const matchId = Number(matchInfo!.match_id ?? 0) || null

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
        setMatchInfo({
          ...matchInfo!,
          team_role_id: Number(onHome.team_role_id ?? 0),
          player_team_id: homeId,
        })
        return
      }
      const onAway = awayPlayers.find(
        (p: {playerId?: number; id?: number; player_id?: number}) =>
          Number(p.playerId ?? p.player_id ?? p.id) === uid,
      )
      if (onAway) {
        setMatchInfo({
          ...matchInfo!,
          team_role_id: Number(onAway.team_role_id ?? 0),
          player_team_id: awayId,
        })
      }
    }

    resolveMembership()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, user?.id, matchInfo?.home_team_id, matchInfo?.away_team_id])

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

  if (!isMounted || !matchInfo) return null

  const isTournament = Number((matchInfo as any).tournament_id) > 0
  const divisionName = String(
    (matchInfo as any).division_name || '',
  ).trim()
  const bothConfirmed =
    matchInfo.home_confirmed > 0 && matchInfo.away_confirmed > 0
  const dateLabel = formatMatchDate(getMatchDisplayDate(matchInfo))

  const teamNameSize = (name: string) => {
    const len = name.length
    if (len > 12) return Math.max(15, width * 0.042)
    if (len > 8) return Math.max(16, width * 0.048)
    return Math.max(18, width * 0.052)
  }

  return (
    <ScrollView
      contentContainerStyle={{width, paddingBottom: 200}}
      showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#0B1220', '#111827', '#0F172A']}
        locations={[0, 0.55, 1]}
        start={{x: 0.2, y: 0}}
        end={{x: 0.9, y: 1}}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.accentGlow, {backgroundColor: accent}]} />

      <View style={{paddingHorizontal: pad, paddingTop: pad}}>
        <Link
          href={{
            pathname: '/Match',
            params: {params: JSON.stringify(matchInfo)},
          }}
          asChild>
          <Pressable style={({pressed}) => ({opacity: pressed ? 0.96 : 1})}>
            <View style={styles.board}>
              <View style={[styles.stripe, {backgroundColor: accent}]} />

              <View style={styles.metaRow}>
                <View style={styles.chipsWrap}>
                  <Chip
                    icon="calendar"
                    label={dateLabel}
                    color="#E2E8F0"
                    background="rgba(148,163,184,0.16)"
                  />
                  {divisionName ? (
                    <Chip
                      icon="shield-outline"
                      label={divisionName}
                      color={accent}
                      background={`${accent}22`}
                    />
                  ) : null}
                  {isTournament ? (
                    <Chip
                      icon="trophy-outline"
                      label="Tournament"
                      color="#FBBF24"
                      background="rgba(251,191,36,0.14)"
                    />
                  ) : null}
                  {bothConfirmed ? (
                    <Chip
                      icon="check-decagram"
                      label={t('match_confirmed')}
                      color="#34D399"
                      background="rgba(52,211,153,0.16)"
                    />
                  ) : null}
                </View>
              </View>

              {postponedProposal?.newDate ? (
                <Text style={styles.postponeNote}>
                  {t('postponed_to')}{' '}
                  {formatProposedDate(postponedProposal.newDate)}
                </Text>
              ) : null}

              {indefinitePostponement ? (
                <View style={styles.postponeBanner}>
                  {indefinitePostponement.proposingTeamName ? (
                    <Text style={styles.postponeBannerText}>
                      {indefinitePostponement.proposingTeamName}
                    </Text>
                  ) : null}
                  <Text style={styles.postponeBannerText}>
                    {t('postponed_indefinitely')}
                  </Text>
                </View>
              ) : null}

              <View style={styles.teamsRow}>
                <View style={styles.teamCol}>
                  <View style={styles.logoRing}>
                    <Image
                      source={{uri: matchInfo.home_logo}}
                      resizeMode="contain"
                      style={{width: logoSize, height: logoSize}}
                    />
                  </View>
                  {matchInfo?.homeStats?.rank != null ? (
                    <Text style={[styles.rank, {color: accent}]}>
                      #{matchInfo.homeStats.rank}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.teamName,
                      {fontSize: teamNameSize(matchInfo.home_team_short_name)},
                    ]}
                    numberOfLines={2}>
                    {matchInfo.home_team_short_name}
                  </Text>
                  <Text style={styles.record}>
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
                  <Text style={styles.vsHint}>VS</Text>
                </View>

                <View style={styles.teamCol}>
                  <View style={styles.logoRing}>
                    <Image
                      source={{uri: matchInfo.away_logo}}
                      resizeMode="contain"
                      style={{width: logoSize, height: logoSize}}
                    />
                  </View>
                  {matchInfo?.awayStats?.rank != null ? (
                    <Text style={[styles.rank, {color: accent}]}>
                      #{matchInfo.awayStats.rank}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.teamName,
                      {fontSize: teamNameSize(matchInfo.away_team_short_name)},
                    ]}
                    numberOfLines={2}>
                    {matchInfo.away_team_short_name}
                  </Text>
                  <Text style={styles.record}>
                    {matchInfo?.awayStats?.won ?? 0}-
                    {matchInfo?.awayStats?.lost ?? 0}-
                    {matchInfo?.awayStats?.tied ?? 0}
                    {winProb ? ` · ${winProb.away}%` : ''}
                  </Text>
                </View>
              </View>

              {winProb ? (
                <View style={styles.probTrack}>
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
                        backgroundColor: 'rgba(148,163,184,0.35)',
                      },
                    ]}
                  />
                </View>
              ) : null}

              <Pressable
                onPress={() =>
                  ShowLocation(matchInfo.latitude, matchInfo.longitude)
                }
                style={styles.venueCard}>
                <View style={styles.venueTitleRow}>
                  <Ionicons name="location-outline" size={18} color={accent} />
                  <Text style={styles.venueName} numberOfLines={1}>
                    {matchInfo.name}
                  </Text>
                </View>
                <Text style={styles.venueAddress} numberOfLines={2}>
                  {matchInfo.location}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Link>

        <View style={styles.actions}>
          <Pressable
            onPress={HandleShare}
            style={({pressed}) => [
              styles.shareBtn,
              {borderColor: `${accent}66`, opacity: pressed ? 0.85 : 1},
            ]}>
            <MCI name="share-outline" size={18} color="#E2E8F0" />
            <Text style={styles.shareText}>{t('share')}</Text>
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
                <MaterialIcons name="date-range" size={18} color="#E2E8F0" />
              }
              style={{
                borderColor: 'rgba(226,232,240,0.35)',
                marginTop: 12,
              }}>
              <Text
                style={{
                  color: '#E2E8F0',
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
                  <MaterialIcons name="schedule" size={18} color="#E2E8F0" />
                }
                style={{
                  borderColor: 'rgba(226,232,240,0.35)',
                  flex: 1,
                }}>
                <Text
                  style={{
                    color: '#E2E8F0',
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
  rank: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  teamName: {
    color: '#F8FAFC',
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
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
