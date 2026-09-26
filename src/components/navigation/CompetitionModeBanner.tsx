import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  competitionDisplayName,
  competitionModeLabel,
  getCompetitionPalette,
  isCanonicalCompetition,
} from '@/types/competition'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import React from 'react'
import {Pressable, useColorScheme, View} from 'react-native'

/**
 * Persistent strip above the tab bar when not in Bangkok Darts League mode.
 */
export function CompetitionModeBanner() {
  const {state, openCompetitionPicker} = useLeagueContext()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const competition = state.competition

  if (isCanonicalCompetition(competition)) {
    return null
  }

  const modeLabel = competitionModeLabel(competition) || 'OTHER'
  const name = competitionDisplayName(competition)
  const palette = getCompetitionPalette(competition, isDark)

  return (
    <Pressable
      onPress={openCompetitionPicker}
      accessibilityRole="button"
      accessibilityLabel={`${modeLabel} mode: ${name}. Tap to change league`}
      style={{
        backgroundColor: palette.accent,
        paddingHorizontal: 14,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: palette.border,
      }}>
      <MCI name="trophy" size={18} color="#fff" />
      <View style={{flex: 1, minWidth: 0}}>
        <Text
          style={{
            color: '#fff',
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1,
          }}>
          VIEWING MINI LEAGUE
        </Text>
        <Text
          numberOfLines={1}
          style={{color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 1}}>
          {name}
        </Text>
      </View>
      <Text style={{color: '#fff', fontSize: 12, fontWeight: '600', opacity: 0.95}}>
        Change
      </Text>
      <MCI name="swap-horizontal" size={20} color="#fff" />
    </Pressable>
  )
}
