import {useMatchContext} from '@/context/MatchContext'
import {Text, View} from 'react-native'
import {useScoresheetTheme} from './scoresheetTheme'

export default function Score() {
  const {state}: any = useMatchContext()
  const theme = useScoresheetTheme()

  let homeScore = 0
  let awayScore = 0
  const homeTeamId = state.matchInfo?.home_team_id
  const awayTeamId = state.matchInfo?.away_team_id

  ;(state.frameData ?? []).forEach(
    (frame: {
      frameNumber?: number
      homeScore?: number
      awayScore?: number
      winner?: number
      games?: number
    }) => {
      // Section dividers
      if (frame?.frameNumber === -1) return

      const homeLegs = Number(frame.homeScore ?? 0)
      const awayLegs = Number(frame.awayScore ?? 0)
      if (homeLegs > 0 || awayLegs > 0) {
        homeScore += Math.max(0, homeLegs)
        awayScore += Math.max(0, awayLegs)
        return
      }

      // Single-game rows may only have winner set (no series leg counters yet).
      if (frame.winner === homeTeamId) homeScore++
      else if (frame.winner === awayTeamId) awayScore++
    },
  )

  const tied = homeScore === awayScore
  const total = homeScore + awayScore

  return (
    <View style={{paddingHorizontal: 16, paddingTop: 12}}>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 44,
            lineHeight: 48,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
            color: tied || homeScore > awayScore ? theme.home.accent : theme.muted,
          }}>
          {homeScore}
        </Text>
        <Text
          style={{
            width: 28,
            textAlign: 'center',
            color: theme.muted,
            fontSize: 22,
            fontWeight: '600',
          }}>
          –
        </Text>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 44,
            lineHeight: 48,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
            color: tied || awayScore > homeScore ? theme.away.accent : theme.muted,
          }}>
          {awayScore}
        </Text>
      </View>
      <View
        style={{
          marginTop: 8,
          height: 6,
          borderRadius: 999,
          overflow: 'hidden',
          flexDirection: 'row',
          backgroundColor: theme.faint,
        }}>
        {total === 0 ? (
          <View style={{flex: 1}} />
        ) : (
          <>
            {homeScore > 0 && (
              <View
                style={{flex: homeScore, backgroundColor: theme.home.accent}}
              />
            )}
            {awayScore > 0 && (
              <View
                style={{flex: awayScore, backgroundColor: theme.away.accent}}
              />
            )}
          </>
        )}
      </View>
    </View>
  )
}
