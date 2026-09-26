import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  competitionDisplayName,
  competitionModeLabel,
  getCompetitionPalette,
  isCanonicalCompetition,
} from '@/types/competition'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useNavigation} from 'expo-router/react-navigation'
import React from 'react'
import {Pressable, useColorScheme, View} from 'react-native'

type Props = {
  /** Override label; defaults to active competition name */
  title?: string
  compact?: boolean
}

export function CompetitionSwitcher({title, compact}: Props) {
  const {state, openCompetitionPicker} = useLeagueContext()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const navigation = useNavigation()
  const competition = state.competition
  const canonical = isCanonicalCompetition(competition)
  const modeLabel = competitionModeLabel(competition)
  const label = title || competitionDisplayName(competition)

  const palette = getCompetitionPalette(competition, isDark)
  const accent = palette.accent
  const labelOnSoft = palette.label
  const softBg = palette.soft
  const softHeader = palette.softHeader

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: softHeader,
      },
      headerShadowVisible: true,
      headerTintColor: labelOnSoft,
    })
  }, [navigation, softHeader, labelOnSoft])

  if (canonical) {
    return (
      <Pressable
        onPress={openCompetitionPicker}
        accessibilityRole="button"
        accessibilityLabel="Switch competition"
        hitSlop={8}
        style={{maxWidth: compact ? 220 : 280}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}>
          <Text
            numberOfLines={1}
            style={{
              fontWeight: '700',
              fontSize: compact ? 15 : 16,
              color: labelOnSoft,
              flexShrink: 1,
            }}>
            {label}
          </Text>
          <MCI name="chevron-down" size={18} color={labelOnSoft} />
        </View>
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={openCompetitionPicker}
      accessibilityRole="button"
      accessibilityLabel={`Switch competition. Currently ${modeLabel}: ${label}`}
      hitSlop={6}
      style={{maxWidth: compact ? 240 : 300}}>
      <View
        style={{
          backgroundColor: softBg,
          borderColor: accent,
          borderWidth: 1.5,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: compact ? 4 : 6,
          alignItems: 'center',
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginBottom: 1,
          }}>
          <MCI name="trophy-outline" size={12} color={labelOnSoft} />
          <Text
            style={{
              color: labelOnSoft,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 0.8,
            }}>
            {modeLabel}
          </Text>
          <MCI name="chevron-down" size={14} color={labelOnSoft} />
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontWeight: '700',
            fontSize: compact ? 13 : 14,
            color: labelOnSoft,
            maxWidth: compact ? 200 : 260,
          }}>
          {label}
        </Text>
      </View>
    </Pressable>
  )
}
