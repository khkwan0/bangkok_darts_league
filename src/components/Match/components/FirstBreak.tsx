import {useMatchContext} from '@/context/MatchContext'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, Text, View} from 'react-native'
import {useScoresheetTheme} from './scoresheetTheme'

function BreakChip({
  selected,
  accent,
  border,
  muted,
  label,
  onPress,
}: {
  selected: boolean
  accent: string
  border: string
  muted: string
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      disabled={selected}
      onPress={onPress}
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
  const [loading, setLoading] = React.useState(false)
  const [seenBreak, setSeenBreak] = React.useState(state.firstBreak)
  const {t} = useTranslation()
  const theme = useScoresheetTheme()

  if (state.firstBreak !== seenBreak) {
    setSeenBreak(state.firstBreak)
    if (loading) setLoading(false)
  }

  function HandleFirstBreak(teamId: number) {
    setLoading(true)
    UpdateFirstBreak(teamId)
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
          onPress={() => HandleFirstBreak(state.matchInfo.home_team_id)}
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
          onPress={() => HandleFirstBreak(state.matchInfo.away_team_id)}
        />
      </View>
    </View>
  )
}
