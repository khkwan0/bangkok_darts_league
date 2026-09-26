import Row from '@/components/Row'
import {
  ActivityIndicator,
  Pressable,
  useColorScheme,
  Alert,
  Text,
  View,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useLeagueContext} from '@/context/LeagueContext'
import {useMatchContext} from '@/context/MatchContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import React from 'react'
import {LinearGradient} from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import {
  frameHasRequiredPlayers,
  isMatchCompleteByMode,
  parseMatchFormat,
} from '@/lib/matchFormat'

export default function Finalizer({matchInfo}: {matchInfo: any}) {
  const colorScheme = useColorScheme()
  const {
    state: matchState,
    FinalizeMatch,
    UnfinalizeMatch,
  }: any = useMatchContext()
  const {state} = useLeagueContext()
  const [homeLoading, setHomeLoading] = React.useState(false)
  const [awayLoading, setAwayLoading] = React.useState(false)
  const {t} = useTranslation()
  const homeStyle = `bg-red-400 dark:bg-red-600 mx-4 p-4 items-center rounded-lg`
  const awayStyle = `bg-blue-400 dark:bg-blue-600 mx-4 p-4 item-center rounded-lg`

  function canActForTeam(teamId: number): boolean {
    const userId = state.user?.id
    if (isLeagueAdmin(state.user)) return true
    if (userId == null || !teamId) return false
    const roster = matchState.teams?.[teamId]
    if (!roster) return false
    return (
      Object.prototype.hasOwnProperty.call(roster, String(userId)) ||
      Object.prototype.hasOwnProperty.call(roster, userId)
    )
  }

  function CanFinalize(_side: string) {
    const homeId = Number(matchState.matchInfo?.home_team_id ?? 0)
    const awayId = Number(matchState.matchInfo?.away_team_id ?? 0)
    const format = parseMatchFormat(
      matchState.matchInfo?.format ?? matchInfo?.format,
    )
    const mode = format?.mode ?? 'full_play'

    let homeWins = 0
    let awayWins = 0
    let frameCount = 0
    let validCount = 0
    let decidedValid = 0
    let decidedCount = 0

    matchState.frameData.forEach((frame: any) => {
      if (frame.frameNumber === -1 || frame.type === 'section') return
      frameCount++
      const winner = Number(frame.winner ?? 0)
      if (winner > 0) {
        decidedCount++
        if (frameHasRequiredPlayers(frame)) {
          decidedValid++
          if (winner === homeId) homeWins++
          else if (winner === awayId) awayWins++
        }
      }
      if (frameHasRequiredPlayers(frame)) {
        validCount++
      }
    })

    if (mode === 'race_to' || mode === 'best_of') {
      if (homeWins === awayWins) return false
      if (!isMatchCompleteByMode(format, homeWins, awayWins)) return false
      return decidedCount > 0 && decidedValid === decidedCount
    }

    return frameCount > 0 && validCount === frameCount
  }

  async function HandleFinalize(side: string) {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      if (CanFinalize(side)) {
        const sideTeamId =
          side === 'home'
            ? matchState.matchInfo.home_team_id
            : matchState.matchInfo.away_team_id
        if (canActForTeam(sideTeamId) && (side === 'home' || side === 'away')) {
          if (side === 'home') setHomeLoading(true)
          else setAwayLoading(true)
          FinalizeMatch(side, sideTeamId)
        } else {
          Alert.alert(t('error'), t('not_on_team') + ' ' + side)
        }
      } else {
        Alert.alert(t('error'), t('match_not_finalizable'))
        setHomeLoading(false)
        setAwayLoading(false)
      }
    } catch (e) {
      console.log(e)
      setHomeLoading(false)
      setAwayLoading(false)
    }
  }

  function Unfinalize(side: string) {
    try {
      const sideTeamId =
        side === 'home' ? matchInfo.home_team_id : matchInfo.away_team_id
      if (canActForTeam(sideTeamId) && (side === 'home' || side === 'away')) {
        if (side === 'home') setHomeLoading(true)
        else setAwayLoading(true)
        UnfinalizeMatch(side, sideTeamId)
      }
    } catch (e) {
      console.log(e)
      setHomeLoading(false)
      setAwayLoading(false)
    }
  }

  React.useEffect(() => {
    setHomeLoading(false)
  }, [matchState.finalizedHome])

  React.useEffect(() => {
    setAwayLoading(false)
  }, [matchState.finalizedAway])

  return (
    <View>
      <Row>
        <View className="flex-1">
          {homeLoading ? (
            <ActivityIndicator
              className="mx-4 p-4"
              size="small"
              color={colorScheme === 'dark' ? 'white' : 'black'}
            />
          ) : matchState.finalizedHome ? (
            <Pressable
              onPress={() => Unfinalize('home')}
              className="rounded-lg mx-4 items-center rounded-lg">
              <LinearGradient
                colors={['gold', 'white', 'gold']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={{padding: 14, width: '100%', borderRadius: 8}}>
                <Text className="text-center text-black font-bold text-lg">
                  {t('unfinalize')}
                  &nbsp;{t('home')}
                </Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              disabled={homeLoading}
              className={homeStyle}
              onPress={() => HandleFinalize('home')}>
              <Text className="text-center text-white font-bold text-lg">
                {t('finalize')}
                &nbsp;{t('home')}
              </Text>
            </Pressable>
          )}
        </View>
        <View className="flex-1">
          {awayLoading ? (
            <ActivityIndicator
              className="mx-4 p-4"
              size="small"
              color={colorScheme === 'dark' ? 'white' : 'black'}
            />
          ) : matchState.finalizedAway ? (
            <Pressable
              onPress={() => Unfinalize('away')}
              className="rounded-lg mx-4 items-center rounded-lg">
              <LinearGradient
                colors={['gold', 'white', 'gold']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={{padding: 14, width: '100%', borderRadius: 8}}>
                <Text className="text-center text-black font-bold text-lg">
                  {t('unfinalize')}
                  &nbsp;{t('away')}
                </Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              disabled={awayLoading}
              className={awayStyle}
              onPress={() => HandleFinalize('away')}>
              <Text className="text-center text-white font-bold text-lg">
                {t('finalize')}
                &nbsp;{t('away')}
              </Text>
            </Pressable>
          )}
        </View>
      </Row>
    </View>
  )
}
