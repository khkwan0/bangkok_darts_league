import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import AdSpot, {clearAdSpotCache} from '@/components/upcoming/AdSpot'
import WeeklyHighlightsCard from '@/components/upcoming/WeeklyHighlightsCard'
import MatchCard from '@/components/upcoming/MatchCard'
import MatchCardOld from '@/components/upcoming/MatchCardOld'
import MatchesCalendar from '@/components/upcoming/MatchesCalendar'
import LiveConnectionDot from '@/components/upcoming/LiveConnectionDot'
import {
  loadHomeHeaderSticky,
  saveHomeHeaderSticky,
} from '@/lib/homeHeaderSticky'
import {
  loadHomeMatchesView,
  saveHomeMatchesView,
  type HomeMatchesView,
} from '@/lib/homeMatchesView'
import {MiniLeagueHome} from '@/components/mini-leagues/MiniLeagueHome'
import {useLeagueContext} from '@/context/LeagueContext'
import {isMiniCompetition} from '@/types/competition'
import {useAccount, useAd, useLeague, useSeason} from '@/hooks'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import {MaterialCommunityIcons, MaterialIcons} from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import {useTheme} from "expo-router/react-navigation"
import {usePathname, useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  useColorScheme,
  useWindowDimensions,
} from 'react-native'

function MatchFilterCheck({
  label,
  value,
  disabled,
  onValueChange,
}: {
  label: string
  value: boolean
  disabled?: boolean
  onValueChange: (value: boolean) => void
}) {
  const colorScheme = useColorScheme()
  const tint = colorScheme === 'dark' ? '#FFFFFF' : '#37003C'

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{checked: value, disabled: !!disabled}}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      className="flex-row items-center py-1"
      style={{opacity: disabled ? 0.45 : 1}}>
      <MaterialIcons
        name={value ? 'check-box' : 'check-box-outline-blank'}
        size={22}
        color={tint}
      />
      <Text className="ml-1.5 text-base" style={{color: tint}}>
        {label}
      </Text>
    </Pressable>
  )
}

interface ItemType {
  home_team_id: number
  away_team_id: number
  date: string
  ad_spot?: boolean
  key?: string
}

/** DEBUG: only live-scores bar — no FlatList, filters, or match fetch. */
const DEBUG_MINIMAL_MATCHES_SCREEN = false
/** DEBUG: hide match list (ignored when DEBUG_MINIMAL_MATCHES_SCREEN is true). */
const DEBUG_HIDE_MATCH_FLATLIST = false

export default function UpcomingMatches(props: any) {
  const {colors} = useTheme()
  const {state, dispatch, StopRefreshUpcoming}: any = useLeagueContext()
  const [fixtures, setFixtures] = React.useState([])
  const user = state.user
  const [refreshing, setRefreshing] = React.useState(false)
  const [initialLoading, setInitialLoading] = React.useState(true)
  const [isMounted, setIsMounted] = React.useState(false)
  const [showMineOnly, setShowMineOnly] = React.useState(true)
  const [showPostponed, setShowPostponed] = React.useState(false)
  const [seasonNumber, setSeasonNumber] = React.useState('')
  const [headerSticky, setHeaderSticky] = React.useState(false)
  const [matchesView, setMatchesView] = React.useState<HomeMatchesView | null>(
    null,
  )
  const fetchIdRef = React.useRef(0)
  const adRefreshGenRef = React.useRef(0)
  const hasLoadedOnce = React.useRef(false)
  const season = useSeason()
  const league = useLeague()
  const account = useAccount()
  const adHook = useAd()
  const {t} = useTranslation()
  const router = useRouter()
  const {width, height} = useWindowDimensions()
  const colorScheme = useColorScheme()
  const screenBg = colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5'
  const listContentStyle = useTabListContentContainerStyle({
    backgroundColor: screenBg,
    flexGrow: 1,
    paddingHorizontal: 0,
  })

  const pathname = usePathname()

  React.useEffect(() => {
    if (state.refreshUpcoming) {
      GetMatches(true, showPostponed, 'silent')
      StopRefreshUpcoming()
    }
  }, [state.refreshUpcoming])

  async function GetSeason() {
    try {
      const _season = await league.GetSeason()
      dispatch({type: 'SET_SEASON', payload: _season})
    } catch (e) {
      console.log(e)
    }
  }

  async function FetchUser() {
    try {
      await account.FetchUser()
    } catch (e) {
      console.log(e)
    } finally {
      setIsMounted(true)
    }
  }

  function HandlePress(idx: number) {
    router.push({pathname: '/Match', params: fixtures[idx] as any})
  }

  async function GetMatches(
    filtered = false,
    postponed = false,
    mode: 'initial' | 'pull' | 'silent' = 'silent',
  ) {
    const fetchId = ++fetchIdRef.current
    try {
      if (mode === 'pull') {
        setRefreshing(true)
      } else if (mode === 'initial' || !hasLoadedOnce.current) {
        setInitialLoading(true)
      }
      const query = []
      if (filtered) {
        query.push('noteam=false')
      } else {
        query.push('noteam=true')
      }
      if (postponed) {
        query.push('newonly=false')
      } else {
        query.push('newonly=true')
      }
      const res = await season.GetMatches(query)
      if (fetchId !== fetchIdRef.current) return
      const list = Array.isArray(res) ? res : []
      const _fixtures = await AddAdSpots(list)
      if (fetchId !== fetchIdRef.current) return
      setFixtures(_fixtures)
      hasLoadedOnce.current = true
    } catch (e) {
      console.log(e)
      if (fetchId === fetchIdRef.current) {
        hasLoadedOnce.current = true
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setRefreshing(false)
        setInitialLoading(false)
      }
    }
  }

  async function AddAdSpots(_fixtures: any[]) {
    const originalFixtures = [..._fixtures]
    try {
      if (_fixtures.length === 0) {
        return _fixtures
      }
      let frequency = 0
      const res = await adHook.GetFrequency()
      if (
        typeof res?.frequency !== 'undefined' &&
        typeof res.frequency === 'number'
      ) {
        frequency = res.frequency
      }
      if (frequency <= 0) {
        return _fixtures
      }
      // New generation so FlatList remounts AdSpots and they refetch creatives.
      adRefreshGenRef.current += 1
      const refreshGen = adRefreshGenRef.current
      clearAdSpotCache()
      // Build a new list — never splice while iterating (frequency=1 infinite-looped).
      const withAds: any[] = []
      for (let i = 0; i < _fixtures.length; i++) {
        if ((i !== 0 && i % frequency === 0) || i === 1) {
          withAds.push({
            index: withAds.length,
            key: `ad_spot_${withAds.length}_g${refreshGen}`,
            refresh_gen: refreshGen,
            ad_spot: true,
          })
        }
        withAds.push(_fixtures[i])
      }
      withAds.push({
        index: withAds.length,
        key: `ad_spot_${withAds.length}_g${refreshGen}`,
        refresh_gen: refreshGen,
        ad_spot: true,
      })
      return withAds
    } catch (e) {
      console.error(e)
      return originalFixtures
    }
  }

  React.useEffect(() => {
    if (DEBUG_MINIMAL_MATCHES_SCREEN) {
      setIsMounted(true)
      return
    }
    GetSeason()
  }, [])

  React.useEffect(() => {
    if (DEBUG_MINIMAL_MATCHES_SCREEN) {
      return
    }
    FetchUser()
  }, [])

  function RefreshMatches(mode: 'initial' | 'pull' | 'silent' = 'silent') {
    if (typeof user?.teams !== 'undefined' && user.teams.length > 0) {
      if (showMineOnly) {
        if (showPostponed) {
          GetMatches(true, true, mode)
        } else {
          GetMatches(true, false, mode)
        }
      } else {
        if (showPostponed) {
          GetMatches(false, true, mode)
        } else {
          GetMatches(false, false, mode)
        }
      }
    } else {
      if (showPostponed) {
        GetMatches(false, true, mode)
      } else {
        GetMatches(false, false, mode)
      }
    }
  }

  React.useEffect(() => {
    if (DEBUG_MINIMAL_MATCHES_SCREEN) {
      return
    }
    if (isMounted) {
      RefreshMatches(hasLoadedOnce.current ? 'silent' : 'initial')
    }
  }, [showMineOnly, showPostponed, user, isMounted])
  /*
  React.useEffect(() => {
    if (
      typeof user?.teams !== 'undefined' &&
      user.teams.length > 0 &&
      showMineOnly
    ) {
      GetMatches(true)
    } else {
      GetMatches(false)
    }
  }, [user])
  */

  async function HandleSavePostponedOption() {
    try {
      await AsyncStorage.setItem(
        'postponed',
        JSON.stringify({showPostponed: showPostponed}),
      )
    } catch (e) {
      console.log(e)
    }
  }

  React.useEffect(() => {
    if (isMounted) {
      HandleSavePostponedOption()
    }
  }, [showPostponed])


  async function HandleGetPostponedOption() {
    try {
      const res = await AsyncStorage.getItem('postponed')
      if (res) {
        const _res = JSON.parse(res)
        setShowPostponed(_res.showPostponed)
      }
    } catch (e) {
      console.log(e)
    }
  }
  React.useEffect(() => {
    if (DEBUG_MINIMAL_MATCHES_SCREEN) {
      return
    }
    HandleGetPostponedOption()
  }, [])

  React.useEffect(() => {
    let cancelled = false
    loadHomeMatchesView().then(view => {
      if (!cancelled) setMatchesView(view)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function changeMatchesView(next: HomeMatchesView) {
    setMatchesView(next)
    try {
      await saveHomeMatchesView(next)
    } catch (e) {
      console.log(e)
    }
  }

  // Grid view fills the width with compact cards; tap still pushes /Match.
  const matchGridColumns = React.useMemo(() => {
    if (matchesView !== 'grid') return 1
    if (width >= 1100) return 3
    return 2
  }, [matchesView, width])
  const useMatchGrid = matchGridColumns > 1

  const listFixtures = React.useMemo(() => {
    if (!useMatchGrid) return fixtures
    // Ads don't span columns cleanly in a multi-column FlatList.
    return (fixtures as ItemType[]).filter(item => !item.ad_spot)
  }, [fixtures, useMatchGrid])

  const renderItem = React.useCallback(
    ({item, index}: {item: any; index: number}) => {
      if (typeof item.ad_spot !== 'undefined' && item.ad_spot) {
        return <AdSpot item={item} />
      }

      // Grid cells: compact card tiles. Full-bleed pager card is phone-only.
      if (useMatchGrid || !state.isNewMatchCard) {
        const card = (
          <MatchCardOld
            matchInfo={item}
            idx={index}
            handlePress={HandlePress}
            compact={useMatchGrid}
          />
        )
        if (!useMatchGrid) return card
        return (
          <View
            style={{
              flex: 1,
              maxWidth: `${100 / matchGridColumns}%`,
              paddingHorizontal: 6,
              paddingBottom: 12,
            }}>
            {card}
          </View>
        )
      }

      return (
        <MatchCard
          matchInfo={item}
          idx={index}
          handlePress={HandlePress}
          showMineOnly={showMineOnly}
        />
      )
    },
    [showMineOnly, state.isNewMatchCard, useMatchGrid, matchGridColumns],
  )

  React.useEffect(() => {
    let cancelled = false
    loadHomeHeaderSticky().then(sticky => {
      if (!cancelled) setHeaderSticky(sticky)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const toggleHeaderSticky = React.useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setHeaderSticky(value => {
      const next = !value
      void saveHomeHeaderSticky(next).catch(() => {})
      return next
    })
  }, [])

  if (isMounted && isMiniCompetition(state.competition)) {
    return <MiniLeagueHome miniLeagueId={state.competition.id} />
  }

  if (isMounted && DEBUG_MINIMAL_MATCHES_SCREEN) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: screenBg,
        }}>
        <View className="flex-1 items-center justify-center px-6">
          <Text style={{textAlign: 'center', opacity: 0.5}}>
            DEBUG_MINIMAL_MATCHES_SCREEN — live scores via tab accessory
          </Text>
        </View>
      </View>
    )
  }

  if (isMounted) {
    const homeList = (
      <View
        style={{
          flex: 1,
          backgroundColor: screenBg,
        }}>
        {(initialLoading || matchesView == null) && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        {!initialLoading && matchesView != null && (() => {
          const matchesHeader = (
            <View
              style={[
                {flexShrink: 0},
                headerSticky ? {backgroundColor: screenBg} : null,
              ]}>
              {!user.id && (
                <View className="my-4 mx-6">
                  <Button
                    onPress={() =>
                      router.push({
                        pathname: '/Auth',
                        params: {from: pathname},
                      })
                    }>
                    {t('login_to_see_your_matches')}
                  </Button>
                </View>
              )}
              {(typeof state.showPlayerOfTheWeek === 'undefined' ||
                state.showPlayerOfTheWeek) && <WeeklyHighlightsCard />}
              {(typeof user?.teams === 'undefined' || user.teams.length < 1) &&
                user.id && (
                  <View className="my-2 mx-2">
                    <Text style={{textAlign: 'center'}}>
                      You are not affiliated with a team.
                    </Text>
                  </View>
                )}
              <View className="mx-4 mb-2 flex-row items-stretch">
                <View
                  className="mr-2 flex-1 flex-row rounded-lg p-1"
                  style={{
                    backgroundColor:
                      colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
                    borderWidth: colorScheme === 'dark' ? 0 : 1,
                    borderColor: '#E0E0E0',
                  }}>
                  {(['list', 'grid', 'calendar'] as const).map(mode => {
                    const active = matchesView === mode
                    const labelColor = active
                      ? '#FFFFFF'
                      : colorScheme === 'dark'
                        ? '#FFFFFF'
                        : '#37003C'
                    const label =
                      mode === 'list'
                        ? t('list_view')
                        : mode === 'grid'
                          ? t('grid_view')
                          : t('calendar')
                    const icon =
                      mode === 'list'
                        ? 'view-list'
                        : mode === 'grid'
                          ? 'grid-view'
                          : 'calendar-today'
                    return (
                      <Pressable
                        key={mode}
                        accessibilityRole="button"
                        accessibilityState={{selected: active}}
                        onPress={() => changeMatchesView(mode)}
                        className="flex-1 flex-row items-center justify-center rounded-md py-2"
                        style={{
                          backgroundColor: active ? '#37003C' : 'transparent',
                        }}>
                        <MaterialIcons
                          name={icon}
                          size={18}
                          color={labelColor}
                          style={{marginRight: 4}}
                        />
                        <Text
                          className="font-semibold"
                          numberOfLines={1}
                          style={{color: labelColor}}>
                          {label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
                <LiveConnectionDot />
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{selected: headerSticky}}
                  accessibilityLabel={
                    headerSticky
                      ? 'Unpin matches header'
                      : 'Pin matches header'
                  }
                  onPress={toggleHeaderSticky}
                  className="flex-row items-center justify-center rounded-lg px-3"
                  style={({pressed}) => {
                    const isDark = colorScheme === 'dark'
                    const active = headerSticky
                    return {
                      backgroundColor: active
                        ? '#37003C'
                        : isDark
                          ? pressed
                            ? '#2A2A2A'
                            : '#1E1E1E'
                          : pressed
                            ? '#F0F0F0'
                            : '#FFFFFF',
                      borderWidth: isDark ? 0 : 1,
                      borderColor: active ? '#37003C' : '#E0E0E0',
                      minWidth: 48,
                    }
                  }}>
                  {({pressed}) => (
                    <MaterialCommunityIcons
                      name={headerSticky ? 'pin' : 'pin-off'}
                      size={20}
                      color={
                        pressed && !headerSticky
                          ? '#22c55e'
                          : headerSticky || colorScheme === 'dark'
                            ? '#FFFFFF'
                            : '#37003C'
                      }
                    />
                  )}
                </Pressable>
              </View>
              <View className="mx-4 mb-3 flex-row items-center justify-center gap-x-6">
                {typeof user?.teams !== 'undefined' && user.teams.length > 0 && (
                  <MatchFilterCheck
                    label={t('show_mine_only')}
                    disabled={refreshing}
                    value={showMineOnly}
                    onValueChange={setShowMineOnly}
                  />
                )}
                <MatchFilterCheck
                  label={t('show_postponed')}
                  disabled={refreshing}
                  value={showPostponed}
                  onValueChange={setShowPostponed}
                />
              </View>
            </View>
          )

          const isHorizontalPager =
            !useMatchGrid &&
            listFixtures.length > 0 &&
            state.isNewMatchCard
          // Horizontal pager needs a fixed height when the header scrolls in a
          // parent ScrollView (ListHeaderComponent is horizontal-only).
          const unpinnedPagerHeight = Math.max(420, height - 160)

          const matchKeyExtractor = (item: ItemType, index: number) => {
            if (typeof item.ad_spot !== 'undefined' && item.ad_spot) {
              return String(item.key ?? `ad_${index}`)
            }
            const matchId = (item as any).match_id
            return `${matchId ?? ''}_${item.home_team_id}_${item.away_team_id}_${item.date}_${index}`
          }

          const matchListEmpty = (
            <View className="items-center px-6 py-10">
              <Text
                className="text-center text-base opacity-70"
                style={{maxWidth: 280}}>
                {t('no_matches_pass_filter')}
              </Text>
            </View>
          )

          let matchesBody: React.ReactNode
          if (matchesView === 'calendar') {
            matchesBody = (
              <MatchesCalendar
                fixtures={fixtures}
                onOpenMatch={HandlePress}
                refreshing={refreshing}
                onRefresh={() => RefreshMatches('pull')}
                contentContainerStyle={listContentStyle}
                listHeader={headerSticky ? null : matchesHeader}
              />
            )
          } else if (DEBUG_HIDE_MATCH_FLATLIST) {
            matchesBody = (
              <View className="flex-1 items-center justify-center px-4">
                <Text style={{textAlign: 'center', opacity: 0.6}}>
                  Match list hidden (DEBUG_HIDE_MATCH_FLATLIST) — testing live
                  scores scroll
                </Text>
              </View>
            )
          } else if (!headerSticky && isHorizontalPager) {
            matchesBody = (
              <ScrollView
                style={{flex: 1, backgroundColor: screenBg}}
                contentContainerStyle={{flexGrow: 1}}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => RefreshMatches('pull')}
                  />
                }>
                {matchesHeader}
                <View style={{height: unpinnedPagerHeight}}>
                  <FlatList
                    key={`matches-pager-unpinned-${state.isNewMatchCard ? 'new' : 'old'}`}
                    data={listFixtures}
                    renderItem={renderItem}
                    keyExtractor={matchKeyExtractor}
                    horizontal
                    pagingEnabled
                    snapToInterval={width}
                    decelerationRate="fast"
                    snapToAlignment="center"
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    directionalLockEnabled
                    removeClippedSubviews={false}
                    windowSize={11}
                    maxToRenderPerBatch={8}
                    initialNumToRender={6}
                    style={{flex: 1, backgroundColor: screenBg}}
                    ListEmptyComponent={matchListEmpty}
                  />
                </View>
              </ScrollView>
            )
          } else {
            matchesBody = (
              <FlatList
                key={`matches-cols-${matchGridColumns}-${state.isNewMatchCard ? 'new' : 'old'}-${headerSticky ? 'pin' : 'scroll'}`}
                ListHeaderComponent={
                  headerSticky ? undefined : matchesHeader
                }
                contentContainerStyle={[
                  listContentStyle,
                  useMatchGrid ? {paddingHorizontal: 10, paddingTop: 8} : null,
                  listFixtures.length === 0
                    ? {
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 24,
                      }
                    : null,
                ]}
                style={{flex: 1, backgroundColor: screenBg}}
                numColumns={matchGridColumns}
                columnWrapperStyle={
                  useMatchGrid ? {alignItems: 'stretch'} : undefined
                }
                horizontal={isHorizontalPager}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                // Paging/snap only for the horizontal new-card pager.
                // On the vertical list these fight variable card heights and
                // cause jump/readjust when scrolling up.
                pagingEnabled={isHorizontalPager}
                snapToInterval={isHorizontalPager ? width : undefined}
                decelerationRate={isHorizontalPager ? 'fast' : 'normal'}
                snapToAlignment={isHorizontalPager ? 'center' : undefined}
                scrollEnabled={true}
                directionalLockEnabled={true}
                alwaysBounceVertical={false}
                removeClippedSubviews={false}
                windowSize={11}
                maxToRenderPerBatch={useMatchGrid ? 12 : 8}
                initialNumToRender={useMatchGrid ? 8 : 6}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => RefreshMatches('pull')}
                  />
                }
                bounces={true}
                keyExtractor={matchKeyExtractor}
                data={listFixtures}
                renderItem={renderItem}
                ListEmptyComponent={matchListEmpty}
              />
            )
          }

          return (
            <View className="flex-1">
              {headerSticky ? matchesHeader : null}
              <View
                style={{flex: 1, overflow: 'hidden', marginHorizontal: 0}}>
                {matchesBody}
              </View>
            </View>
          )
        })()}
      </View>
    )

    return homeList
  } else {
    return null
  }
}
