import {useLeagueContext} from '@/context/LeagueContext'
import {useMatchContext} from '@/context/MatchContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {getFinalizeBlockReason} from '@/lib/matchFormat'
import * as Haptics from 'expo-haptics'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {ActivityIndicator, Alert, Pressable, Text, View} from 'react-native'
import {useScoresheetTheme} from './scoresheetTheme'

function FinalizeButton({
  label,
  loading,
  finalized,
  locked,
  color,
  gold,
  goldText,
  spinner,
  onFinalize,
  onUnfinalize,
}: {
  label: string
  loading: boolean
  finalized: boolean
  locked: boolean
  color: string
  gold: string
  goldText: string
  spinner: string
  onFinalize: () => void
  onUnfinalize: () => void
}) {
  if (loading) {
    return (
      <View style={{flex: 1, paddingVertical: 16, alignItems: 'center'}}>
        <ActivityIndicator size="small" color={spinner} />
      </View>
    )
  }

  if (locked) {
    return (
      <View
        style={{
          flex: 1,
          marginHorizontal: 4,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: gold,
          backgroundColor: 'rgba(245, 197, 66, 0.16)',
          paddingVertical: 14,
          alignItems: 'center',
          opacity: 0.7,
        }}>
        <Text style={{color: goldText, fontWeight: '800', fontSize: 15}}>
          {label}
        </Text>
      </View>
    )
  }

  if (finalized) {
    return (
      <Pressable
        onPress={onUnfinalize}
        style={{
          flex: 1,
          marginHorizontal: 4,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: gold,
          backgroundColor: 'rgba(245, 197, 66, 0.16)',
          paddingVertical: 14,
          alignItems: 'center',
        }}>
        <Text style={{color: goldText, fontWeight: '800', fontSize: 15}}>
          {label}
        </Text>
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={onFinalize}
      style={{
        flex: 1,
        marginHorizontal: 4,
        borderRadius: 14,
        backgroundColor: color,
        paddingVertical: 14,
        alignItems: 'center',
      }}>
      <Text style={{color: '#FFFFFF', fontWeight: '800', fontSize: 15}}>
        {label}
      </Text>
    </Pressable>
  )
}

export default function Finalizer({matchInfo}: {matchInfo: any}) {
  const theme = useScoresheetTheme()
  const {
    state: matchState,
    FinalizeMatch,
    UnfinalizeMatch,
  }: any = useMatchContext()
  const {state} = useLeagueContext()
  const [localBusy, setLocalBusy] = React.useState(false)
  const [seenHome, setSeenHome] = React.useState(matchState.finalizedHome)
  const [seenAway, setSeenAway] = React.useState(matchState.finalizedAway)
  const [seenBusy, setSeenBusy] = React.useState(!!matchState.finalizeBusy)
  const {t} = useTranslation()
  const matchCompleted = !!(
    matchState.finalizedHome && matchState.finalizedAway
  )
  const busy = !!(matchState.finalizeBusy || localBusy)

  if (matchState.finalizedHome !== seenHome) {
    setSeenHome(matchState.finalizedHome)
    setLocalBusy(false)
  }

  if (matchState.finalizedAway !== seenAway) {
    setSeenAway(matchState.finalizedAway)
    setLocalBusy(false)
  }

  if (!!matchState.finalizeBusy !== seenBusy) {
    setSeenBusy(!!matchState.finalizeBusy)
    // Remote lock released (or never acquired) — clear optimistic local lock.
    if (!matchState.finalizeBusy) setLocalBusy(false)
  }

  React.useEffect(() => {
    if (!localBusy) return
    const timer = setTimeout(() => setLocalBusy(false), 45000)
    return () => clearTimeout(timer)
  }, [localBusy])

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
    return (
      getFinalizeBlockReason(
        matchState.frameData ?? [],
        matchState.matchInfo?.format ?? matchInfo?.format,
        Number(matchState.matchInfo?.home_team_id ?? 0),
        Number(matchState.matchInfo?.away_team_id ?? 0),
        matchState.firstBreak,
      ) == null
    )
  }

  function finalizeBlockMessage(): string {
    const reason = getFinalizeBlockReason(
      matchState.frameData ?? [],
      matchState.matchInfo?.format ?? matchInfo?.format,
      Number(matchState.matchInfo?.home_team_id ?? 0),
      Number(matchState.matchInfo?.away_team_id ?? 0),
      matchState.firstBreak,
    )
    if (!reason) return t('match_not_finalizable')
    return t(reason.key, reason.params)
  }

  async function HandleFinalize(side: string) {
    try {
      if (busy || matchCompleted) {
        if (matchCompleted) Alert.alert(t('match_completed'))
        return
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      if (CanFinalize(side)) {
        const sideTeamId =
          side === 'home'
            ? matchState.matchInfo.home_team_id
            : matchState.matchInfo.away_team_id
        if (canActForTeam(sideTeamId) && (side === 'home' || side === 'away')) {
          setLocalBusy(true)
          FinalizeMatch(side, sideTeamId)
        } else {
          Alert.alert(t('error'), t('not_on_team') + ' ' + side)
        }
      } else {
        Alert.alert(t('error'), finalizeBlockMessage())
        setLocalBusy(false)
      }
    } catch (e) {
      console.log(e)
      setLocalBusy(false)
    }
  }

  function Unfinalize(side: string) {
    try {
      if (busy || matchCompleted) {
        if (matchCompleted) Alert.alert(t('match_completed'))
        return
      }
      const sideTeamId =
        side === 'home' ? matchInfo.home_team_id : matchInfo.away_team_id
      if (canActForTeam(sideTeamId) && (side === 'home' || side === 'away')) {
        setLocalBusy(true)
        UnfinalizeMatch(side, sideTeamId)
      }
    } catch (e) {
      console.log(e)
      setLocalBusy(false)
    }
  }

  return (
    <View style={{flexDirection: 'row', paddingHorizontal: 8, marginTop: 14}}>
      <FinalizeButton
        label={
          matchState.finalizedHome
            ? `${t('unfinalize')} ${t('home')}`
            : `${t('finalize')} ${t('home')}`
        }
        loading={busy}
        finalized={matchState.finalizedHome}
        locked={matchCompleted}
        color={theme.home.button}
        gold={theme.gold}
        goldText={theme.isDark ? theme.gold : '#92400E'}
        spinner={theme.isDark ? '#FFFFFF' : '#0F172A'}
        onFinalize={() => HandleFinalize('home')}
        onUnfinalize={() => Unfinalize('home')}
      />
      <FinalizeButton
        label={
          matchState.finalizedAway
            ? `${t('unfinalize')} ${t('away')}`
            : `${t('finalize')} ${t('away')}`
        }
        loading={busy}
        finalized={matchState.finalizedAway}
        locked={matchCompleted}
        color={theme.away.button}
        gold={theme.gold}
        goldText={theme.isDark ? theme.gold : '#92400E'}
        spinner={theme.isDark ? '#FFFFFF' : '#0F172A'}
        onFinalize={() => HandleFinalize('away')}
        onUnfinalize={() => Unfinalize('away')}
      />
    </View>
  )
}
