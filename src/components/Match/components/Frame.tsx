import {useMatchContext} from '@/context/MatchContext'
import {
  useOpenX01Score,
  useX01BoardSnapshot,
  useX01Score,
} from '@/context/X01ScoreContext'
import {
  loadX01Board,
  parseX01Start,
  peekX01Board,
  scoresheetScoringMode,
  scoreTotalsFromHistory,
  x01StorageKey,
} from '@/lib/x01Score'
import type {ScoresheetStatsView} from '@/lib/scoresheetStatsView'
import {CRICKET_TARGETS} from '@/lib/cricketScore'
import {
  anyPlayerStatFlags,
  resolveScoreSheetStatFlags,
  resolveValuePerLeg,
  resolvedRowWinnerId,
  seriesWinsNeeded,
} from '@/lib/matchFormat'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Alert, Pressable, Text, View} from 'react-native'
import {FrameProps} from '../types'
import FirstDart from './FirstDart'
import {
  closeValuesForSide,
  isFrameComplete,
  playerNicknames,
  resolveFrameGate,
} from './frameCollapse'
import LegLines from './LegLines'
import Player, {scoresheetChildHandledPress} from './Player'
import {useScoresheetTheme} from './scoresheetTheme'
import StatValueInput from './StatValueInput'
import WinButton from './WinButton'
import {GameScoreButton} from './GameScoreScreen'

function frameKindLabel(
  noPlayers: number | undefined,
  maxPlayers: number | undefined,
  t: (key: string) => string,
) {
  const min = Number(noPlayers ?? 1)
  const max = Number(maxPlayers ?? min)
  if (max > min) return t('team')
  if (min === 2) return t('doubles')
  if (min === 1) return t('singles')
  return ''
}

function ScoreMarks({
  marks,
  ink,
  muted,
  bullLabel,
}: {
  marks: Record<string, number> | null | undefined
  ink: string
  muted: string
  bullLabel: string
}) {
  return (
    <View style={{flexDirection: 'row', gap: 2, width: '100%'}}>
      {CRICKET_TARGETS.map(target => {
        const n = Math.min(3, Math.max(0, Math.trunc(Number(marks?.[target.id] ?? 0))))
        return (
          <View key={target.id} style={{flex: 1, alignItems: 'center', minWidth: 0}}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{color: muted, fontSize: 10, fontWeight: '800'}}>
              {target.id === '25' ? bullLabel : target.label}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: n >= 3 ? ink : muted,
                fontSize: 12,
                fontWeight: '800',
                opacity: n === 0 ? 0.5 : 1,
              }}>
              {n === 0 ? '·' : '/'.repeat(n)}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export default function Frame({
  item,
  index,
  refreshing,
  statsView = 'full',
  preferExpanded = false,
}: FrameProps) {
  const {
    state,
    UpdateFrameWin,
    ClearFrameWinner,
    UpdateFrameStats,
    SyncX01Board,
    canEditScoresheet,
  }: any = useMatchContext()
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const openScore = useOpenX01Score()
  const x01Score = useX01Score()
  const x01Board = useX01BoardSnapshot(index)
  const [focusHome, setFocusHome] = React.useState<number | null>(null)
  const [focusAway, setFocusAway] = React.useState<number | null>(null)
  const [manualStats, setManualStats] = React.useState(false)
  /** Manual expand for completed / upcoming (auto-collapses when the game is decided). */
  const [userExpanded, setUserExpanded] = React.useState(preferExpanded)
  const livePreview = state.frameData?.[index] ?? item
  // Series (first-to-N) can be decided by leg closes before winner team id arrives.
  const frameDecided = isFrameComplete(livePreview)
  const prevDecidedRef = React.useRef(frameDecided)
  React.useEffect(() => {
    if (!prevDecidedRef.current && frameDecided) {
      setUserExpanded(false)
    }
    prevDecidedRef.current = frameDecided
  }, [frameDecided])
  React.useEffect(() => {
    // Open when this row becomes the active game — never re-open a decided one.
    if (preferExpanded && !frameDecided) setUserExpanded(true)
  }, [preferExpanded, frameDecided])
  const initial = state.matchInfo.initialFrames[index]
  const frameType = initial?.type
  const frameLabel = item.label || initial?.label || frameType
  const minPlayers = item.minPlayers ?? item.noPlayers ?? initial?.minPlayers
  const maxPlayers = item.maxPlayers ?? initial?.maxPlayers ?? minPlayers
  const games = item.games ?? initial?.games ?? 1
  const seriesModeRaw = item.seriesMode ?? initial?.seriesMode
  const seriesMode =
    seriesModeRaw === 'race_to' || seriesModeRaw === 'best_of'
      ? seriesModeRaw
      : games > 1
        ? 'best_of'
        : undefined
  const configuredFlags = {
    trackTons: item.trackTons ?? initial?.trackTons,
    trackHeavyTons: item.trackHeavyTons ?? initial?.trackHeavyTons,
    trackCloses: item.trackCloses ?? initial?.trackCloses,
    trackBoardScore: item.trackBoardScore ?? initial?.trackBoardScore,
    trackStats: item.trackStats ?? initial?.trackStats,
  }
  const hasConfiguredFlags =
    configuredFlags.trackTons != null ||
    configuredFlags.trackHeavyTons != null ||
    configuredFlags.trackCloses != null ||
    configuredFlags.trackBoardScore != null ||
    configuredFlags.trackStats != null
  const statFlags = resolveScoreSheetStatFlags(
    hasConfiguredFlags ? configuredFlags : {trackStats: true},
  )
  const trackStats = anyPlayerStatFlags(statFlags)
  const {home_team_id: homeTeamId, away_team_id: awayTeamId} = state.matchInfo
  const locked = !!(state.finalizedHome && state.finalizedAway)
  const view: ScoresheetStatsView = statsView ?? 'full'

  function HandleWin(side: string, goldenBreak: boolean = false): void {
    const teamId = side === 'home' ? homeTeamId : awayTeamId
    UpdateFrameWin(side, index, teamId, goldenBreak)
  }

  function ClearWinner(): void {
    ClearFrameWinner(index)
  }

  if (item.frameNumber === -1) {
    let homeWins = 0
    let awayWins = 0
    let homeTons = 0
    let awayTons = 0
    let homeHeavy = 0
    let awayHeavy = 0
    let homeCloses = 0
    let awayCloses = 0
    let homeLegs = 0
    let awayLegs = 0
    let sectionShowTons = false
    let sectionShowHeavy = false
    let sectionShowCloses = false
    let sectionHasSeries = false
    const frames = state.frameData ?? []
    const initials = state.matchInfo?.initialFrames ?? []
    const sectionNo = Number(item.section)
    const rows: {f: (typeof frames)[number]; i: number}[] = []
    const tagged = frames.some(
      (f: {frameNumber?: number; section?: number; type?: string}, i: number) =>
        Number(f?.frameNumber) !== -1 &&
        f?.type !== 'section' &&
        Number(f?.section ?? initials[i]?.section) > 0,
    )
    if (tagged && sectionNo > 0) {
      frames.forEach(
        (f: {frameNumber?: number; section?: number; type?: string}, i: number) => {
          if (Number(f?.frameNumber) === -1 || f?.type === 'section') return
          const sec = Number(f?.section ?? initials[i]?.section)
          if (sec === sectionNo) rows.push({f, i})
        },
      )
    } else {
      let i = index - 1
      while (i >= 0 && Number(frames[i]?.frameNumber) !== -1) {
        rows.push({f: frames[i], i})
        i--
      }
    }
    const homeId = Number(homeTeamId)
    const awayId = Number(awayTeamId)
    for (const {f, i} of rows) {
      const init = initials[i]
      const valuePerLeg = resolveValuePerLeg(
        f.valuePerLeg != null ? f : init,
      )
      const winnerId = resolvedRowWinnerId(
        {
          ...init,
          ...f,
          games: f.games ?? init?.games,
          seriesMode: f.seriesMode ?? init?.seriesMode,
          minPlayers: f.minPlayers ?? init?.minPlayers,
          maxPlayers: f.maxPlayers ?? init?.maxPlayers,
          noPlayers: f.noPlayers ?? init?.noPlayers,
          type: f.type ?? init?.type,
        },
        homeId,
        awayId,
      )
      if (winnerId === homeId && homeId > 0) homeWins += valuePerLeg
      if (winnerId === awayId && awayId > 0) awayWins += valuePerLeg
      homeTons += Number(f.homeTons ?? 0)
      awayTons += Number(f.awayTons ?? 0)
      homeHeavy += Number(f.homeHeavyTons ?? 0)
      awayHeavy += Number(f.awayHeavyTons ?? 0)
      homeCloses += Number(f.homeCloses ?? 0)
      awayCloses += Number(f.awayCloses ?? 0)
      homeLegs += Number(f.homeScore ?? 0) * valuePerLeg
      awayLegs += Number(f.awayScore ?? 0) * valuePerLeg
      const fFlags = resolveScoreSheetStatFlags({
        trackTons: f.trackTons ?? init?.trackTons,
        trackHeavyTons: f.trackHeavyTons ?? init?.trackHeavyTons,
        trackCloses: f.trackCloses ?? init?.trackCloses,
        trackBoardScore: f.trackBoardScore ?? init?.trackBoardScore,
        trackStats: f.trackStats ?? init?.trackStats,
      })
      if (fFlags.trackTons) sectionShowTons = true
      if (fFlags.trackHeavyTons) sectionShowHeavy = true
      if (fFlags.trackCloses) sectionShowCloses = true
      if (Number(f.games ?? init?.games ?? 1) > 1) sectionHasSeries = true
    }
    const statsParts: string[] = []
    if (sectionShowTons || homeTons + awayTons > 0) {
      statsParts.push(`${t('tons')} ${homeTons}/${awayTons}`)
    }
    if (sectionShowHeavy || homeHeavy + awayHeavy > 0) {
      statsParts.push(`${t('heavy_tons')} ${homeHeavy}/${awayHeavy}`)
    }
    if (sectionShowCloses || homeCloses + awayCloses > 0) {
      statsParts.push(`${t('closes')} ${homeCloses}/${awayCloses}`)
    }
    if (sectionHasSeries || homeLegs + awayLegs > 0) {
      statsParts.push(`${t('legs')} ${homeLegs}/${awayLegs}`)
    }
    return (
      <View
        style={{
          marginHorizontal: 12,
          marginTop: 6,
          marginBottom: 2,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 14,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.cardBorder,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <Text style={{color: theme.muted, fontSize: 13, fontWeight: '700'}}>
            {t('section')} {item.section}
          </Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Text
              style={{
                color: theme.home.accent,
                fontSize: 18,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
              }}>
              {homeWins}
            </Text>
            <Text style={{color: theme.muted, fontSize: 14}}>–</Text>
            <Text
              style={{
                color: theme.away.accent,
                fontSize: 18,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
              }}>
              {awayWins}
            </Text>
          </View>
        </View>
        {statsParts.length > 0 ? (
          <Text
            style={{
              marginTop: 6,
              color: theme.muted,
              fontSize: 11,
              fontWeight: '600',
            }}>
            {statsParts.join(' · ')}
          </Text>
        ) : null}
      </View>
    )
  }

  const live = state.frameData[index] ?? item
  const winner = live.winner
  const kind = frameKindLabel(minPlayers, maxPlayers, t)
  const need = seriesWinsNeeded(seriesMode, games)
  const showSeries =
    games > 1 || seriesMode === 'race_to' || seriesMode === 'best_of'
  const homeLegs = Number(live.homeScore ?? 0)
  const awayLegs = Number(live.awayScore ?? 0)
  // Prefer explicit winner; series score only counts once the frame is complete
  // (full roster + first-to-N), matching auto-collapse / server win gate.
  const decidedWinnerId = resolvedRowWinnerId(
    {
      ...initial,
      ...live,
      games,
      seriesMode,
      minPlayers,
      maxPlayers,
      noPlayers: minPlayers,
      type: frameType,
    },
    Number(homeTeamId),
    Number(awayTeamId),
  )
  const homeWon = decidedWinnerId > 0 && decidedWinnerId === Number(homeTeamId)
  const awayWon = decidedWinnerId > 0 && decidedWinnerId === Number(awayTeamId)
  const seriesLabel =
    seriesMode === 'race_to' ? `Race to ${games}` : `Bo${games}`
  const showClose = !!(item.showClose ?? initial?.showClose)
  const showScore = !!(item.showScore ?? initial?.showScore)
  const showWin = !!(item.showWin ?? initial?.showWin)
  const scoringMode = scoresheetScoringMode({showClose, showScore})
  const canOpenScore = (showClose || showScore) && !locked && openScore != null
  const hasFirstDart = Number(item.firstDart ?? 0) > 0
  // TEMP: allow X01 without a full roster so scoring can be tested first.
  // Restore `frameHasCompleteRosters(...)` gate before release.
  const hasPlayers = true
  const scoreStart = showClose ? parseX01Start(frameLabel, frameType) : null
  const matchId = Number(state.matchInfo?.match_id ?? 0)
  const scoreLabel =
    showScore && !showClose
      ? t('score_open')
      : scoreStart != null
        ? t('x01_score_game', {start: scoreStart})
        : t('x01_score_game_plain')

  React.useEffect(() => {
    if (scoringMode === 'score') return
    const remote = livePreview?.x01
    if (!scoringMode || !x01Score || !remote || remote.mode !== scoringMode) {
      return
    }
    x01Score.publishBoard(index, {
      mode: scoringMode,
      start: remote.start,
      home: remote.home,
      away: remote.away,
      active: remote.active,
      legIndex: remote.legIndex,
      done: remote.done,
    })
  }, [
    scoringMode,
    x01Score,
    index,
    livePreview?.x01?.mode,
    livePreview?.x01?.start,
    livePreview?.x01?.home,
    livePreview?.x01?.away,
    livePreview?.x01?.active,
    livePreview?.x01?.legIndex,
    livePreview?.x01?.done,
  ])

  React.useEffect(() => {
    if (!scoringMode || scoringMode === 'score' || !x01Score || matchId <= 0 || x01Board != null) return
    const remote = livePreview?.x01
    if (remote && remote.mode === scoringMode) {
      x01Score.publishBoard(index, {
        mode: scoringMode,
        start: remote.start,
        home: remote.home,
        away: remote.away,
        active: remote.active,
        legIndex: remote.legIndex,
        done: remote.done,
      })
      return
    }
    let cancelled = false
    const key = x01StorageKey(matchId, index, scoringMode)
    const start =
      scoringMode === 'score'
        ? 0
        : (scoreStart ?? parseX01Start(frameLabel, frameType) ?? 501)
    ;(async () => {
      const saved = await loadX01Board(key)
      if (cancelled || !saved) {
        if (!cancelled && scoringMode === 'close') {
          x01Score.publishBoard(index, {
            mode: scoringMode,
            start,
            home: start,
            away: start,
            active: 'home',
            legIndex: 0,
            done: false,
          })
        }
        return
      }
      x01Score.publishBoard(index, {
        mode: scoringMode,
        start: saved.start,
        home: saved.home,
        away: saved.away,
        active: saved.active,
        legIndex: saved.legIndex,
        done: saved.done,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [
    scoringMode,
    x01Score,
    matchId,
    index,
    x01Board,
    scoreStart,
    frameLabel,
    frameType,
    livePreview?.x01,
  ])

  function openSubscreen() {
    if (!openScore || !canOpenScore) return
    // TEMP: players gate disabled — see hasPlayers above.
    if (!hasFirstDart) {
      Alert.alert(t('x01_need_first_dart_title'), t('x01_need_first_dart_body'))
      return
    }
    Haptics.selectionAsync()
    openScore(index)
  }
  const showLegTallies =
    showClose &&
    (trackStats ||
      !hasConfiguredFlags ||
      configuredFlags.trackStats !== false)
  const canAdjustStats =
    showLegTallies ||
    statFlags.trackTons ||
    statFlags.trackHeavyTons ||
    statFlags.trackCloses

  const gate = resolveFrameGate(state.frameData, index)
  // PreferExpanded / becoming active opens the card (see effects above), but the
  // user can still collapse the active game — do not force showFullBody open.
  const showFullBody = userExpanded
  const canToggle =
    gate === 'active' || gate === 'complete' || gate === 'upcoming'

  function toggleExpanded() {
    Haptics.selectionAsync()
    setUserExpanded(v => !v)
  }

  const localScore =
    scoringMode === 'score' && matchId > 0
      ? peekX01Board(x01StorageKey(matchId, index, 'score'))
      : null
  const historyTotals =
    localScore && localScore.undoStack.length > 0
      ? scoreTotalsFromHistory(localScore.undoStack)
      : null

  function sideMetaExtras(side: 'home' | 'away') {
    const palette = side === 'home' ? theme.home : theme.away
    const legs = side === 'home' ? live.homeScore : live.awayScore
    const serverBoard =
      side === 'home' ? live.homeBoardScore : live.awayBoardScore
    const fromX01 =
      x01Board != null
        ? side === 'home'
          ? x01Board.home
          : x01Board.away
        : null
    const fromHistory =
      historyTotals == null
        ? null
        : side === 'home'
          ? historyTotals.home
          : historyTotals.away
    const liveTotal = showClose
      ? (fromX01 ?? scoreStart ?? 501)
      : fromHistory != null
        ? fromHistory
        : Math.max(fromX01 ?? 0, Number(serverBoard ?? 0))
    const throwing = x01Board?.active === side && !x01Board.done
    // Legs are derived from closes / Win — no manual +/- counter.
    if (!showScore && !showClose && !showSeries && !showLegTallies) return null
    return (
      <View
        style={{
          marginTop: 8,
          gap: 8,
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          alignItems: 'center',
        }}>
        {showClose ? (
          <View style={{alignItems: 'center', gap: 2, maxWidth: '100%'}}>
            <Text
              style={{
                color: palette.ink,
                fontSize: 28,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
              }}>
              {liveTotal}
            </Text>
            <Text
              style={{
                color: throwing ? theme.gold : theme.muted,
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}>
              {throwing ? t('x01_throwing') : t('x01_remaining')}
            </Text>
          </View>
        ) : null}
        {showLegTallies && manualStats ? (
          <LegLines
            frameIndex={index}
            side={side}
            games={games}
            seriesMode={seriesMode}
            trackTons={trackStats ? statFlags.trackTons : true}
            trackHeavyTons={trackStats ? statFlags.trackHeavyTons : true}
            trackCloses={trackStats ? statFlags.trackCloses : true}
            locked={locked}
          />
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
          }}>
          {showScore ? (
            <StatValueInput
              label={t('score')}
              value={Number(!showClose ? liveTotal : (fromX01 ?? serverBoard ?? 0))}
              ink={palette.ink}
              accent={palette.button}
              disabled={locked || canEditScoresheet === false}
              onChange={next => {
                const current = Number(!showClose ? liveTotal : (fromX01 ?? serverBoard ?? 0))
                UpdateFrameStats(index, side, 'boardScore', next - current)
                if (x01Board && x01Score) {
                  const snap = {
                    ...x01Board,
                    home: side === 'home' ? next : x01Board.home,
                    away: side === 'away' ? next : x01Board.away,
                  }
                  x01Score.publishBoard(index, snap)
                  SyncX01Board?.(index, snap)
                }
              }}
            />
          ) : null}
          {showSeries ? (
            <Text
              style={{
                color: palette.ink,
                fontSize: 13,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
                opacity: 0.85,
              }}>
              {t('legs')} {Number(legs ?? 0)}
            </Text>
          ) : null}
        </View>
        {showScore && !showClose ? (
          <ScoreMarks
            marks={
              (x01Board?.cricket ?? localScore?.cricket ?? live.x01?.cricket)?.[
                side
              ] ?? null
            }
            ink={palette.ink}
            muted={theme.muted}
            bullLabel={t('score_bull')}
          />
        ) : null}
      </View>
    )
  }

  /** Win button only when game-type Win toggle is on. */
  function winFor(side: 'home' | 'away') {
    if (!showWin) return null
    const teamId = side === 'home' ? homeTeamId : awayTeamId
    const palette = side === 'home' ? theme.home : theme.away
    return (
      <WinButton
        winner={winner}
        HandleWin={HandleWin}
        side={side}
        teamId={teamId}
        ClearWinner={ClearWinner}
        goldenBreak={item.goldenBreak ?? false}
        accent={palette.button}
        onAccent={palette.onButton}
      />
    )
  }

  function titleBar(opts?: {collapsed?: boolean}) {
    const title = (
      <Text
        style={{
          color: theme.muted,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          flex: 1,
          paddingRight: 8,
        }}>
        {t('frame')} {item.frameNumber}
        {showSeries ? ` · ${seriesLabel} (first to ${need})` : ''}
        {frameLabel ? ` · ${frameLabel}` : ''}
      </Text>
    )
    const trailing = (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingVertical: 2,
          paddingHorizontal: 4,
        }}>
        {kind ? (
          <Text style={{color: theme.muted, fontSize: 12, fontWeight: '600'}}>
            {kind}
          </Text>
        ) : null}
        {canToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={opts?.collapsed ? t('expand') : t('collapse')}
            hitSlop={8}
            onPress={toggleExpanded}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
              borderRadius: 999,
              paddingLeft: 10,
              paddingRight: 6,
              paddingVertical: 4,
              backgroundColor: theme.faint,
              borderWidth: 1,
              borderColor: theme.divider,
            }}>
            <Text
              style={{
                color: theme.muted,
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 0.3,
              }}>
              {opts?.collapsed ? t('expand') : t('collapse')}
            </Text>
            <MCI
              name={opts?.collapsed ? 'chevron-down' : 'chevron-up'}
              size={16}
              color={theme.muted}
            />
          </Pressable>
        ) : null}
      </View>
    )

    const row = (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: opts?.collapsed ? 12 : 8,
        }}>
        {title}
        {trailing}
      </View>
    )

    if (canOpenScore) return row
    if (canToggle) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={opts?.collapsed ? t('expand') : t('collapse')}
          onPress={toggleExpanded}>
          {row}
        </Pressable>
      )
    }
    return row
  }

  const cardShell = (
    children: React.ReactNode,
    opts?: {showSharedFirstDart?: boolean; collapsed?: boolean},
  ) => {
    const shellStyle = [
      {
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 18,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: homeWon
          ? theme.home.accent
          : awayWon
            ? theme.away.accent
            : theme.cardBorder,
        alignSelf: 'stretch' as const,
        maxWidth: '100%' as const,
        overflow: 'hidden' as const,
      },
      theme.shadow,
    ]
    const body = (
      <>
        {titleBar({collapsed: opts?.collapsed})}
        {!opts?.collapsed && (showClose || showScore) ? (
          <GameScoreButton
            frameIndex={index}
            label={frameLabel}
            type={frameType}
            showClose={showClose}
            showScore={showScore}
            disabled={locked || !hasFirstDart || !hasPlayers}
          />
        ) : null}
        {!opts?.collapsed && canAdjustStats ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{checked: manualStats}}
            onPress={() => {
              Haptics.selectionAsync()
              setManualStats(on => !on)
            }}
            style={{
              alignSelf: 'flex-end',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginRight: 14,
              marginBottom: 4,
              minHeight: 32,
            }}>
            <Text style={{color: theme.muted, fontSize: 12, fontWeight: '800'}}>
              {showScore && !showClose ? t('score_adjust') : t('x01_adjust_stats')}
            </Text>
            <View
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                padding: 2,
                backgroundColor: manualStats ? theme.home.button : theme.faint,
                borderWidth: 1,
                borderColor: manualStats ? theme.home.button : theme.cardBorder,
                alignItems: manualStats ? 'flex-end' : 'flex-start',
                justifyContent: 'center',
              }}>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: '#fff',
                }}
              />
            </View>
          </Pressable>
        ) : null}
        {!opts?.collapsed && opts?.showSharedFirstDart !== false ? (
          <FirstDart frameIndex={index} />
        ) : null}
        {children}
      </>
    )
    if (!canOpenScore) return <View style={shellStyle}>{body}</View>
    return (
      <Pressable
        accessible={false}
        accessibilityLabel={scoreLabel}
        onPress={() => {
          if (scoresheetChildHandledPress()) return
          openSubscreen()
        }}
        style={shellStyle}>
        {body}
      </Pressable>
    )
  }

  function coloredStatPair(
    label: string,
    homeVal: string | number,
    awayVal: string | number,
  ) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          flexWrap: 'wrap',
        }}>
        <Text
          style={{
            color: theme.muted,
            fontSize: 11,
            fontWeight: '700',
            textTransform: 'uppercase',
          }}>
          {label}
        </Text>
        <Text
          style={{
            color: theme.home.accent,
            fontSize: 13,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
          }}>
          {homeVal}
        </Text>
        <Text style={{color: theme.muted, fontSize: 12}}>/</Text>
        <Text
          style={{
            color: theme.away.accent,
            fontSize: 13,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
          }}>
          {awayVal}
        </Text>
      </View>
    )
  }

  if (!showFullBody) {
    const homeTons = Number(live.homeTons ?? 0)
    const awayTons = Number(live.awayTons ?? 0)
    const homeHeavy = Number(live.homeHeavyTons ?? 0)
    const awayHeavy = Number(live.awayHeavyTons ?? 0)
    const homeCloses = closeValuesForSide(live, 'home')
    const awayCloses = closeValuesForSide(live, 'away')
    const homeNames = playerNicknames(
      state.teams,
      homeTeamId,
      live.homePlayerIds,
    )
    const awayNames = playerNicknames(
      state.teams,
      awayTeamId,
      live.awayPlayerIds,
    )
    const winnerLabel = homeWon
      ? t('frame_winner_home')
      : awayWon
        ? t('frame_winner_away')
        : ''
    const winnerNames = homeWon ? homeNames : awayWon ? awayNames : []
    const showTons = statFlags.trackTons || homeTons + awayTons > 0
    const showHeavy = statFlags.trackHeavyTons || homeHeavy + awayHeavy > 0
    const showClosesSummary =
      statFlags.trackCloses || homeCloses.length + awayCloses.length > 0
    const hasSummaryStats =
      gate === 'complete' &&
      (showTons || showHeavy || showClosesSummary || showSeries)

    const summaryStyle = {paddingHorizontal: 14, paddingBottom: 12, gap: 8}
    const summaryBody = (
      <>
        {gate === 'complete' ? (
          <Text
            style={{
              color: homeWon
                ? theme.home.accent
                : awayWon
                  ? theme.away.accent
                  : theme.muted,
              fontSize: 13,
              fontWeight: '800',
            }}>
            {winnerLabel}
            {winnerNames.length > 0 ? ` · ${winnerNames.join(' / ')}` : ''}
          </Text>
        ) : (
          <Text style={{color: theme.muted, fontSize: 12, fontWeight: '600'}}>
            {[homeNames.join(' / ') || '—', awayNames.join(' / ') || '—'].join(
              ' vs ',
            )}
          </Text>
        )}
        {hasSummaryStats ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
            }}>
            {showTons
              ? coloredStatPair(t('stat_abbr_tons'), homeTons, awayTons)
              : null}
            {showHeavy
              ? coloredStatPair(t('stat_abbr_heavy'), homeHeavy, awayHeavy)
              : null}
            {showClosesSummary
              ? coloredStatPair(
                  t('stat_abbr_closes'),
                  homeCloses.length > 0 ? homeCloses.join(', ') : '—',
                  awayCloses.length > 0 ? awayCloses.join(', ') : '—',
                )
              : null}
            {showSeries
              ? coloredStatPair(
                  t('legs'),
                  Number(live.homeScore ?? 0),
                  Number(live.awayScore ?? 0),
                )
              : null}
          </View>
        ) : null}
      </>
    )
    return cardShell(
      canOpenScore ? (
        <View style={summaryStyle}>{summaryBody}</View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('expand')}
          onPress={toggleExpanded}
          style={summaryStyle}>
          {summaryBody}
        </Pressable>
      ),
      {collapsed: true, showSharedFirstDart: false},
    )
  }

  // —— Compact: stacked ledger (not 2-column) ——
  if (view === 'compact') {
    return cardShell(
      <View style={{paddingHorizontal: 10, paddingBottom: 12, gap: 10}}>
        <View
          style={{
            borderRadius: 14,
            padding: 10,
            backgroundColor: homeWon
              ? theme.home.panelWinner
              : theme.home.panel,
            borderWidth: homeWon ? 1.5 : 1,
            borderColor: homeWon ? theme.home.accent : theme.home.border,
            opacity: winner && !homeWon ? 0.72 : 1,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
            <Text
              style={{
                color: theme.home.ink,
                fontWeight: '800',
                fontSize: 12,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}>
              {t('home')}
            </Text>
            <View style={{minWidth: 88}}>{winFor('home')}</View>
          </View>
          <View style={{marginBottom: 8}}>
            <FirstDart frameIndex={index} side="home" />
          </View>
          <Player
            teamId={homeTeamId ?? 0}
            side="home"
            frameIndex={index}
            frameNumber={item.frameNumber}
            frameType={frameType}
            minPlayers={minPlayers}
            maxPlayers={maxPlayers}
            noPlayers={minPlayers}
            playerIds={live.homePlayerIds}
            trackStats={trackStats}
            trackTons={statFlags.trackTons}
            trackHeavyTons={statFlags.trackHeavyTons}
            trackCloses={statFlags.trackCloses}
            manualStats={manualStats}
            hideStats={showLegTallies}
            layout="ledger"
            refreshing={refreshing}
            ink={theme.home.ink}
            mark={theme.home.button}
          />
          {sideMetaExtras('home')}
        </View>

        <View
          style={{
            borderRadius: 14,
            padding: 10,
            backgroundColor: awayWon
              ? theme.away.panelWinner
              : theme.away.panel,
            borderWidth: awayWon ? 1.5 : 1,
            borderColor: awayWon ? theme.away.accent : theme.away.border,
            opacity: winner && !awayWon ? 0.72 : 1,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
            <Text
              style={{
                color: theme.away.ink,
                fontWeight: '800',
                fontSize: 12,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}>
              {t('away')}
            </Text>
            <View style={{minWidth: 88}}>{winFor('away')}</View>
          </View>
          <View style={{marginBottom: 8}}>
            <FirstDart frameIndex={index} side="away" />
          </View>
          <Player
            teamId={awayTeamId ?? 0}
            side="away"
            frameIndex={index}
            frameNumber={item.frameNumber}
            frameType={frameType}
            minPlayers={minPlayers}
            maxPlayers={maxPlayers}
            noPlayers={minPlayers}
            playerIds={live.awayPlayerIds}
            trackStats={trackStats}
            trackTons={statFlags.trackTons}
            trackHeavyTons={statFlags.trackHeavyTons}
            trackCloses={statFlags.trackCloses}
            manualStats={manualStats}
            hideStats={showLegTallies}
            layout="ledger"
            refreshing={refreshing}
            ink={theme.away.ink}
            mark={theme.away.button}
          />
          {sideMetaExtras('away')}
        </View>
      </View>,
      {showSharedFirstDart: false},
    )
  }

  // —— Focus: stacked home / vs / away with chip pickers ——
  if (view === 'focus') {
    return cardShell(
      <View style={{paddingHorizontal: 10, paddingBottom: 12, gap: 8}}>
        <View
          style={{
            borderRadius: 16,
            padding: 12,
            backgroundColor: homeWon
              ? theme.home.panelWinner
              : theme.home.panel,
            borderWidth: homeWon ? 1.5 : 1,
            borderColor: homeWon ? theme.home.accent : theme.home.border,
            opacity: winner && !homeWon ? 0.72 : 1,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              gap: 8,
            }}>
            <Text
              style={{
                color: theme.home.ink,
                fontWeight: '800',
                fontSize: 11,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}>
              {t('home')}
            </Text>
            <FirstDart frameIndex={index} side="home" />
          </View>
          <Player
            teamId={homeTeamId ?? 0}
            side="home"
            frameIndex={index}
            frameNumber={item.frameNumber}
            frameType={frameType}
            minPlayers={minPlayers}
            maxPlayers={maxPlayers}
            noPlayers={minPlayers}
            playerIds={live.homePlayerIds}
            trackStats={trackStats}
            trackTons={statFlags.trackTons}
            trackHeavyTons={statFlags.trackHeavyTons}
            trackCloses={statFlags.trackCloses}
            manualStats={manualStats}
            hideStats={showLegTallies}
            layout="chips"
            focusedSlot={focusHome}
            onFocusSlot={setFocusHome}
            refreshing={refreshing}
            ink={theme.home.ink}
            mark={theme.home.button}
          />
          {sideMetaExtras('home')}
          {winFor('home')}
        </View>

        <View
          style={{
            alignItems: 'center',
            paddingVertical: 2,
          }}>
          <Text
            style={{
              color: theme.muted,
              fontWeight: '900',
              fontSize: 13,
              letterSpacing: 2,
            }}>
            VS
          </Text>
        </View>

        <View
          style={{
            borderRadius: 16,
            padding: 12,
            backgroundColor: awayWon
              ? theme.away.panelWinner
              : theme.away.panel,
            borderWidth: awayWon ? 1.5 : 1,
            borderColor: awayWon ? theme.away.accent : theme.away.border,
            opacity: winner && !awayWon ? 0.72 : 1,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              gap: 8,
            }}>
            <Text
              style={{
                color: theme.away.ink,
                fontWeight: '800',
                fontSize: 11,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}>
              {t('away')}
            </Text>
            <FirstDart frameIndex={index} side="away" />
          </View>
          <Player
            teamId={awayTeamId ?? 0}
            side="away"
            frameIndex={index}
            frameNumber={item.frameNumber}
            frameType={frameType}
            minPlayers={minPlayers}
            maxPlayers={maxPlayers}
            noPlayers={minPlayers}
            playerIds={live.awayPlayerIds}
            trackStats={trackStats}
            trackTons={statFlags.trackTons}
            trackHeavyTons={statFlags.trackHeavyTons}
            trackCloses={statFlags.trackCloses}
            manualStats={manualStats}
            hideStats={showLegTallies}
            layout="chips"
            focusedSlot={focusAway}
            onFocusSlot={setFocusAway}
            refreshing={refreshing}
            ink={theme.away.ink}
            mark={theme.away.button}
          />
          {sideMetaExtras('away')}
          {winFor('away')}
        </View>
      </View>,
      {showSharedFirstDart: false},
    )
  }

  // —— Full (default): classic 2-column panels ——
  function panel(side: 'home' | 'away') {
    const palette = side === 'home' ? theme.home : theme.away
    const won = side === 'home' ? homeWon : awayWon
    const lost = !!winner && !won
    return {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minWidth: 0,
      maxWidth: '100%' as const,
      overflow: 'hidden' as const,
      flexDirection: 'column' as const,
      justifyContent: 'space-between' as const,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 6,
      backgroundColor: won ? palette.panelWinner : palette.panel,
      borderWidth: won ? 1.5 : 1,
      borderColor: won ? palette.accent : palette.border,
      opacity: lost ? 0.72 : 1,
    }
  }

  return cardShell(
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        alignSelf: 'stretch',
        width: '100%',
        gap: 6,
        paddingHorizontal: 8,
        paddingBottom: 10,
      }}>
      <View style={panel('home')}>
        <Player
          teamId={homeTeamId ?? 0}
          side="home"
          frameIndex={index}
          frameNumber={item.frameNumber}
          frameType={frameType}
          minPlayers={minPlayers}
          maxPlayers={maxPlayers}
          noPlayers={minPlayers}
          playerIds={live.homePlayerIds}
          trackStats={trackStats}
          trackTons={statFlags.trackTons}
          trackHeavyTons={statFlags.trackHeavyTons}
          trackCloses={statFlags.trackCloses}
          manualStats={manualStats}
          hideStats={showLegTallies}
          layout="panel"
          refreshing={refreshing}
          ink={theme.home.ink}
          mark={theme.home.button}
        />
        {sideMetaExtras('home')}
        {winFor('home')}
      </View>
      <View style={panel('away')}>
        <Player
          teamId={awayTeamId ?? 0}
          side="away"
          frameIndex={index}
          frameNumber={item.frameNumber}
          frameType={frameType}
          minPlayers={minPlayers}
          maxPlayers={maxPlayers}
          noPlayers={minPlayers}
          playerIds={live.awayPlayerIds}
          trackStats={trackStats}
          trackTons={statFlags.trackTons}
          trackHeavyTons={statFlags.trackHeavyTons}
          trackCloses={statFlags.trackCloses}
          manualStats={manualStats}
          hideStats={showLegTallies}
          layout="panel"
          refreshing={refreshing}
          ink={theme.away.ink}
          mark={theme.away.button}
        />
        {sideMetaExtras('away')}
        {winFor('away')}
      </View>
    </View>,
  )
}
