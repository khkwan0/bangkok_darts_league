import {useMatchContext} from '@/context/MatchContext'
import {seriesWinsNeeded} from '@/lib/matchFormat'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Text, View} from 'react-native'
import {FrameProps} from '../types'
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

export default function Frame({item, index, refreshing}: FrameProps) {
  const {state, UpdateFrameWin, ClearFrameWinner, UpdateFrameStats}: any =
    useMatchContext()
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const initial = state.matchInfo.initialFrames[index]
  const frameType = initial?.type
  const minPlayers = item.minPlayers ?? item.noPlayers ?? initial?.minPlayers
  const maxPlayers = item.maxPlayers ?? initial?.maxPlayers ?? minPlayers
  const games = item.games ?? initial?.games ?? 1
  const seriesMode =
    games > 1
      ? item.seriesMode ?? initial?.seriesMode ?? 'best_of'
      : undefined
  const trackStats = item.trackStats ?? initial?.trackStats ?? true
  const isMickey = String(frameType ?? '').toLowerCase() === 'mm'
  const {home_team_id: homeTeamId, away_team_id: awayTeamId} = state.matchInfo
  const locked = !!(state.finalizedHome && state.finalizedAway)

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
    let i = index - 1
    while (i >= 0 && state.frameData[i]?.frameNumber !== -1) {
      const f = state.frameData[i]
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
      i--
    }
    const showStats = trackStats || homeTons + awayTons + homeHeavy + awayHeavy > 0
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
        {showStats ? (
          <Text
            style={{
              marginTop: 6,
              color: theme.muted,
              fontSize: 11,
              fontWeight: '600',
            }}>
            {t('tons')} {homeTons}/{awayTons} · {t('heavy_tons')} {homeHeavy}/
            {awayHeavy} · {t('closes')} {homeCloses}/{awayCloses} · {t('legs')}{' '}
            {homeLegs}/{awayLegs}
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

  function sideStats(side: 'home' | 'away') {
    const palette = side === 'home' ? theme.home : theme.away
    const tons = side === 'home' ? live.homeTons : live.awayTons
    const heavy = side === 'home' ? live.homeHeavyTons : live.awayHeavyTons
    const closes = side === 'home' ? live.homeCloses : live.awayCloses
    const legs = side === 'home' ? live.homeScore : live.awayScore
    const board = side === 'home' ? live.homeBoardScore : live.awayBoardScore
    return (
      <View style={{marginTop: 10, gap: 8, alignItems: 'center'}}>
        {trackStats ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 8,
            }}>
            <StatStepper
              label={t('tons')}
              value={Number(tons ?? 0)}
              ink={palette.ink}
              accent={palette.button}
              disabled={locked}
              onDelta={d => UpdateFrameStats(index, side, 'tons', d)}
            />
            <StatStepper
              label={t('heavy')}
              value={Number(heavy ?? 0)}
              ink={palette.ink}
              accent={palette.button}
              disabled={locked}
              onDelta={d => UpdateFrameStats(index, side, 'heavyTons', d)}
            />
            <StatStepper
              label={t('closes')}
              value={Number(closes ?? 0)}
              ink={palette.ink}
              accent={palette.button}
              disabled={locked}
              onDelta={d => UpdateFrameStats(index, side, 'closes', d)}
            />
          </View>
        ) : null}
        {isMickey ? (
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
            disabled={locked || !!winner}
            onDelta={d => UpdateFrameStats(index, side, 'games', d)}
          />
        ) : null}
      </View>
    )
  }

  return (
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
          }}>
          {t('frame')} {item.frameNumber}
          {showSeries ? ` · ${seriesLabel} (first to ${need})` : ''}
          {frameType ? ` · ${frameType}` : ''}
        </Text>
        {kind ? (
          <Text style={{color: theme.muted, fontSize: 12, fontWeight: '600'}}>
            {kind}
          </Text>
        ) : null}
      </View>
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
            teamId={state.matchInfo.home_team_id ?? 0}
            side="home"
            frameIndex={index}
            frameNumber={item.frameNumber}
            frameType={frameType}
            minPlayers={minPlayers}
            maxPlayers={maxPlayers}
            noPlayers={minPlayers}
            playerIds={live.homePlayerIds}
            refreshing={refreshing}
            ink={theme.home.ink}
            mark={theme.home.button}
          />
          {sideStats('home')}
          {!showSeries ? (
            <WinButton
              winner={winner}
              HandleWin={HandleWin}
              side="home"
              teamId={homeTeamId}
              ClearWinner={ClearWinner}
              goldenBreak={item.goldenBreak ?? false}
              accent={theme.home.button}
              onAccent={theme.home.onButton}
            />
          ) : winner ? (
            <WinButton
              winner={winner}
              HandleWin={HandleWin}
              side="home"
              teamId={homeTeamId}
              ClearWinner={ClearWinner}
              goldenBreak={item.goldenBreak ?? false}
              accent={theme.home.button}
              onAccent={theme.home.onButton}
            />
          ) : null}
        </View>
        <View style={panel('away')}>
          <Player
            teamId={state.matchInfo.away_team_id ?? 0}
            side="away"
            frameIndex={index}
            frameNumber={item.frameNumber}
            frameType={frameType}
            minPlayers={minPlayers}
            maxPlayers={maxPlayers}
            noPlayers={minPlayers}
            playerIds={live.awayPlayerIds}
            refreshing={refreshing}
            ink={theme.away.ink}
            mark={theme.away.button}
          />
          {sideStats('away')}
          {!showSeries ? (
            <WinButton
              winner={winner}
              HandleWin={HandleWin}
              side="away"
              teamId={awayTeamId}
              ClearWinner={ClearWinner}
              goldenBreak={item.goldenBreak ?? false}
              accent={theme.away.button}
              onAccent={theme.away.onButton}
            />
          ) : winner ? (
            <WinButton
              winner={winner}
              HandleWin={HandleWin}
              side="away"
              teamId={awayTeamId}
              ClearWinner={ClearWinner}
              goldenBreak={item.goldenBreak ?? false}
              accent={theme.away.button}
              onAccent={theme.away.onButton}
            />
          ) : null}
        </View>
      </View>
    </View>
  )
}
