import CompletedMatchDetails from '@/components/Completed/CompletedMatchDetails'
import {
  Finalizer,
  Frame,
  More,
  ScoresheetHeader,
  ScoresheetStatsViewSelector,
} from '@/components/Match/components'
import {ScoresheetLayout} from '@/components/Match/components/ScoresheetLayout'
import {useScoresheetTheme} from '@/components/Match/components/scoresheetTheme'
import { FrameType } from '@/components/Match/types'
import { useLeagueContext } from '@/context/LeagueContext'
import { useMatchContext } from '@/context/MatchContext'
import {ScoresheetPadProvider} from '@/context/ScoresheetPadContext'
import { useIsRegularLayout } from '@/hooks/useLayoutMode'
import { useMatch } from '@/hooks/useMatch'
import { useTabListContentContainerStyle } from '@/hooks/useTabListContentContainerStyle'
import {resolveMatchInfoFromParams} from '@/lib/matchRouteParams'
import {
  anyPlayerStatFlags,
  buildFrameTypeMetaByType,
  buildNoPlayersByType,
  resolveFormatSubsections,
  resolveNoPlayers,
  resolveScoreSheetStatFlags,
} from '@/lib/matchFormat'
import {hydrateFrameLegs} from '@/lib/hydrateFrameLegs'
import {
  defaultScoresheetStatsView,
  loadScoresheetStatsView,
  saveScoresheetStatsView,
  type ScoresheetStatsView,
} from '@/lib/scoresheetStatsView'
import { useNavigation } from "expo-router/react-navigation"
import { router, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { AppState, FlatList, View } from 'react-native'

export type ScoreSheetProps = {
  /** When set, show this match in a parent AdaptiveSplit instead of reading the route. */
  embedMatchInfo?: Record<string, unknown>
  /** Embedded in home split: full-width sheet + modal pad (no nested Duo split). */
  embedded?: boolean
}

export default function ScoreSheet({
  embedMatchInfo,
  embedded = false,
}: ScoreSheetProps = {}) {
  const {state, dispatch, SocketConnect, SocketDisconnect, UpdateTeams}: any =
    useMatchContext()
  const {RefreshUpcoming}: any = useLeagueContext()
  const match = useMatch()
  const routeParams = useLocalSearchParams()
  const [isMounted, setIsMounted] = React.useState(false)
  const [headerSticky, setHeaderSticky] = React.useState(true)
  const navigation = useNavigation()
  const theme = useScoresheetTheme()
  const isRegular = useIsRegularLayout()
  const [statsView, setStatsView] = React.useState<ScoresheetStatsView>(() =>
    defaultScoresheetStatsView(isRegular),
  )
  const listContentStyle = useTabListContentContainerStyle({paddingBottom: 16})
  // Route params can be cleared (e.g. dismissTo('/Match') after picking a
  // player) while MatchContext still holds the active scoresheet.
  const routeMatchInfo = React.useMemo(
    () =>
      resolveMatchInfoFromParams(
        routeParams as Record<string, unknown>,
        embedMatchInfo,
      ),
    [routeParams, embedMatchInfo],
  )
  const matchInfo =
    routeMatchInfo?.match_id != null
      ? routeMatchInfo
      : state?.matchInfo?.match_id != null
        ? state.matchInfo
        : routeMatchInfo
  const resolvedMatchId = (() => {
    const id = Number(matchInfo?.match_id)
    return Number.isFinite(id) && id > 0 ? id : null
  })()
  const frames = React.useRef<FrameType[]>([])
  const appState = React.useRef(AppState.currentState)
  const [refreshing, setRefreshing] = React.useState(false)
  // Side pad only on a full-screen regular layout — not inside home’s detail pane.
  const useSidePad = isRegular && !embedded

  // Compact (closed Duo / bar-phone portrait) → Ledger; regular → Classic.
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const view = await loadScoresheetStatsView(isRegular)
      if (!cancelled) setStatsView(view)
    })()
    return () => {
      cancelled = true
    }
  }, [isRegular])

  const showStatsViewSelector = React.useMemo(() => {
    const list = state.frameData ?? frames.current ?? []
    return list.some((f: FrameType) => {
      if (f?.frameNumber === -1 || f?.type === 'section') return false
      return anyPlayerStatFlags(resolveScoreSheetStatFlags(f))
    })
  }, [state.frameData])

  function handleStatsViewChange(view: ScoresheetStatsView) {
    setStatsView(view)
    saveScoresheetStatsView(view, isRegular)
  }

  React.useEffect(() => {
    if (embedded) return
    if (resolvedMatchId) {
      navigation.setOptions({title: '#' + resolvedMatchId})
    } else if (!state?.matchInfo?.match_id) {
      router.back()
    }
  }, [resolvedMatchId, embedded, navigation, state?.matchInfo?.match_id])

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
        const sectionHasFlags =
          section.trackTons != null ||
          section.trackHeavyTons != null ||
          section.trackCloses != null ||
          section.trackBoardScore != null ||
          section.trackStats != null
        const flags = resolveScoreSheetStatFlags(
          sectionHasFlags
            ? section
            : {
                trackTons: typeMeta?.trackTons,
                trackHeavyTons: typeMeta?.trackHeavyTons,
                trackCloses: typeMeta?.trackCloses,
                trackBoardScore: typeMeta?.trackBoardScore,
                trackStats: typeMeta?.trackStats ?? true,
              },
        )
        for (let i = 0; i < section.frames; i++) {
          const _frame: FrameType = hydrateFrameLegs({
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
            trackTons: flags.trackTons,
            trackHeavyTons: flags.trackHeavyTons,
            trackCloses: flags.trackCloses,
            trackBoardScore: flags.trackBoardScore,
            trackStats: anyPlayerStatFlags(flags),
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
            legs: [],
            homeBoardScore: 0,
            awayBoardScore: 0,
            firstDart: 0,
          })
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
        _frames.forEach((frame: FrameType & {frameIdx?: number}) => {
          const idx =
            typeof frame.frameIndex === 'number'
              ? frame.frameIndex
              : typeof frame.frameIdx === 'number'
                ? frame.frameIdx
                : -1
          if (idx >= 0 && idx < __frames.length) {
            const template = __frames[idx]
            __frames[idx] = hydrateFrameLegs({
              ...template,
              ...frame,
              type: frame.type ?? template?.type,
              label: frame.label ?? template?.label,
              mfpp: frame.mfpp ?? template?.mfpp,
              noPlayers: frame.noPlayers ?? template?.noPlayers,
              minPlayers: frame.minPlayers ?? template?.minPlayers,
              maxPlayers: frame.maxPlayers ?? template?.maxPlayers,
              // Format template is source of truth for series length/mode.
              // Live redis often defaults games=1 on first player assign.
              games: template?.games ?? frame.games,
              seriesMode: template?.seriesMode ?? frame.seriesMode,
              trackTons: frame.trackTons ?? template?.trackTons,
              trackHeavyTons: frame.trackHeavyTons ?? template?.trackHeavyTons,
              trackCloses: frame.trackCloses ?? template?.trackCloses,
              trackBoardScore:
                frame.trackBoardScore ?? template?.trackBoardScore,
              trackStats: frame.trackStats ?? template?.trackStats,
              firstDart: Number(frame.firstDart ?? template?.firstDart ?? 0),
            })
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
    // Name kept for call sites; loads finalize flags only (no match-level first break on darts).
    try {
      const res = await match.GetMatchInfo(matchInfo.match_id)
      if (typeof res.status !== 'undefined' && res.status === 'ok') {
        dispatch({type: 'SET_FIRSTBREAK', payload: null})
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
    return <CompletedMatchDetails matchId={resolvedMatchId} />
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

  const framesList = (
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
            <More matchId={resolvedMatchId ?? matchInfo.match_id} />
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

  return (
    <ScoresheetPadProvider useSidePad={useSidePad}>
      <ScoresheetLayout framesList={framesList} />
    </ScoresheetPadProvider>
  )
}
