import CompletedMatchDetails from '@/components/Completed/CompletedMatchDetails'
import {
  Finalizer,
  Frame,
  More,
  ScoresheetHeader,
  ScoresheetStatsViewSelector,
} from '@/components/Match/components'
import {ScoresheetLayout} from '@/components/Match/components/ScoresheetLayout'
import {findActiveFrameIndex} from '@/components/Match/components/frameCollapse'
import {useScoresheetTheme} from '@/components/Match/components/scoresheetTheme'
import { FrameType } from '@/components/Match/types'
import { useLeagueContext } from '@/context/LeagueContext'
import { useMatchContext } from '@/context/MatchContext'
import {ScoresheetPadProvider} from '@/context/ScoresheetPadContext'
import {useTabBarVisibility} from '@/context/TabBarVisibilityContext'
import {X01ScoreProvider} from '@/context/X01ScoreContext'
import X01ScoreScreen from '@/components/Match/components/X01ScoreScreen'
import { useIsRegularLayout } from '@/hooks/useLayoutMode'
import { useMatch } from '@/hooks/useMatch'
import { useTabListContentContainerStyle } from '@/hooks/useTabListContentContainerStyle'
import {resolveMatchInfoFromParams} from '@/lib/matchRouteParams'
import {
  anyPlayerStatFlags,
  buildFrameTypeMetaByType,
  buildGameTypeFlagsByCode,
  buildNoPlayersByType,
  resolveFormatSubsections,
  resolveNoPlayers,
  resolveScoreSheetStatFlags,
  resolveScoresheetControlFlags,
} from '@/lib/matchFormat'
import {hydrateFrameLegs} from '@/lib/hydrateFrameLegs'
import {restoreThrowTallies} from '@/lib/scoresheetThrow'
import {
  defaultScoresheetStatsView,
  loadScoresheetStatsView,
  saveScoresheetStatsView,
  type ScoresheetStatsView,
} from '@/lib/scoresheetStatsView'
import {useNavigation} from "expo-router/react-navigation"
import {useLocalSearchParams, useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {AppState, FlatList, Pressable, Text, View} from 'react-native'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'

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
  const router = useRouter()
  const {t} = useTranslation()
  const {state, dispatch, SocketConnect, SocketDisconnect, UpdateTeams}: any =
    useMatchContext()
  const {RefreshUpcoming}: any = useLeagueContext()
  const match = useMatch()
  const routeParams = useLocalSearchParams()
  const [isMounted, setIsMounted] = React.useState(false)
  const [headerSticky, setHeaderSticky] = React.useState(false)
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
  const listRef = React.useRef<FlatList<FrameType>>(null)
  const didScrollToActiveRef = React.useRef(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [scoringFrame, setScoringFrame] = React.useState<number | null>(null)
  const sawScoringFrame = React.useRef(false)
  const [scoringMatchId, setScoringMatchId] = React.useState(resolvedMatchId)
  const {setHidden: setTabBarHidden} = useTabBarVisibility()
  if (scoringMatchId !== resolvedMatchId) {
    setScoringMatchId(resolvedMatchId)
    setScoringFrame(null)
  }
  React.useEffect(() => {
    if (embedded) {
      setTabBarHidden(false)
      return
    }
    setTabBarHidden(scoringFrame != null)
    return () => setTabBarHidden(false)
  }, [embedded, scoringFrame, setTabBarHidden])

  React.useEffect(() => {
    if (scoringFrame != null) {
      sawScoringFrame.current = true
      return
    }
    if (!sawScoringFrame.current) return
    const matchId = Number(matchInfo?.match_id)
    const current = state.frameData
    if (!matchId || !Array.isArray(current) || current.length === 0) return
    let cancelled = false
    ;(async () => {
      const restored = await restoreThrowTallies(current, matchId)
      if (cancelled || restored === current) return
      dispatch({type: 'SET_FRAMES', payload: restored})
    })()
    return () => {
      cancelled = true
    }
  }, [scoringFrame])
  // Side pad only on a full-screen regular layout — not inside home’s detail pane.
  const useSidePad = isRegular && !embedded

  // Allow one auto-scroll per match open.
  React.useEffect(() => {
    didScrollToActiveRef.current = false
  }, [resolvedMatchId])

  const activeFrameIndex = React.useMemo(
    () => findActiveFrameIndex(state.frameData),
    [state.frameData],
  )

  // On mount (once frames are ready), jump to the first unfinished game.
  React.useEffect(() => {
    if (didScrollToActiveRef.current) return
    if (activeFrameIndex < 0) return
    if (!Array.isArray(state.frameData) || state.frameData.length === 0) return
    didScrollToActiveRef.current = true
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: activeFrameIndex,
        animated: true,
        viewPosition: 0.1,
      })
    }, 80)
    return () => clearTimeout(timer)
  }, [state.frameData, activeFrameIndex, resolvedMatchId])

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

  const didCustomizeHeader = React.useRef(false)

  React.useEffect(() => {
    if (embedded) return
    if (resolvedMatchId) {
      const scoring =
        scoringFrame != null ? state.frameData?.[scoringFrame] : null
      const scoringTitle = scoring?.label || scoring?.type
      const options: {
        title: string
        gestureEnabled: boolean
        headerLeft?: () => React.ReactNode
      } = {
        title: scoringTitle ? String(scoringTitle) : '#' + resolvedMatchId,
        gestureEnabled: scoringFrame == null,
      }
      if (scoringFrame != null) {
        didCustomizeHeader.current = true
        options.headerLeft = () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('x01_scoresheet')}
            onPress={() => setScoringFrame(null)}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingRight: 8,
            }}>
            <MCI name="chevron-left" size={26} color={theme.text} />
            <Text style={{color: theme.text, fontSize: 17, fontWeight: '600'}}>
              {t('x01_scoresheet')}
            </Text>
          </Pressable>
        )
      } else if (didCustomizeHeader.current) {
        didCustomizeHeader.current = false
        options.headerLeft = undefined
      }
      navigation.setOptions(options)
    } else if (!state?.matchInfo?.match_id) {
      router.back()
    }
  }, [
    resolvedMatchId,
    embedded,
    navigation,
    router,
    state?.matchInfo?.match_id,
    scoringFrame,
    state.frameData,
    t,
    theme.text,
  ])

  // Keep the scoresheet template ref aligned with live firstDart (and other
  // frame fields) so AppState → GetFrames merges don't wipe optimistic UI.
  React.useEffect(() => {
    if (!Array.isArray(state.frameData) || state.frameData.length === 0) return
    state.frameData.forEach((f: FrameType, i: number) => {
      if (!frames.current[i]) return
      const liveDart = Number(f.firstDart ?? 0)
      const refDart = Number(frames.current[i].firstDart ?? 0)
      if (liveDart !== refDart) {
        frames.current[i] = {...frames.current[i], firstDart: liveDart}
      }
    })
  }, [state.frameData])

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
      const [frameTypes, gameTypes] = await Promise.all([
        match.GetFrameTypes(),
        match.GetGameTypes(),
      ])
      if (cancelled) return

      const noPlayersByType = buildNoPlayersByType(frameTypes)
      const metaByType = buildFrameTypeMetaByType(frameTypes)
      const gameTypeFlagsByCode = buildGameTypeFlagsByCode(gameTypes)
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
        const controls = resolveScoresheetControlFlags(
          section,
          typeMeta,
          gameTypeFlagsByCode[section.type],
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
            valuePerLeg: section.valuePerLeg ?? 1,
            games,
            seriesMode,
            trackTons: flags.trackTons,
            trackHeavyTons: flags.trackHeavyTons,
            trackCloses: flags.trackCloses,
            trackBoardScore: flags.trackBoardScore,
            trackStats: anyPlayerStatFlags(flags),
            showClose: controls.showClose,
            showScore: controls.showScore,
            showWin: controls.showWin,
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
              valuePerLeg: frame.valuePerLeg ?? template?.valuePerLeg,
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
              // Template (from game type / format) is source of truth for UI controls.
              showClose: template?.showClose ?? frame.showClose,
              showScore: template?.showScore ?? frame.showScore,
              showWin: template?.showWin ?? frame.showWin,
              // Keep a locally set first dart if Redis omitted/zeroed it.
              firstDart: (() => {
                const fromServer = Number(frame.firstDart ?? 0)
                if (fromServer > 0) return fromServer
                const fromTemplate = Number(template?.firstDart ?? 0)
                return fromTemplate > 0 ? fromTemplate : 0
              })(),
            })
          }
        })
      }
      const matchId = Number(matchInfo.match_id)
      const restored = await restoreThrowTallies(__frames, matchId)
      if (restored !== __frames) {
        restored.forEach((frame, index) => {
          __frames[index] = frame
        })
      }
      frames.current = __frames
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
        ref={listRef}
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
        onScrollToIndexFailed={({index}) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.1,
            })
          }, 120)
        }}
        renderItem={({item, index}) => (
          <Frame
            item={item}
            index={index}
            refreshing={refreshing}
            statsView={statsView}
            preferExpanded={index === activeFrameIndex}
          />
        )}
      />
    </View>
  )

  return (
    <X01ScoreProvider onOpen={setScoringFrame}>
      {scoringFrame != null ? (
        <X01ScoreScreen
          frameIndex={scoringFrame}
          embedded={embedded}
          onClose={() => setScoringFrame(null)}
        />
      ) : (
        <ScoresheetPadProvider useSidePad={useSidePad}>
          <ScoresheetLayout framesList={framesList} />
        </ScoresheetPadProvider>
      )}
    </X01ScoreProvider>
  )
}
