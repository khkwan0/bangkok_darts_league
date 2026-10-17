import {useLeagueContext} from '@/context/LeagueContext'
import {useMatchContext} from '@/context/MatchContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Alert, Pressable, Text, View} from 'react-native'
import {useScoresheetTheme} from './scoresheetTheme'

function DartChip({
  selected,
  accent,
  border,
  muted,
  label,
  onSelect,
  onClear,
}: {
  selected: boolean
  accent: string
  border: string
  muted: string
  label: string
  onSelect: () => void
  onClear: () => void
}) {
  const ignoreNextPressRef = React.useRef(false)

  return (
    <Pressable
      onPress={() => {
        if (ignoreNextPressRef.current) {
          ignoreNextPressRef.current = false
          return
        }
        if (!selected) onSelect()
      }}
      onLongPress={() => {
        if (!selected) return
        ignoreNextPressRef.current = true
        onClear()
      }}
      delayLongPress={350}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? accent : border,
        backgroundColor: selected ? accent : 'transparent',
      }}>
      <MCI
        name={selected ? 'circle-slice-8' : 'circle-outline'}
        color={selected ? '#FFFFFF' : muted}
        size={14}
      />
      <Text
        style={{
          color: selected ? '#FFFFFF' : muted,
          fontSize: 12,
          fontWeight: '700',
        }}>
        {label}
      </Text>
    </Pressable>
  )
}

/** Per-game first dart selector (darts scoresheet rows). */
export default function FirstDart({frameIndex}: {frameIndex: number}) {
  const {state, UpdateFirstDart}: any = useMatchContext()
  const {state: leagueState}: any = useLeagueContext()
  const user = leagueState.user
  const [loading, setLoading] = React.useState(false)
  const liveFirstDart = Number(state.frameData?.[frameIndex]?.firstDart ?? 0)
  const [seenDart, setSeenDart] = React.useState(liveFirstDart)
  const {t} = useTranslation()
  const theme = useScoresheetTheme()

  if (liveFirstDart !== seenDart) {
    setSeenDart(liveFirstDart)
    if (loading) setLoading(false)
  }

  function canRecord(): boolean {
    if (state.finalizedHome && state.finalizedAway) {
      Alert.alert(t('match_completed'))
      return false
    }
    if (typeof user?.id === 'undefined') {
      Alert.alert(t('user_not_logged_in'))
      return false
    }
    try {
      const {home_team_id: homeTeamId, away_team_id: awayTeamId} =
        state.matchInfo
      const playerList = [
        ...Object.keys(state.teams?.[awayTeamId] ?? {}),
        ...Object.keys(state.teams?.[homeTeamId] ?? {}),
      ]
      if (playerList.includes(user.id.toString()) || isLeagueAdmin(user)) {
        return true
      }
    } catch (e) {
      console.error(e)
    }
    Alert.alert(t('user_not_on_team'))
    return false
  }

  function HandleFirstDart(teamId: number) {
    if (!canRecord()) return
    setLoading(true)
    UpdateFirstDart(frameIndex, teamId)
  }

  function HandleClearFirstDart() {
    if (!canRecord()) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setLoading(true)
    UpdateFirstDart(frameIndex, 0)
  }

  const homeId = state.matchInfo.home_team_id
  const awayId = state.matchInfo.away_team_id

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingBottom: 8,
        gap: 8,
      }}>
      <View style={{flex: 1, alignItems: 'center'}}>
        <DartChip
          selected={liveFirstDart === homeId}
          accent={theme.home.button}
          border={theme.divider}
          muted={theme.muted}
          label={
            loading && liveFirstDart !== homeId
              ? t('updating')
              : t('first_break')
          }
          onSelect={() => HandleFirstDart(homeId)}
          onClear={HandleClearFirstDart}
        />
      </View>
      <View style={{width: 28}} />
      <View style={{flex: 1, alignItems: 'center'}}>
        <DartChip
          selected={liveFirstDart === awayId}
          accent={theme.away.button}
          border={theme.divider}
          muted={theme.muted}
          label={
            loading && liveFirstDart !== awayId
              ? t('updating')
              : t('first_break')
          }
          onSelect={() => HandleFirstDart(awayId)}
          onClear={HandleClearFirstDart}
        />
      </View>
    </View>
  )
}
