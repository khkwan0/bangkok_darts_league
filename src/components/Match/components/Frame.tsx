import {useMatchContext} from '@/context/MatchContext'
import type {ScoresheetStatsView} from '@/lib/scoresheetStatsView'
import {
  anyPlayerStatFlags,
  resolveScoreSheetStatFlags,
  resolveValuePerLeg,
  seriesWinsNeeded,
} from '@/lib/matchFormat'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, Text, View} from 'react-native'
import {FrameProps} from '../types'
import FirstDart from './FirstDart'
import {
  closeValuesForSide,
  playerNicknames,
  resolveFrameGate,
} from './frameCollapse'
import LegLines from './LegLines'
import Player from './Player'
import {useScoresheetTheme} from './scoresheetTheme'
import StatValueInput from './StatValueInput'
import WinButton from './WinButton'

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

export default function Frame({
  item,
  index,
  refreshing,
  statsView = 'full',
}: FrameProps) {
  const {state, UpdateFrameWin, ClearFrameWinner, UpdateFrameStats}: any =
    useMatchContext()
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const [focusHome, setFocusHome] = React.useState<number | null>(null)
  const [focusAway, setFocusAway] = React.useState<number | null>(null)
  /** Manual expand for completed games (auto-collapses when a winner is set). */
  const [userExpanded, setUserExpanded] = React.useState(false)
  const livePreview = state.frameData?.[index] ?? item
  const winnerPreview = Number(livePreview?.winner ?? 0)
  const prevWinnerRef = React.useRef(winnerPreview)
  React.useEffect(() => {
    if (prevWinnerRef.current <= 0 && winnerPreview > 0) {
      setUserExpanded(false)
    }
    if (winnerPreview <= 0) setUserExpanded(false)
    prevWinnerRef.current = winnerPreview
  }, [winnerPreview])
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
    let i = index - 1
    while (i >= 0 && state.frameData[i]?.frameNumber !== -1) {
      const f = state.frameData[i]
      const init = state.matchInfo.initialFrames?.[i]
      const valuePerLeg = resolveValuePerLeg(
        f.valuePerLeg != null ? f : init,
      )
      if (f.winner === homeTeamId) homeWins += valuePerLeg
      if (f.winner === awayTeamId) awayWins += valuePerLeg
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
      i--
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
  const homeWon = winner === homeTeamId
  const awayWon = winner === awayTeamId
  const kind = frameKindLabel(minPlayers, maxPlayers, t)
  const need = seriesWinsNeeded(seriesMode, games)
  const showSeries =
    games > 1 || seriesMode === 'race_to' || seriesMode === 'best_of'
  const seriesLabel =
    seriesMode === 'race_to' ? `Race to ${games}` : `Bo${games}`
  const showClose = !!(item.showClose ?? initial?.showClose)
  const showScore = !!(item.showScore ?? initial?.showScore)
  const showWin = !!(item.showWin ?? initial?.showWin)
  /**
   * Close game-type toggle: per-leg tons/180s/closes (not inferred from series).
   * Granular trackTons/trackHeavyTons/trackCloses still filter which steppers appear.
   */
  const showLegTallies =
    showClose &&
    (trackStats ||
      !hasConfiguredFlags ||
      configuredFlags.trackStats !== false)
  const hidePlayerStats = showLegTallies

  const gate = resolveFrameGate(state.frameData, index)
  const showFullBody = gate === 'active' || (gate === 'complete' && userExpanded)

  function toggleExpanded() {
    Haptics.selectionAsync()
    setUserExpanded(v => !v)
  }

  function sideMetaExtras(side: 'home' | 'away') {
    const palette = side === 'home' ? theme.home : theme.away
    const legs = side === 'home' ? live.homeScore : live.awayScore
    const board = side === 'home' ? live.homeBoardScore : live.awayBoardScore
    // Legs are derived from closes / Win — no manual +/- counter.
    if (!showScore && !showSeries && !showLegTallies) return null
    const tallyTons = trackStats ? statFlags.trackTons : true
    const tallyHeavy = trackStats ? statFlags.trackHeavyTons : true
    const tallyCloses = trackStats ? statFlags.trackCloses : true
    return (
      <View
        style={{
          marginTop: 8,
          gap: 8,
          width: '100%',
          alignItems: 'center',
        }}>
        {showLegTallies ? (
          <LegLines
            frameIndex={index}
            side={side}
            games={games}
            seriesMode={seriesMode}
            trackTons={tallyTons}
            trackHeavyTons={tallyHeavy}
            trackCloses={tallyCloses}
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
              value={Number(board ?? 0)}
              ink={palette.ink}
              accent={palette.button}
              disabled={locked}
              onChange={next =>
                UpdateFrameStats(
                  index,
                  side,
                  'boardScore',
                  next - Number(board ?? 0),
                )
              }
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

  function titleBar(opts?: {collapsed?: boolean; locked?: boolean}) {
    const canToggle = gate === 'complete'
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
    const trailing = opts?.locked ? (
      <MCI name="lock-outline" size={18} color={theme.muted} />
    ) : canToggle ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={opts?.collapsed ? t('expand') : t('collapse')}
        hitSlop={8}
        onPress={toggleExpanded}
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
        <MCI
          name={opts?.collapsed ? 'chevron-down' : 'chevron-up'}
          size={22}
          color={theme.muted}
        />
      </Pressable>
    ) : kind ? (
      <Text style={{color: theme.muted, fontSize: 12, fontWeight: '600'}}>
        {kind}
      </Text>
    ) : null

    const row = (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: opts?.collapsed || opts?.locked ? 12 : 8,
        }}>
        {title}
        {trailing}
      </View>
    )

    if (canToggle && opts?.collapsed) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('expand')}
          onPress={toggleExpanded}>
          {row}
        </Pressable>
      )
    }
    return row
  }

  const cardShell = (
    children: React.ReactNode,
    opts?: {showSharedFirstDart?: boolean; collapsed?: boolean; locked?: boolean},
  ) => (
    <View
      style={[
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
          opacity: opts?.locked ? 0.72 : 1,
        },
        theme.shadow,
      ]}>
      {titleBar({collapsed: opts?.collapsed, locked: opts?.locked})}
      {!opts?.collapsed &&
      !opts?.locked &&
      opts?.showSharedFirstDart !== false ? (
        <FirstDart frameIndex={index} />
      ) : null}
      {children}
    </View>
  )

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

  if (gate === 'locked') {
    return cardShell(
      <View style={{paddingHorizontal: 14, paddingBottom: 12}}>
        <Text style={{color: theme.muted, fontSize: 12, fontWeight: '600'}}>
          {t('frame_locked_until_previous')}
        </Text>
      </View>,
      {locked: true, showSharedFirstDart: false},
    )
  }

  if (gate === 'complete' && !showFullBody) {
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

    return cardShell(
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('expand')}
        onPress={toggleExpanded}
        style={{paddingHorizontal: 14, paddingBottom: 12, gap: 8}}>
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
      </Pressable>,
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
            hideStats={hidePlayerStats}
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
            hideStats={hidePlayerStats}
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
            hideStats={hidePlayerStats}
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
            hideStats={hidePlayerStats}
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
      flex: 1,
      flexDirection: 'column' as const,
      justifyContent: 'space-between' as const,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 8,
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
        gap: 8,
        paddingHorizontal: 10,
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
          hideStats={hidePlayerStats}
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
          hideStats={hidePlayerStats}
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
