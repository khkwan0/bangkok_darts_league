import AppSwitch from '@/components/AppSwitch'
import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import AdSpot, {clearAdSpotCache} from '@/components/upcoming/AdSpot'
import WeeklyHighlightsCard from '@/components/upcoming/WeeklyHighlightsCard'
import MatchCard from '@/components/upcoming/MatchCard'
import MatchCardOld from '@/components/upcoming/MatchCardOld'
import MatchesCalendar from '@/components/upcoming/MatchesCalendar'
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
import {useIsRegularLayout} from '@/hooks/useLayoutMode'
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
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  useColorScheme,
  useWindowDimensions,
} from 'react-native'

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
  const [showFilters, setShowFilters] = React.useState(false)
  const [headerSticky, setHeaderSticky] = React.useState(false)
  const [matchesView, setMatchesView] = React.useState<HomeMatchesView | null>(
    null,
  )
  const filterHeight = React.useRef(new Animated.Value(0)).current
  const fetchIdRef = React.useRef(0)
  const adRefreshGenRef = React.useRef(0)
  const hasLoadedOnce = React.useRef(false)
  const season = useSeason()
  const league = useLeague()
  const account = useAccount()
  const adHook = useAd()
  const {t} = useTranslation()
  const router = useRouter()
  const isRegular = useIsRegularLayout()
  const {width, height} = useWindowDimensions()
  const isLandscapeRegular = isRegular && width > height
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

  // Duo / iPad list: fill width with a card grid; tap still pushes /Match.
  const matchGridColumns = React.useMemo(() => {
    if (!isRegular || matchesView === 'calendar') {
      return 1
    }
    if (width >= 1100) return 3
    return 2
  }, [isRegular, matchesView, width])
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
          />
        )
        if (!useMatchGrid) return card
        return (
          <View style={{flex: 1, paddingHorizontal: 6, paddingBottom: 12}}>
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
    [showMineOnly, state.isNewMatchCard, useMatchGrid],
  )

  const toggleFilters = () => {
    Animated.timing(filterHeight, {
      toValue: showFilters ? 0 : 1,
      duration: 500,
      useNativeDriver: false,
    }).start()
    setShowFilters(s => !s)
  }

  const closeFilters = () => {
    if (showFilters) {
      Animated.timing(filterHeight, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }).start()
      setShowFilters(false)
    }
  }

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
                  {(['list', 'calendar'] as const).map(mode => {
                    const active = matchesView === mode
                    const labelColor = active
                      ? '#FFFFFF'
                      : colorScheme === 'dark'
                        ? '#FFFFFF'
                        : '#37003C'
                    const listLabel = isLandscapeRegular
                      ? t('grid_view')
                      : t('list_view')
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
                          name={
                            mode === 'list'
                              ? isLandscapeRegular
                                ? 'grid-view'
                                : 'view-list'
                              : 'calendar-today'
                          }
                          size={18}
                          color={labelColor}
                          style={{marginRight: 6}}
                        />
                        <Text
                          className="font-semibold"
                          style={{color: labelColor}}>
                          {mode === 'list' ? listLabel : t('calendar')}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{expanded: showFilters}}
                  accessibilityLabel={
                    showFilters ? t('hide_filters') : t('show_filters')
                  }
                  onPress={toggleFilters}
                  className="mr-2 flex-row items-center justify-center rounded-lg px-3"
                  style={({pressed}) => {
                    const isDark = colorScheme === 'dark'
                    const active = showFilters
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
                  <MaterialIcons
                    name="filter-list"
                    size={20}
                    color={
                      showFilters || colorScheme === 'dark'
                        ? '#FFFFFF'
                        : '#37003C'
                    }
                  />
                  <MaterialIcons
                    name={showFilters ? 'expand-less' : 'expand-more'}
                    size={18}
                    style={{marginLeft: 2}}
                    color={
                      showFilters || colorScheme === 'dark'
                        ? '#FFFFFF'
                        : '#37003C'
                    }
                  />
                </Pressable>
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
              <Animated.View
                style={{
                  maxHeight: filterHeight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 200],
                  }),
                  opacity: filterHeight,
                  overflow: 'hidden',
                  backgroundColor:
                    colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
                  borderRadius: 8,
                  marginHorizontal: 12,
                  marginBottom: 4,
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: filterHeight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.15],
                  }),
                  shadowRadius: 4,
                  elevation: filterHeight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 4],
                  }),
                  borderWidth: filterHeight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                  borderColor: colorScheme === 'dark' ? '#37003C' : '#E0E0E0',
                }}>
                {typeof user?.teams !== 'undefined' &&
                  user.teams.length > 0 && (
                    <View className="flex-row items-center justify-between border-b border-gray-200 px-3 py-2.5 dark:border-gray-700">
                      <Text className="mr-3 flex-1 text-base">
                        {t('show_mine_only')}
                      </Text>
                      <AppSwitch
                        disabled={refreshing}
                        value={showMineOnly}
                        onValueChange={setShowMineOnly}
                      />
                    </View>
                  )}
                <View className="flex-row items-center justify-between px-3 py-2.5">
                  <Text className="mr-3 flex-1 text-base">
                    {t('show_postponed')}
                  </Text>
                  <AppSwitch
                    disabled={refreshing}
                    value={showPostponed}
                    onValueChange={setShowPostponed}
                  />
                </View>
              </Animated.View>
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
                onScrollBeginDrag={closeFilters}
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
                onScrollBeginDrag={closeFilters}
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
                onScrollBeginDrag={closeFilters}
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
