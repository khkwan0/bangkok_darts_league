import {useLeagueContext} from '@/context/LeagueContext'
import {useMatchContext} from '@/context/MatchContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Alert, Pressable, Text, View} from 'react-native'
import {useScoresheetTheme} from './scoresheetTheme'

function BreakChip({
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
  // Long-press clear flips `selected` mid-gesture; ignore the release press
  // that would otherwise immediately re-select the same team.
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

export default function FirstBreak() {
  const {state, UpdateFirstBreak}: any = useMatchContext()
  const {state: leagueState}: any = useLeagueContext()
  const user = leagueState.user
  const [loading, setLoading] = React.useState(false)
  const [seenBreak, setSeenBreak] = React.useState(state.firstBreak)
  const {t} = useTranslation()
  const theme = useScoresheetTheme()

  if (state.firstBreak !== seenBreak) {
    setSeenBreak(state.firstBreak)
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

  function HandleFirstBreak(teamId: number) {
    if (!canRecord()) return
    setLoading(true)
    UpdateFirstBreak(teamId)
  }

  function HandleClearFirstBreak() {
    if (!canRecord()) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setLoading(true)
    UpdateFirstBreak(0)
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 14,
        gap: 8,
      }}>
      <View style={{flex: 1, alignItems: 'center'}}>
        <BreakChip
          selected={state.firstBreak === state.matchInfo.home_team_id}
          accent={theme.home.button}
          border={theme.divider}
          muted={theme.muted}
          label={
            loading && state.firstBreak !== state.matchInfo.home_team_id
              ? t('updating')
              : t('first_break')
          }
          onSelect={() => HandleFirstBreak(state.matchInfo.home_team_id)}
          onClear={HandleClearFirstBreak}
        />
      </View>
      <View style={{width: 28}} />
      <View style={{flex: 1, alignItems: 'center'}}>
        <BreakChip
          selected={state.firstBreak === state.matchInfo.away_team_id}
          accent={theme.away.button}
          border={theme.divider}
          muted={theme.muted}
          label={
            loading && state.firstBreak !== state.matchInfo.away_team_id
              ? t('updating')
              : t('first_break')
          }
          onSelect={() => HandleFirstBreak(state.matchInfo.away_team_id)}
          onClear={HandleClearFirstBreak}
        />
      </View>
    </View>
  )
}
