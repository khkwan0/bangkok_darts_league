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
import {
  Pressable,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

type Props = {
  /** Override label; defaults to active competition name */
  title?: string
  compact?: boolean
}

/** Room for header buttons (settings / back) on each side. */
const HEADER_SIDE_CHROME = 56

export function CompetitionSwitcher({title, compact = true}: Props) {
  const {state, openCompetitionPicker} = useLeagueContext()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const navigation = useNavigation()
  const {width: windowWidth} = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const competition = state.competition
  const canonical = isCanonicalCompetition(competition)
  const modeLabel = competitionModeLabel(competition)
  const label = title || competitionDisplayName(competition)

  const palette = getCompetitionPalette(competition, isDark)
  const accent = palette.accent
  const labelOnSoft = palette.label
  const softBg = palette.soft
  const softHeader = palette.softHeader

  // Title area between leading/trailing header items + Duo rail insets.
  const titleMaxWidth = Math.max(
    140,
    windowWidth - insets.left - insets.right - HEADER_SIDE_CHROME * 2,
  )

  // Custom title only — do not override headerLeft so Duo/system Back stays native.
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: softHeader,
      },
      headerShadowVisible: true,
      headerTintColor: labelOnSoft,
      headerTitleAlign: 'center',
      headerTitleContainerStyle: {
        maxWidth: titleMaxWidth,
      },
    })
  }, [navigation, softHeader, labelOnSoft, titleMaxWidth])

  if (canonical) {
    return (
      <Pressable
        onPress={openCompetitionPicker}
        accessibilityRole="button"
        accessibilityLabel="Switch competition"
        hitSlop={8}
        style={{maxWidth: titleMaxWidth}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            maxWidth: titleMaxWidth,
          }}>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={{
              fontWeight: '700',
              fontSize: compact ? 15 : 16,
              color: labelOnSoft,
              flexShrink: 1,
              textAlign: 'center',
            }}>
            {label}
          </Text>
          <MCI
            name="chevron-down"
            size={18}
            color={labelOnSoft}
            style={{flexShrink: 0}}
          />
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
      style={{maxWidth: titleMaxWidth}}>
      <View
        style={{
          backgroundColor: softBg,
          borderColor: accent,
          borderWidth: 1.5,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: compact ? 4 : 6,
          alignItems: 'center',
          maxWidth: titleMaxWidth,
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
            {modeLabel ?? ''}
          </Text>
          <MCI name="chevron-down" size={14} color={labelOnSoft} />
        </View>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{
            fontWeight: '700',
            fontSize: compact ? 13 : 14,
            color: labelOnSoft,
            textAlign: 'center',
          }}>
          {label}
        </Text>
      </View>
    </Pressable>
  )
}
