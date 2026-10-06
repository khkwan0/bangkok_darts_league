import CompletedMatchDetails from '@/components/Completed/CompletedMatchDetails'
import {
  Finalizer,
  Frame,
  More,
  ScoresheetHeader,
  ScoresheetStatsViewSelector,
} from '@/components/Match/components'
import {useScoresheetTheme} from '@/components/Match/components/scoresheetTheme'
import { FrameType } from '@/components/Match/types'
import { useLeagueContext } from '@/context/LeagueContext'
import { useMatchContext } from '@/context/MatchContext'
import { useMatch } from '@/hooks/useMatch'
import { useTabListContentContainerStyle } from '@/hooks/useTabListContentContainerStyle'
import {
  buildFrameTypeMetaByType,
  buildNoPlayersByType,
  resolveFormatSubsections,
  resolveNoPlayers,
} from '@/lib/matchFormat'
import {
  DEFAULT_SCORESHEET_STATS_VIEW,
  loadScoresheetStatsView,
  saveScoresheetStatsView,
  type ScoresheetStatsView,
} from '@/lib/scoresheetStatsView'
import { useNavigation } from "expo-router/react-navigation"
import { router, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { AppState, FlatList, View } from 'react-native'

export default function ScoreSheet() {
  const {state, dispatch, SocketConnect, SocketDisconnect, UpdateTeams}: any =
    useMatchContext()
  const {RefreshUpcoming}: any = useLeagueContext()
  const match = useMatch()
  const {params} = useLocalSearchParams()
  const [isMounted, setIsMounted] = React.useState(false)
  const [headerSticky, setHeaderSticky] = React.useState(true)
  const [statsView, setStatsView] = React.useState<ScoresheetStatsView>(
    DEFAULT_SCORESHEET_STATS_VIEW,
  )
  const navigation = useNavigation()
  const theme = useScoresheetTheme()
  const listContentStyle = useTabListContentContainerStyle({paddingBottom: 16})
  /*
  const matchInfo = React.useMemo(
    () =>
      typeof params !== 'undefined' ? JSON.parse(params as string) : {},
    [params],
  )
    */
  const matchInfo =
    typeof params !== 'undefined' ? JSON.parse(params as string) : {}
  const frames = React.useRef<FrameType[]>([])
  const appState = React.useRef(AppState.currentState)
  const [refreshing, setRefreshing] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const view = await loadScoresheetStatsView()
      if (!cancelled) setStatsView(view)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const showStatsViewSelector = React.useMemo(() => {
    const list = state.frameData ?? frames.current ?? []
    return list.some(
      (f: FrameType) =>
        f?.frameNumber !== -1 &&
        f?.type !== 'section' &&
        (f?.trackStats ?? true),
    )
  }, [state.frameData])

  function handleStatsViewChange(view: ScoresheetStatsView) {
    setStatsView(view)
    saveScoresheetStatsView(view)
  }

  React.useEffect(() => {
    if (typeof matchInfo.match_id !== 'undefined') {
      navigation.setOptions({title: '#' + matchInfo.match_id})
    } else {
      router.back()
    }
  }, [])

  React.useEffect(() => {
    // Listen for app state changes (background to foreground)
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Refresh match data when app comes back to foreground
        GetFrames()
        GetFirstBreak()
      }
      // Update app state reference
      appState.current = nextAppState
    })

    return () => {
      subscription.remove()
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false

    async function initScoresheet() {
      const frameTypes = await match.GetFrameTypes()
      if (cancelled) return

      const noPlayersByType = buildNoPlayersByType(frameTypes)
      const metaByType = buildFrameTypeMetaByType(frameTypes)
      const subsections = resolveFormatSubsections(matchInfo.format)
      let frameNumber = 1
      let sectionCount = 1
      const _frames: FrameType[] = []
      subsections.forEach((section, idx: number) => {
        const typeMeta = metaByType[section.type]
        const minPlayers = resolveNoPlayers(
          section.type,
          noPlayersByType,
          section.minPlayers ?? section.noPlayers,
        )
        const maxPlayers =
          section.maxPlayers ?? typeMeta?.maxPlayers ?? minPlayers
        const games = section.games ?? typeMeta?.games ?? 1
        const seriesMode =
          games > 1
            ? section.seriesMode ??
              typeMeta?.seriesMode ??
              'best_of'
            : undefined
        const trackStats =
          section.trackStats != null
            ? section.trackStats
            : (typeMeta?.trackStats ?? true)
        for (let i = 0; i < section.frames; i++) {
          const _frame: FrameType = {
            frameNumber: frameNumber,
            section: sectionCount,
            mfpp: section.mfpp,
            type: section.type,
            label: section.label || section.type,
            noPlayers: minPlayers,
            minPlayers,
            maxPlayers,
            games,
            seriesMode,
            trackStats,
            winner: 0,
            homePlayerIds: [],
            awayPlayerIds: [],
            homeScore: 0,
            awayScore: 0,
            homeTons: 0,
            awayTons: 0,
            homeHeavyTons: 0,
            awayHeavyTons: 0,
            homeCloses: 0,
            awayCloses: 0,
            homePlayerStats: [],
            awayPlayerStats: [],
            homeBoardScore: 0,
            awayBoardScore: 0,
          }
          _frames.push(_frame)
          frameNumber++
        }
        if (idx < subsections.length - 1) {
          const _frame: FrameType = {
            frameNumber: -1,
            section: sectionCount,
            mfpp: 0,
            type: 'section',
            noPlayers: 0,
            winner: 0,
            homePlayerIds: [],
            awayPlayerIds: [],
            homeScore: 0,
            awayScore: 0,
          }
          _frames.push(_frame)
        }
        sectionCount++
      })
      _frames.push({
        frameNumber: -1,
        section: sectionCount - 1,
        mfpp: 0,
        type: 'section',
        noPlayers: 0,
        winner: 0,
        homePlayerIds: [],
        awayPlayerIds: [],
        homeScore: 0,
        awayScore: 0,
      })
      frames.current = [..._frames]
      matchInfo.initialFrames = [...frames.current]
      dispatch({type: 'SET_MATCHINFO', payload: matchInfo})
      SocketConnect('match_' + matchInfo.match_id)
      await GetFirstBreak()
      await GetFrames()
    }

    initScoresheet()

    return () => {
      cancelled = true
      SocketDisconnect()
      dispatch({type: 'CLEAR_MATCHSTATE', payload: null})
    }
  }, [])

  async function GetFrames() {
    setRefreshing(true)
    const __frames = frames.current
    try {
      const res = await match.GetFrames(matchInfo.match_id)
      if (typeof res?.data?.frames !== 'undefined') {
        const _frames = res.data.frames
        _frames.forEach((frame: FrameType) => {
          if (typeof frame.frameIndex === 'number') {
            const template = __frames[frame.frameIndex]
            __frames[frame.frameIndex] = {
              ...template,
              ...frame,
              type: frame.type ?? template?.type,
              label: frame.label ?? template?.label,
              mfpp: frame.mfpp ?? template?.mfpp,
              noPlayers: frame.noPlayers ?? template?.noPlayers,
              minPlayers: frame.minPlayers ?? template?.minPlayers,
              maxPlayers: frame.maxPlayers ?? template?.maxPlayers,
              games: frame.games ?? template?.games,
              seriesMode: frame.seriesMode ?? template?.seriesMode,
              trackStats: frame.trackStats ?? template?.trackStats,
            }
          }
        })
      }
      dispatch({
        type: 'SET_FRAMES',
        payload: __frames,
      })

      setIsMounted(true)
    } catch (e) {
      console.error(e)
    } finally {
      setRefreshing(false)
    }
  }

  async function GetFirstBreak() {
    try {
      const res = await match.GetMatchInfo(matchInfo.match_id)
      if (typeof res.status !== 'undefined' && res.status === 'ok') {
        if (typeof res.data.firstBreak !== 'undefined' && res.data.firstBreak) {
          dispatch({type: 'SET_FIRSTBREAK', payload: res.data.firstBreak})
        } else {
          dispatch({type: 'SET_FIRSTBREAK', payload: null})
        }
        if (
          typeof res.data.finalize_home !== 'undefined' &&
          Object.keys(res.data.finalize_home).length > 0
        ) {
          dispatch({
            type: 'SET_FINALIZED_HOME',
            payload: true,
          })
        }
        if (
          typeof res.data.finalize_away !== 'undefined' &&
          Object.keys(res.data.finalize_away).length > 0
        ) {
          dispatch({
            type: 'SET_FINALIZED_AWAY',
            payload: true,
          })
        }
      }
    } catch (e) {
      console.log(e)
    }
  }
  /*
  React.useEffect(() => {
    ;(async () => {
      try {
        if (
          typeof state?.matchInfo?.home_team_id !== 'undefined' &&
          state?.matchInfo?.away_team_id !== 'undefined' &&
          state.matchInfo.home_team_id &&
          state.matchInfo.away_team_id
        ) {
          await UpdateTeams()
          setIsMounted(true)
        }
      } catch (e) {
        console.log(e)
      }
    })()
  }, [state.matchInfo])
  */

  // console.log(state.finalizedHome, state.finalizedAway)
  const matchCompleted = !!(state.finalizedHome && state.finalizedAway)

  React.useEffect(() => {
    if (matchCompleted) {
      RefreshUpcoming()
    }
  }, [matchCompleted])

  if (!isMounted) {
    return null
  }

  if (matchCompleted) {
    return <CompletedMatchDetails matchId={matchInfo.match_id} />
  }

  const header = (
    <View>
      <ScoresheetHeader
        sticky={headerSticky}
        onToggleSticky={() => setHeaderSticky(value => !value)}
      />
      {showStatsViewSelector ? (
        <ScoresheetStatsViewSelector
          value={statsView}
          onChange={handleStatsViewChange}
        />
      ) : null}
    </View>
  )

  return (
    <View style={{flex: 1, backgroundColor: theme.canvas}}>
      {headerSticky ? header : null}
      <FlatList
        style={{flex: 1}}
        contentContainerStyle={listContentStyle}
        refreshing={refreshing}
        onRefresh={() => GetFrames()}
        ListHeaderComponent={headerSticky ? null : header}
        ListFooterComponent={
          <>
            <Finalizer matchInfo={matchInfo} />
            <More matchId={matchInfo.match_id} />
          </>
        }
        data={state.frameData}
        renderItem={({item, index}) => (
          <Frame
            item={item}
            index={index}
            refreshing={refreshing}
            statsView={statsView}
          />
        )}
      />
    </View>
  )
}
