import {useMatchContext} from '@/context/MatchContext'
import type {ScoresheetStatsView} from '@/lib/scoresheetStatsView'
import {
  anyPlayerStatFlags,
  resolveScoreSheetStatFlags,
  seriesWinsNeeded,
} from '@/lib/matchFormat'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Text, View} from 'react-native'
import {FrameProps} from '../types'
import FirstDart from './FirstDart'
import Player from './Player'
import {useScoresheetTheme} from './scoresheetTheme'
import StatStepper from './StatStepper'
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
  const initial = state.matchInfo.initialFrames[index]
  const frameType = initial?.type
  const frameLabel = item.label || initial?.label || frameType
  const minPlayers = item.minPlayers ?? item.noPlayers ?? initial?.minPlayers
  const maxPlayers = item.maxPlayers ?? initial?.maxPlayers ?? minPlayers
  const games = item.games ?? initial?.games ?? 1
  const seriesMode =
    games > 1
      ? item.seriesMode ?? initial?.seriesMode ?? 'best_of'
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
      if (f.winner === homeTeamId) homeWins++
      if (f.winner === awayTeamId) awayWins++
      homeTons += Number(f.homeTons ?? 0)
      awayTons += Number(f.awayTons ?? 0)
      homeHeavy += Number(f.homeHeavyTons ?? 0)
      awayHeavy += Number(f.awayHeavyTons ?? 0)
      homeCloses += Number(f.homeCloses ?? 0)
      awayCloses += Number(f.awayCloses ?? 0)
      homeLegs += Number(f.homeScore ?? 0)
      awayLegs += Number(f.awayScore ?? 0)
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
  const showSeries = games > 1
  const seriesLabel =
    seriesMode === 'race_to' ? `Race to ${games}` : `Bo${games}`

  function sideMetaExtras(side: 'home' | 'away') {
    const palette = side === 'home' ? theme.home : theme.away
    const legs = side === 'home' ? live.homeScore : live.awayScore
    const board = side === 'home' ? live.homeBoardScore : live.awayBoardScore
    if (!statFlags.trackBoardScore && !showSeries) return null
    return (
      <View
        style={{
          marginTop: 8,
          gap: 8,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
        {statFlags.trackBoardScore ? (
          <StatStepper
            label={t('score')}
            value={Number(board ?? 0)}
            ink={palette.ink}
            accent={palette.button}
            disabled={locked}
            onDelta={d => UpdateFrameStats(index, side, 'boardScore', d)}
          />
        ) : null}
        {showSeries ? (
          <StatStepper
            label={t('legs')}
            value={Number(legs ?? 0)}
            ink={palette.ink}
            accent={palette.button}
            disabled={locked}
            onDelta={d => UpdateFrameStats(index, side, 'games', d)}
          />
        ) : null}
      </View>
    )
  }

  /** Series winners come from leg counts — no explicit Win control. */
  function winFor(side: 'home' | 'away') {
    if (showSeries) return null
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

  function titleBar() {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 8,
        }}>
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
        {kind ? (
          <Text style={{color: theme.muted, fontSize: 12, fontWeight: '600'}}>
            {kind}
          </Text>
        ) : null}
      </View>
    )
  }

  const cardShell = (
    children: React.ReactNode,
    opts?: {showSharedFirstDart?: boolean},
  ) => (
    <View
      style={[
        {
          marginHorizontal: 12,
          marginVertical: 6,
          borderRadius: 18,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.cardBorder,
        },
        theme.shadow,
      ]}>
      {titleBar()}
      {opts?.showSharedFirstDart !== false ? (
        <FirstDart frameIndex={index} />
      ) : null}
      {children}
    </View>
  )

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
