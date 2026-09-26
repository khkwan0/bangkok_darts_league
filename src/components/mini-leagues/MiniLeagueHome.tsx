import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {MiniMatchCard} from '@/components/mini-leagues/MiniMatchCard'
import LiveScores from '@/components/upcoming/LiveScores'
import {useLeagueContext} from '@/context/LeagueContext'
import {useLeague} from '@/hooks'
import {useMiniLeagues} from '@/hooks/useMiniLeagues'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import {useThemeColor} from '@/hooks/useThemeColor'
import {
  getMiniLeaguePalette,
} from '@/types/competition'
import {
  MiniSeasonChips,
  useMiniSeasonSelection,
} from '@/components/mini-leagues/MiniSeasonChips'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {router} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View as RNView,
  useColorScheme,
} from 'react-native'

function matchInfoFromResponse(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== 'object') return null
  const payload = res as {status?: string; data?: unknown; match_id?: unknown}
  if (payload.status === 'ok' && payload.data && typeof payload.data === 'object') {
    return payload.data as Record<string, unknown>
  }
  if (typeof payload.match_id !== 'undefined') {
    return payload as Record<string, unknown>
  }
  return null
}

type MiniMatch = {
  id: number
  date: string
  status_id: number
  home_team_name?: string
  away_team_name?: string
  home_frames?: number | null
  away_frames?: number | null
  round?: number | null
  tournament_id?: number | null
}

export function MiniLeagueHome({miniLeagueId}: {miniLeagueId: number}) {
  const {t} = useTranslation()
  const api = useMiniLeagues()
  const apiRef = React.useRef(api)
  apiRef.current = api
  const league = useLeague()
  const screenBg = useThemeColor({}, 'background')
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const {state, StopRefreshUpcoming} = useLeagueContext()
  const stopRefreshRef = React.useRef(StopRefreshUpcoming)
  stopRefreshRef.current = StopRefreshUpcoming
  const [matches, setMatches] = React.useState<MiniMatch[]>([])
  const [mini, setMini] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [openingId, setOpeningId] = React.useState<number | null>(null)
  const listContentStyle = useTabListContentContainerStyle({
    backgroundColor: screenBg,
    flexGrow: 1,
    paddingTop: 4,
    paddingBottom: 24,
  })
  const {seasons, seasonId, setSeasonId, ready: seasonsReady} =
    useMiniSeasonSelection(miniLeagueId)

  const load = React.useCallback(async () => {
    const opts =
      seasonId != null && Number(seasonId) > 0
        ? {season_id: Number(seasonId)}
        : undefined
    const [m, mt] = await Promise.all([
      apiRef.current.get(miniLeagueId),
      apiRef.current.listMatches(miniLeagueId, opts),
    ])
    if (m?.status === 'ok') setMini(m.data)
    if (mt?.status === 'ok') {
      const all: MiniMatch[] = mt.data || []
      setMatches(
        all
          .filter(x => Number(x.status_id) === 1)
          .sort((a, b) => String(a.date).localeCompare(String(b.date))),
      )
    }
  }, [miniLeagueId, seasonId])

  const hasLoadedOnce = React.useRef(false)

  React.useEffect(() => {
    hasLoadedOnce.current = false
  }, [miniLeagueId])

  React.useEffect(() => {
    if (!seasonsReady) return
    let cancelled = false
    const isInitial = !hasLoadedOnce.current
    if (isInitial) setLoading(true)
    load().finally(() => {
      if (!cancelled) {
        if (isInitial) setLoading(false)
        hasLoadedOnce.current = true
        // Clear any pending refresh flag without triggering a second fetch.
        stopRefreshRef.current()
      }
    })
    return () => {
      cancelled = true
    }
  }, [load, seasonsReady])

  React.useEffect(() => {
    if (!state.refreshUpcoming || !hasLoadedOnce.current) return
    load().finally(() => {
      stopRefreshRef.current()
    })
  }, [state.refreshUpcoming, load])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function openMatch(matchId: number) {
    if (openingId) return
    setOpeningId(matchId)
    try {
      // @ts-expect-error runtime method
      const res = await league.GetMatchById(matchId)
      const matchInfo = matchInfoFromResponse(res)
      if (matchInfo) {
        router.push({
          pathname: '/Match',
          params: {params: JSON.stringify(matchInfo)},
        })
      }
    } finally {
      setOpeningId(null)
    }
  }

  const palette = getMiniLeaguePalette(miniLeagueId)
  const accent = palette.accent
  const labelColor = isDark
    ? palette.accentOnSoftDark
    : palette.accentOnSoftLight
  const soft = isDark ? palette.softDark : palette.soft
  const softBorder = isDark ? palette.borderDark : palette.border
  const panelMuted = isDark ? 'rgba(248,250,252,0.78)' : 'rgba(15,23,42,0.7)'
  const panelTitle = isDark ? '#F8FAFC' : '#0F172A'
  const showLiveScores =
    typeof state.showLiveScores === 'undefined' || state.showLiveScores

  return (
    <View className="flex-1" style={{backgroundColor: screenBg}}>
      {showLiveScores ? <LiveScores /> : null}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={accent} />
        </View>
      ) : (
        <>
          <RNView style={{paddingHorizontal: 12, paddingTop: 8}}>
            <MiniSeasonChips
              seasons={seasons}
              seasonId={seasonId}
              onSelect={setSeasonId}
            />
          </RNView>
          <RNView
            style={{
              marginHorizontal: 8,
              marginTop: 12,
              marginBottom: 10,
              paddingVertical: 18,
              paddingHorizontal: 18,
              borderRadius: 16,
              backgroundColor: soft,
              borderWidth: 1,
              borderColor: softBorder,
            }}>
            <RNView
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}>
              <RNView style={{flex: 1, minWidth: 0, paddingRight: 4}}>
                <Text
                  style={{
                    color: labelColor,
                    fontSize: 11,
                    fontWeight: '800',
                    letterSpacing: 0.8,
                  }}>
                  UPCOMING
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 16,
                    fontWeight: '800',
                    marginTop: 4,
                    color: panelTitle,
                  }}>
                  {matches.length} open match
                  {matches.length === 1 ? '' : 'es'}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    marginTop: 4,
                    color: panelMuted,
                  }}>
                  {mini?.is_admin
                    ? t('admin')
                    : mini?.member_status === 'active'
                      ? t('member')
                      : t('other_mini_league')}
                </Text>
              </RNView>
              <RNView
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingLeft: 4,
                }}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/teams/mini-leagues/[id]',
                      params: {id: String(miniLeagueId)},
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Manage mini league"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: softBorder,
                  }}>
                  <MCI
                    name="cog-outline"
                    size={22}
                    color={accent}
                  />
                </Pressable>
                {mini?.is_admin ? (
                  <Button
                    small
                    onPress={() =>
                      router.push({
                        pathname: '/teams/mini-leagues/[id]/create-match',
                        params: {id: String(miniLeagueId)},
                      })
                    }>
                    <Text className="text-white">New</Text>
                  </Button>
                ) : null}
              </RNView>
            </RNView>
          </RNView>

          <FlatList
            data={matches}
            keyExtractor={item => String(item.id)}
            style={{flex: 1, backgroundColor: screenBg}}
            contentContainerStyle={listContentStyle}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={accent}
                colors={[accent]}
              />
            }
            ListEmptyComponent={
              <View
                style={{
                  marginHorizontal: 16,
                  marginTop: 24,
                  paddingVertical: 36,
                  paddingHorizontal: 20,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: isDark ? '#444' : '#CBD5E1',
                  alignItems: 'center',
                }}>
                <MCI
                  name="bullseye-arrow"
                  size={36}
                  color={accent}
                  style={{opacity: 0.8, marginBottom: 10}}
                />
                <Text
                  style={{
                    fontWeight: '700',
                    fontSize: 16,
                    textAlign: 'center',
                  }}>
                  No open matches
                </Text>
                <Text
                  style={{
                    opacity: 0.6,
                    textAlign: 'center',
                    marginTop: 6,
                    lineHeight: 20,
                  }}>
                  {mini?.is_admin
                    ? 'Create a match to get started.'
                    : 'Ask an admin to schedule the next match.'}
                </Text>
                {mini?.is_admin ? (
                  <View style={{marginTop: 16}}>
                    <Button
                      small
                      onPress={() =>
                        router.push({
                          pathname:
                            '/teams/mini-leagues/[id]/create-match',
                          params: {id: String(miniLeagueId)},
                        })
                      }>
                      <Text className="text-white">Create match</Text>
                    </Button>
                  </View>
                ) : null}
              </View>
            }
            renderItem={({item}) => (
              <MiniMatchCard
                item={item}
                miniLeagueId={miniLeagueId}
                opening={openingId === item.id}
                onPress={() => openMatch(item.id)}
              />
            )}
          />
        </>
      )}
    </View>
  )
}
