import AppSwitch from '@/components/AppSwitch'
import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import AdSpot from '@/components/upcoming/AdSpot'
import LiveScores from '@/components/upcoming/LiveScores'
import MatchCard from '@/components/upcoming/MatchCard'
import MatchCardOld from '@/components/upcoming/MatchCardOld'
import {MiniLeagueHome} from '@/components/mini-leagues/MiniLeagueHome'
import {useLeagueContext} from '@/context/LeagueContext'
import {isMiniCompetition} from '@/types/competition'
import {useAccount, useAd, useLeague, useSeason} from '@/hooks'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import {MaterialIcons} from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useTheme} from "expo-router/react-navigation"
import {usePathname, useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  useColorScheme,
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
  const filterHeight = React.useRef(new Animated.Value(0)).current
  const fetchIdRef = React.useRef(0)
  const hasLoadedOnce = React.useRef(false)
  const season = useSeason()
  const league = useLeague()
  const account = useAccount()
  const adHook = useAd()
  const {t} = useTranslation()
  const [needsUpdate, setNeedsUpdate] = React.useState(false)
  const router = useRouter()
  const {width} = Dimensions.get('window')
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

  async function CheckVersion() {
    setNeedsUpdate(await account.CheckVersion())
  }

  function HandlePress(idx: number) {
    router.push({pathname: '/Match', params: fixtures[idx]})
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
      // Build a new list — never splice while iterating (frequency=1 infinite-looped).
      const withAds: any[] = []
      for (let i = 0; i < _fixtures.length; i++) {
        if ((i !== 0 && i % frequency === 0) || i === 1) {
          withAds.push({
            index: withAds.length,
            key: 'ad_spot_' + withAds.length,
            ad_spot: true,
          })
        }
        withAds.push(_fixtures[i])
      }
      withAds.push({
        index: withAds.length,
        key: 'ad_spot_' + withAds.length,
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

  React.useEffect(() => {
    if (DEBUG_MINIMAL_MATCHES_SCREEN) {
      return
    }
    CheckVersion()
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
  async function HandleUpdate() {
    try {
      const url =
        Platform.OS === 'ios'
          ? 'https://apps.apple.com/app/bangkok-darts-league'
          : 'https://play.google.com/store/apps/details?id=com.bangkok_darts_league'
      const supported = await Linking.canOpenURL(url)
      if (supported) {
        await Linking.openURL(url)
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

  const renderItem = React.useCallback(
    ({item, index}: {item: any; index: number}) => {
      if (typeof item.ad_spot !== 'undefined' && item.ad_spot) {
        return <AdSpot item={item} />
      } else if (state.isNewMatchCard) {
        return (
          <MatchCard
            matchInfo={item}
            idx={index}
            handlePress={HandlePress}
            showMineOnly={showMineOnly}
          />
        )
      } else {
        return (
          <MatchCardOld
            matchInfo={item}
            idx={index}
            handlePress={HandlePress}
          />
        )
      }
    },
    [showMineOnly, state.isNewMatchCard],
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
        <LiveScores />
        <View className="flex-1 items-center justify-center px-6">
          <Text style={{textAlign: 'center', opacity: 0.5}}>
            DEBUG_MINIMAL_MATCHES_SCREEN — only ticker visible
          </Text>
        </View>
      </View>
    )
  }

  if (isMounted) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: screenBg,
        }}>
        {initialLoading && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        {!initialLoading && (
          <View className="flex-1">
            <View>
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
              {(typeof state.showLiveScores === 'undefined' ||
                state.showLiveScores) && <LiveScores />}
              {(typeof user?.teams === 'undefined' || user.teams.length < 1) &&
                user.id && (
                  <View className="my-2 mx-2">
                    <Text style={{textAlign: 'center'}}>
                      You are not affiliated with a team.
                    </Text>
                  </View>
                )}
              <View className="mx-4 mb-2">
                <Pressable
                  accessibilityRole="button"
                  onPress={toggleFilters}
                  className="flex-row items-center justify-center py-3 px-5 rounded-lg w-full"
                  style={({pressed}) => {
                    const isDark = colorScheme === 'dark'
                    return {
                      backgroundColor: isDark
                        ? pressed
                          ? '#2A002E'
                          : '#37003C'
                        : pressed
                          ? '#E8D4EA'
                          : '#FFFFFF',
                      borderWidth: isDark ? 0 : 2,
                      borderColor: '#37003C',
                      shadowColor: '#000',
                      shadowOffset: {width: 0, height: 2},
                      shadowOpacity: isDark ? 0.35 : 0.12,
                      shadowRadius: 4,
                      elevation: 4,
                      transform: [{scale: pressed ? 0.98 : 1}],
                    }
                  }}>
                  <MaterialIcons
                    name="filter-list"
                    size={22}
                    style={{marginRight: 8}}
                    color={colorScheme === 'dark' ? '#FFFFFF' : '#37003C'}
                  />
                  <Text
                    className="font-semibold text-base"
                    style={{
                      color: colorScheme === 'dark' ? '#FFFFFF' : '#37003C',
                    }}>
                    {showFilters ? t('hide_filters') : t('show_filters')}
                  </Text>
                  <MaterialIcons
                    name={showFilters ? 'expand-less' : 'expand-more'}
                    size={22}
                    style={{marginLeft: 6}}
                    color={colorScheme === 'dark' ? '#FFFFFF' : '#37003C'}
                  />
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
            <View
              style={{height: '100%', overflow: 'hidden', marginHorizontal: 0}}>
              {DEBUG_HIDE_MATCH_FLATLIST ? (
                <View className="flex-1 items-center justify-center px-4">
                  <Text style={{textAlign: 'center', opacity: 0.6}}>
                    Match list hidden (DEBUG_HIDE_MATCH_FLATLIST) — testing live
                    scores scroll
                  </Text>
                </View>
              ) : (
                <FlatList
                  contentContainerStyle={[
                    listContentStyle,
                    fixtures.length === 0
                      ? {
                          justifyContent: 'center',
                          alignItems: 'center',
                          paddingHorizontal: 24,
                        }
                      : null,
                  ]}
                  style={{flex: 1, backgroundColor: screenBg}}
                  horizontal={
                    fixtures.length > 0 && state.isNewMatchCard ? true : false
                  }
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  pagingEnabled={true}
                  snapToInterval={width}
                  decelerationRate="fast"
                  snapToAlignment="center"
                  scrollEnabled={true}
                  directionalLockEnabled={true}
                  alwaysBounceVertical={false}
                  onScrollBeginDrag={closeFilters}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={() => RefreshMatches('pull')}
                    />
                  }
                  bounces={true}
                  keyExtractor={(item: ItemType, index) => {
                    if (typeof item.ad_spot !== 'undefined' && item.ad_spot) {
                      return item.key
                    } else {
                      return (
                        item.home_team_id +
                        item.away_team_id +
                        item.date +
                        index
                      )
                    }
                  }}
                  data={fixtures}
                  renderItem={renderItem}
                  ListEmptyComponent={
                    <View className="items-center px-6 py-10">
                      <Text
                        className="text-center text-base opacity-70"
                        style={{maxWidth: 280}}>
                        {t('no_matches_pass_filter')}
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        )}
        {needsUpdate && (
          <View className="px-2">
            <Button
              style={{backgroundColor: 'red'}}
              onPress={() => HandleUpdate()}>
              <Text className="text-center">{t('update_available')}</Text>
            </Button>
          </View>
        )}
      </View>
    )
  } else {
    return null
  }
}
