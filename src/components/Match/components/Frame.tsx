import {useMatchContext} from '@/context/MatchContext'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Text, View} from 'react-native'
import {FrameProps} from '../types'
import Player from './Player'
import {useScoresheetTheme} from './scoresheetTheme'
import WinButton from './WinButton'

function frameKindLabel(type: string | undefined, t: (key: string) => string) {
  if (!type) return ''
  const game = type.startsWith('8') ? '8' : type.startsWith('9') ? '9' : ''
  const kind = type.endsWith('d')
    ? t('doubles')
    : type.endsWith('s')
      ? t('singles')
      : ''
  if (game && kind) return `${game} · ${kind}`
  return kind
}

export default function Frame({item, index, refreshing}: FrameProps) {
  const {state, UpdateFrameWin, ClearFrameWinner}: any = useMatchContext()
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const frameType = state.matchInfo.initialFrames[index].type
  const {home_team_id: homeTeamId, away_team_id: awayTeamId} = state.matchInfo

  function HandleWin(side: string, goldenBreak: boolean = false): void {
    const teamId = side === 'home' ? homeTeamId : awayTeamId
    UpdateFrameWin(side, index, teamId, goldenBreak)
  }

  function ClearWinner(): void {
    ClearFrameWinner(index)
  }

  React.useEffect(() => {
    if (refreshing) {
      // Future refresh logic can go here
    }
  }, [refreshing])

  if (item.frameNumber === -1) {
    let homeScore = 0
    let awayScore = 0
    let i = 0
    while (i < index) {
      if (state.frameData[i].winner === homeTeamId) {
        homeScore++
      }
      if (state.frameData[i].winner === awayTeamId) {
        awayScore++
      }
      i++
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
            {homeScore}
          </Text>
          <Text style={{color: theme.muted, fontSize: 14}}>–</Text>
          <Text
            style={{
              color: theme.away.accent,
              fontSize: 18,
              fontWeight: '800',
              fontVariant: ['tabular-nums'],
            }}>
            {awayScore}
          </Text>
        </View>
      </View>
    )
  }

  const winner = state.frameData[index].winner
  const homeWon = winner === homeTeamId
  const awayWon = winner === awayTeamId
  const kind = frameKindLabel(frameType, t)

  function panel(side: 'home' | 'away') {
    const palette = side === 'home' ? theme.home : theme.away
    const won = side === 'home' ? homeWon : awayWon
    const lost = !!winner && !won
    return {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 8,
      backgroundColor: won ? palette.panelWinner : palette.panel,
      borderWidth: won ? 1.5 : 1,
      borderColor: won ? palette.accent : palette.border,
      opacity: lost ? 0.72 : 1,
    }
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
        </Text>
        {kind ? (
          <Text style={{color: theme.muted, fontSize: 12, fontWeight: '600'}}>
            {kind}
          </Text>
        ) : null}
      </View>
      <View style={{flexDirection: 'row', gap: 8, paddingHorizontal: 10, paddingBottom: 10}}>
        <View style={panel('home')}>
          <Player
            teamId={state.matchInfo.home_team_id ?? 0}
            side="home"
            frameIndex={index}
            frameNumber={item.frameNumber}
            frameType={frameType}
            playerIds={item.homePlayerIds}
            refreshing={refreshing}
            ink={theme.home.ink}
            mark={theme.home.button}
          />
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
        </View>
        <View style={panel('away')}>
          <Player
            teamId={state.matchInfo.away_team_id ?? 0}
            side="away"
            frameIndex={index}
            frameNumber={item.frameNumber}
            frameType={frameType}
            playerIds={item.awayPlayerIds}
            refreshing={refreshing}
            ink={theme.away.ink}
            mark={theme.away.button}
          />
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
        </View>
      </View>
    </View>
  )
}
