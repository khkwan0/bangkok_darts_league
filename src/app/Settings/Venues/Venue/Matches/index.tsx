import React, {useEffect, useMemo, useRef, useState} from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text as RNText,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native'
import {MaterialIcons} from '@expo/vector-icons'
import {router, useLocalSearchParams} from 'expo-router'
import {useNavigation, useTheme} from 'expo-router/react-navigation'
import {DateTime} from 'luxon'
import {useTranslation} from 'react-i18next'
import AppSwitch from '@/components/AppSwitch'
import {ThemedText as Text} from '@/components/ThemedText'
import MatchCard from '@/components/upcoming/MatchCard'
import MatchCardOld from '@/components/upcoming/MatchCardOld'
import MatchesCalendar from '@/components/upcoming/MatchesCalendar'
import config from '@/config'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  filterMatchesByScope,
  type StatsScope,
} from '@/context/StatsScopeContext'
import {useLeague, useSeason} from '@/hooks'
import {BANGKOK_ZONE, nowInBangkok, toBangkok} from '@/lib/bangkokTime'
import {
  getMatchDisplayDate,
  isPostponedDateLabel,
} from '@/lib/postponedProposal'
import {
  loadVenueMatchesView,
  saveVenueMatchesView,
  type VenueMatchesView,
} from '@/lib/venueMatchesView'

type VenueMatch = {
  id?: number
  match_id?: number
  date?: string
  original_date?: string
  venue_id?: number | null
  effective_venue_id?: number | null
  venue_name?: string | null
  venue_location?: string | null
  venue_plus?: string | null
  venue_latitude?: number | null
  venue_longitude?: number | null
  name?: string
  location?: string
  latitude?: number
  longitude?: number
  plus?: string
  home_team_id?: number
  away_team_id?: number
  home_team_name?: string
  away_team_name?: string
  home_team_short_name?: string
  away_team_short_name?: string
  home_logo?: string | null
  away_logo?: string | null
  new_home_team_logo?: string | null
  new_away_team_logo?: string | null
  logo?: string | null
  division_name?: string | null
  format?: string
  tournament_id?: number
  round?: number | null
  stage_label?: string | null
  stage_key?: string | null
  game_type_label?: string | null
  home_confirmed?: number
  away_confirmed?: number
  postponed_proposal?: unknown
  status_id?: number
}

const SCOPE_OPTIONS: {id: StatsScope; labelKey: string}[] = [
  {id: 'league', labelKey: 'stats_scope_league'},
  {id: 'cup', labelKey: 'stats_scope_cup'},
  {id: 'both', labelKey: 'stats_scope_both'},
]

function resolveLogoUrl(logo?: string | null): string | undefined {
  if (!logo) return undefined
  const trimmed = String(logo).trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  // MatchCard rejects bare "/logos/" — only accept a real filename/path.
  if (/^\/?logos\/?$/i.test(trimmed)) return undefined
  const base = String((config as {logoUrl?: string}).logoUrl || '').replace(
    /\/$/,
    '',
  )
  const path = trimmed.replace(/^\//, '')
  return base ? `${base}/${path}` : trimmed
}

function teamLogoFromRecord(team: {
  team_logo?: string | null
  logo?: string | null
  venue_logo?: string | null
}): string | undefined {
  return resolveLogoUrl(team.team_logo || team.logo || team.venue_logo)
}

function normalizeVenueMatch(
  row: VenueMatch,
  logoByTeamId: Map<number, string>,
  venueLogo?: string,
): VenueMatch {
  const matchId = Number(row.match_id ?? row.id) || 0
  const homeId = Number(row.home_team_id ?? 0)
  const awayId = Number(row.away_team_id ?? 0)
  return {
    ...row,
    match_id: matchId,
    format: row.format || '',
    name: row.name || row.venue_name || '',
    location: row.location || row.venue_location || undefined,
    latitude: row.latitude ?? row.venue_latitude ?? undefined,
    longitude: row.longitude ?? row.venue_longitude ?? undefined,
    plus: row.plus || row.venue_plus || undefined,
    home_confirmed: Number(row.home_confirmed ?? 0),
    away_confirmed: Number(row.away_confirmed ?? 0),
    home_team_short_name:
      row.home_team_short_name || row.home_team_name || '',
    away_team_short_name:
      row.away_team_short_name || row.away_team_name || '',
    // Prefer team logos; fall back to this venue's logo for the home side
    // (matches Home's /matches mapping of venue logo → home_logo).
    home_logo:
      resolveLogoUrl(row.home_logo || row.new_home_team_logo || row.logo) ||
      (homeId > 0 ? logoByTeamId.get(homeId) : undefined) ||
      venueLogo,
    away_logo:
      resolveLogoUrl(row.away_logo || row.new_away_team_logo) ||
      (awayId > 0 ? logoByTeamId.get(awayId) : undefined),
  }
}

/** True when this fixture is played at the given venue. */
function isMatchAtVenue(
  row: VenueMatch,
  venueId: number,
  homeTeamIdsAtVenue: Set<number>,
  venueName?: string,
): boolean {
  const effective = Number(row.effective_venue_id ?? 0)
  if (effective > 0) return effective === venueId

  // Match-level venue override (not the home-team default).
  // Skip when the upcoming /matches shape put venue columns on the row as
  // v.* — then `id` is the venue id and `match_id` is the fixture id.
  const upcomingVenueShape =
    row.match_id != null &&
    row.id != null &&
    Number(row.match_id) > 0 &&
    Number(row.match_id) !== Number(row.id)

  if (upcomingVenueShape) {
    return Number(row.id) === venueId
  }

  const override = Number(row.venue_id ?? 0)
  if (override > 0) return override === venueId

  // League (and cups without an override): home side's home venue.
  const homeId = Number(row.home_team_id ?? 0)
  if (homeId > 0 && homeTeamIdsAtVenue.has(homeId)) return true

  // Last resort: venue name from the join (covers missing team maps).
  if (venueName) {
    const rowName = String(row.venue_name || row.name || '')
      .trim()
      .toLowerCase()
    if (rowName && rowName === venueName.trim().toLowerCase()) return true
  }

  return false
}

function sortByDate(a: VenueMatch, b: VenueMatch) {
  const aDate = a.date ? Date.parse(a.date) : 0
  const bDate = b.date ? Date.parse(b.date) : 0
  return aDate - bDate
}

/**
 * Upcoming = not finalized. Includes overdue/unplayed (status 1) and live (2).
 * Turn the toggle off to also include completed (status 3).
 */
function isUpcomingMatch(row: VenueMatch): boolean {
  const status = Number(row.status_id)
  if (status === 3) return false
  if (status === 1 || status === 2) return true

  // Rows without status_id: today-or-later, or unscheduled/postponed.
  const raw = getMatchDisplayDate({
    date: row.date ?? '',
    original_date: row.original_date,
  })
  if (!raw || isPostponedDateLabel(raw)) return true
  let day = toBangkok(raw).startOf('day')
  if (!day.isValid) {
    day = DateTime.fromSQL(raw, {zone: BANGKOK_ZONE}).startOf('day')
  }
  if (!day.isValid) return true
  return day >= nowInBangkok().startOf('day')
}

export default function VenueMatches() {
  const params = useLocalSearchParams()
  const parsed = useMemo(() => {
    try {
      const raw = params.params
      const str = Array.isArray(raw) ? raw[0] : raw
      return str ? JSON.parse(String(str)) : {}
    } catch {
      return {}
    }
  }, [params.params])
  const venueId = Number(parsed.venueId) || 0
  const venueName =
    typeof parsed.venueName === 'string' ? parsed.venueName : ''

  const {t} = useTranslation()
  const navigation = useNavigation()
  const {colors} = useTheme()
  const colorScheme = useColorScheme()
  const {width} = useWindowDimensions()
  const {state} = useLeagueContext()
  const league = useLeague()
  const season = useSeason()
  const currentSeason = state.season
  // useLeague/useSeason return new objects every render — keep methods in a ref
  // so the fetch effect only re-runs when venue/season change.
  const fetchRef = useRef({league, season})
  fetchRef.current = {league, season}

  const [allFixtures, setAllFixtures] = useState<VenueMatch[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [matchesView, setMatchesView] = useState<VenueMatchesView>('list')
  const [matchScope, setMatchScope] = useState<StatsScope>('both')
  const [upcomingOnly, setUpcomingOnly] = useState(true)

  const fixtures = useMemo(() => {
    const scoped = filterMatchesByScope(allFixtures, matchScope)
    return upcomingOnly ? scoped.filter(isUpcomingMatch) : scoped
  }, [allFixtures, matchScope, upcomingOnly])

  useEffect(() => {
    navigation.setOptions({
      title: venueName ? `${venueName}` : t('matches'),
    })
  }, [navigation, venueName, t])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const stored = await loadVenueMatchesView()
      if (!cancelled) setMatchesView(stored)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function fetchVenueFixtures(): Promise<VenueMatch[]> {
    const {league: leagueApi, season: seasonApi} = fetchRef.current
    if (!venueId || !currentSeason) return []

    const homeTeamIdsAtVenue = new Set<number>()
    const logoByTeamId = new Map<number, string>()
    let venueLogo: string | undefined

    // Load venue teams separately from season logos so a teams-API failure
    // cannot wipe venue matching (which would hide all league fixtures).
    try {
      const venues = await leagueApi.GetVenues()
      const list = Array.isArray(venues) ? venues : []
      const venue = list.find((v: {id?: number}) => Number(v.id) === venueId)
      venueLogo = resolveLogoUrl(
        (venue as {logo?: string | null} | undefined)?.logo,
      )
      const venueTeams = Array.isArray(venue?.teams) ? venue.teams : []
      // GetVenues already scopes teams to the current season — do not also
      // require team.season_id === state.season (FK aliases can differ).
      for (const team of venueTeams) {
        const active =
          team?.status_id == null || Number(team.status_id) === 1
        if (active && Number(team?.id) > 0) {
          homeTeamIdsAtVenue.add(Number(team.id))
        }
        const logo = teamLogoFromRecord(team)
        if (logo && Number(team?.id) > 0) {
          logoByTeamId.set(Number(team.id), logo)
        }
      }
    } catch (e) {
      console.log('Failed to load venues for match filter', e)
    }

    try {
      const seasonTeams = await leagueApi.GetTeamsBySeason(currentSeason, {
        includeNoDivision: true,
      })
      const teams = Array.isArray(seasonTeams) ? seasonTeams : []
      for (const team of teams) {
        const id = Number(team?.id)
        if (!(id > 0)) continue
        // Season roster covers home teams when the venues payload omitted them.
        if (
          Number(team?.venue_id) === venueId &&
          (team?.status_id == null || Number(team.status_id) === 1)
        ) {
          homeTeamIdsAtVenue.add(id)
        }
        const logo = teamLogoFromRecord(team)
        if (logo) logoByTeamId.set(id, logo)
      }
    } catch (e) {
      console.log('Failed to load season teams for match logos', e)
    }

    let rows: VenueMatch[] = []
    let seasonFetchOk = false
    try {
      const bySeason = await leagueApi.GetMatchesBySeason(currentSeason)
      if (Array.isArray(bySeason)) {
        rows = bySeason
        seasonFetchOk = true
      } else if (Array.isArray((bySeason as {data?: VenueMatch[]})?.data)) {
        rows = (bySeason as {data: VenueMatch[]}).data
        seasonFetchOk = true
      }
    } catch {
      seasonFetchOk = false
    }

    // Get() returns error objects without throwing — fall back to /matches.
    if (!seasonFetchOk) {
      const upcoming = await seasonApi.GetMatches([
        'noteam=true',
        'newonly=false',
      ])
      rows = Array.isArray(upcoming) ? upcoming : []
    }

    return rows
      .filter(row =>
        isMatchAtVenue(row, venueId, homeTeamIdsAtVenue, venueName),
      )
      .map(row => normalizeVenueMatch(row, logoByTeamId, venueLogo))
      .filter(row => Number(row.match_id) > 0)
      .sort(sortByDate)
  }

  useEffect(() => {
    let cancelled = false

    async function loadMatches() {
      if (!venueId || !currentSeason) {
        if (!cancelled) {
          setAllFixtures([])
          setInitialLoading(false)
          setError(!venueId)
        }
        return
      }

      try {
        setError(false)
        const filtered = await fetchVenueFixtures()
        if (!cancelled) setAllFixtures(filtered)
      } catch (err) {
        console.error('Failed to load venue matches:', err)
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) {
          setInitialLoading(false)
          setRefreshing(false)
        }
      }
    }

    setInitialLoading(true)
    loadMatches()
    return () => {
      cancelled = true
    }
  }, [venueId, currentSeason])

  async function refreshMatches() {
    if (!venueId || !currentSeason) return
    setRefreshing(true)
    try {
      setError(false)
      setAllFixtures(await fetchVenueFixtures())
    } catch (err) {
      console.error('Failed to refresh venue matches:', err)
      setError(true)
    } finally {
      setRefreshing(false)
    }
  }

  async function changeMatchesView(next: VenueMatchesView) {
    setMatchesView(next)
    try {
      await saveVenueMatchesView(next)
    } catch (e) {
      console.log(e)
    }
  }

  const scoresheetPathname = '/Settings/Venues/Venue/Matches/Match'

  function openMatch(index: number) {
    const match = fixtures[index]
    if (!match?.match_id) return
    router.push({
      pathname: scoresheetPathname as any,
      params: {params: JSON.stringify(match)},
    })
  }

  const ViewToggle = (
    <View
      className="mx-4 mb-2 mt-2 flex-row rounded-lg p-1"
      style={{
        backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
        borderWidth: colorScheme === 'dark' ? 0 : 1,
        borderColor: colors.border,
      }}>
      {(['list', 'calendar'] as const).map(mode => {
        const active = matchesView === mode
        const labelColor = active
          ? '#FFFFFF'
          : colorScheme === 'dark'
            ? '#FFFFFF'
            : colors.primary
        return (
          <Pressable
            key={mode}
            accessibilityRole="button"
            accessibilityState={{selected: active}}
            onPress={() => changeMatchesView(mode)}
            className="flex-1 flex-row items-center justify-center rounded-md py-2"
            style={{
              backgroundColor: active ? colors.primary : 'transparent',
            }}>
            <MaterialIcons
              name={mode === 'list' ? 'view-list' : 'calendar-today'}
              size={18}
              color={labelColor}
              style={{marginRight: 6}}
            />
            <RNText style={{fontWeight: '600', color: labelColor}}>
              {mode === 'list' ? t('list_view') : t('calendar')}
            </RNText>
          </Pressable>
        )
      })}
    </View>
  )

  const ScopeChips = (
    <View className="mx-4 mb-3 flex-row items-center">
      <View className="flex-1 flex-row flex-wrap" style={{gap: 8}}>
        {SCOPE_OPTIONS.map(opt => {
          const active = matchScope === opt.id
          return (
            <Pressable
              key={opt.id}
              accessibilityRole="button"
              accessibilityState={{selected: active}}
              onPress={() => setMatchScope(opt.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: active ? colors.primary : colors.card,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: active ? colors.primary : colors.border,
              }}>
              <RNText
                style={{
                  color: active ? '#fff' : colors.text,
                  fontWeight: active ? '700' : '500',
                  fontSize: 13,
                }}>
                {t(opt.labelKey)}
              </RNText>
            </Pressable>
          )
        })}
      </View>
      <View className="ml-2 flex-row items-center">
        <RNText
          style={{
            color: colors.text,
            fontSize: 13,
            fontWeight: '500',
            marginRight: 8,
          }}>
          {t('upcoming')}
        </RNText>
        <AppSwitch value={upcomingOnly} onValueChange={setUpcomingOnly} />
      </View>
    </View>
  )

  if (initialLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{backgroundColor: colors.background}}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-3 opacity-70" style={{color: colors.text}}>
          {t('loading')}
        </Text>
      </View>
    )
  }

  if (error) {
    return (
      <View
        className="flex-1 items-center justify-center p-6"
        style={{backgroundColor: colors.background}}>
        {ViewToggle}
        {ScopeChips}
        <Text
          className="text-center text-base font-semibold"
          style={{color: colors.text}}>
          {t('venue_not_found')}
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1" style={{backgroundColor: colors.background}}>
      {ViewToggle}
      {ScopeChips}
      {matchesView === 'calendar' ? (
        <MatchesCalendar
          fixtures={fixtures as any}
          onOpenMatch={openMatch}
          refreshing={refreshing}
          onRefresh={refreshMatches}
          contentContainerStyle={{paddingBottom: 32}}
          scoresheetPathname={scoresheetPathname}
        />
      ) : (
        <FlatList
          data={fixtures}
          keyExtractor={(item, index) =>
            String(item.match_id ?? `${item.home_team_id}-${item.date}-${index}`)
          }
          removeClippedSubviews={false}
          windowSize={11}
          maxToRenderPerBatch={8}
          initialNumToRender={6}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={
            fixtures.length === 0
              ? {
                  flexGrow: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 24,
                  paddingBottom: 32,
                }
              : {paddingBottom: 32}
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshMatches}
            />
          }
          ListEmptyComponent={
            <View className="items-center px-6 py-10">
              <Text
                className="text-center text-base opacity-70"
                style={{color: colors.text, maxWidth: 280}}>
                {upcomingOnly && allFixtures.length > 0
                  ? t('no_upcoming_matches')
                  : t('no_matches_this_season')}
              </Text>
            </View>
          }
          renderItem={({item, index}) =>
            state.isNewMatchCard ? (
              <MatchCard
                matchInfo={item as any}
                idx={index}
                handlePress={openMatch}
                showMineOnly={false}
                embedded
                scoresheetPathname={scoresheetPathname}
              />
            ) : (
              <View style={{width}}>
                <MatchCardOld
                  matchInfo={item as any}
                  idx={index}
                  handlePress={openMatch}
                  scoresheetPathname={scoresheetPathname}
                />
              </View>
            )
          }
        />
      )}
    </View>
  )
}
