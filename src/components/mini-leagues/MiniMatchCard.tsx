import {ThemedText as Text} from '@/components/ThemedText'
import {formatBangkokWeekdayDate} from '@/lib/bangkokTime'
import {
  getMiniLeaguePalette,
  type MiniLeaguePalette,
} from '@/types/competition'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {LinearGradient} from 'expo-linear-gradient'
import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native'

export type MiniMatchCardItem = {
  id: number
  date: string
  status_id: number
  home_team_name?: string
  away_team_name?: string
  home_frames?: number | null
  away_frames?: number | null
  round?: number | null
  tournament_id?: number | null
}

type Props = {
  item: MiniMatchCardItem
  onPress: () => void
  opening?: boolean
  miniLeagueId: number
}

function teamLabel(name: string | undefined, fallback: string) {
  const trimmed = (name || '').trim()
  return trimmed || fallback
}

function statusMeta(
  statusId: number,
  isDark: boolean,
  palette: MiniLeaguePalette,
) {
  if (statusId === 3) {
    return {
      label: 'Final',
      icon: 'flag-checkered' as const,
      color: isDark ? '#fbbf24' : '#b45309',
      soft: isDark ? 'rgba(251, 191, 36, 0.16)' : 'rgba(180, 83, 9, 0.12)',
      gradient: isDark
        ? (['#3d2808', '#24180c', '#1a1a1a'] as const)
        : (['#ffedd5', '#fff7ed', '#ffffff'] as const),
      border: isDark ? '#6b4a12' : '#fdba74',
      stripe: isDark ? '#f59e0b' : '#d97706',
      softAccent: undefined as string | undefined,
    }
  }
  if (statusId === 2) {
    return {
      label: 'Live',
      icon: 'broadcast' as const,
      color: isDark ? '#34d399' : '#047857',
      soft: isDark ? 'rgba(52, 211, 153, 0.16)' : 'rgba(4, 120, 87, 0.12)',
      gradient: isDark
        ? (['#0f3d2e', '#13241c', '#1a1a1a'] as const)
        : (['#d1fae5', '#ecfdf5', '#ffffff'] as const),
      border: isDark ? '#1f5c45' : '#a7f3d0',
      stripe: isDark ? '#34d399' : '#059669',
      softAccent: undefined as string | undefined,
    }
  }
  const label = isDark ? palette.accentOnSoftDark : palette.accentOnSoftLight
  return {
    label: 'Open',
    icon: 'clock-outline' as const,
    color: label,
    // Solid accent chip for icons that need punch; text uses high-contrast label above.
    soft: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.06)',
    softAccent: isDark ? 'rgba(255,255,255,0.14)' : palette.soft,
    gradient: isDark ? palette.gradientDark : palette.gradientLight,
    border: isDark ? palette.borderDark : palette.border,
    stripe: palette.accent,
    accent: palette.accent,
  }
}

function Chip({
  icon,
  label,
  color,
  background,
}: {
  icon: React.ComponentProps<typeof MCI>['name']
  label: string
  color: string
  background: string
}) {
  return (
    <View style={[styles.chip, {backgroundColor: background}]}>
      <MCI name={icon} size={13} color={color} />
      <Text style={[styles.chipText, {color}]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

export function MiniMatchCard({item, onPress, opening, miniLeagueId}: Props) {
  const isDark = useColorScheme() === 'dark'
  const palette = getMiniLeaguePalette(miniLeagueId)
  const theme = statusMeta(Number(item.status_id) || 1, isDark, palette)
  const muted = isDark ? 'rgba(248,250,252,0.78)' : 'rgba(15,23,42,0.72)'
  const bodyText = isDark ? '#F8FAFC' : '#0F172A'
  const home = teamLabel(item.home_team_name, 'Home')
  const away = teamLabel(item.away_team_name, 'Away')
  const dateLabel = formatBangkokWeekdayDate(item.date)
  const homeScore = Number(item.home_frames) || 0
  const awayScore = Number(item.away_frames) || 0
  const hasScore =
    item.home_frames != null ||
    item.away_frames != null ||
    Number(item.status_id) === 3
  const homeWins = hasScore && homeScore > awayScore
  const awayWins = hasScore && awayScore > homeScore
  const isTournament = Number(item.tournament_id) > 0
  // Mini matches default round=1 on create — only show for real tournament brackets.
  const showRound =
    isTournament && item.round != null && Number(item.round) > 0
  const radius = 18

  return (
    <View
      style={[
        styles.shadowWrap,
        {
          borderRadius: radius,
          backgroundColor: isDark ? '#1a1a1a' : '#FFFFFF',
          shadowColor: isDark ? '#000000' : '#0F172A',
          shadowOpacity: isDark ? 0.5 : 0.16,
          shadowRadius: 12,
          shadowOffset: {width: 0, height: 6},
          elevation: 6,
        },
      ]}>
      <Pressable
        onPress={onPress}
        disabled={opening}
        accessibilityRole="button"
        accessibilityLabel={`${home} versus ${away}, ${dateLabel}`}
        style={({pressed}) => ({
          borderRadius: radius,
          overflow: 'hidden',
          opacity: opening ? 0.75 : 1,
          transform: [{scale: pressed && !opening ? 0.985 : 1}],
        })}>
        <LinearGradient
          colors={[...theme.gradient]}
          locations={[0, 0.55, 1]}
          start={{x: 0, y: 0.5}}
          end={{x: 1, y: 0.5}}
          style={{
            borderRadius: radius,
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              backgroundColor: theme.stripe,
            }}
          />

          <View style={styles.body}>
            <View style={styles.metaRow}>
              <View style={styles.chipsWrap}>
                <Chip
                  icon="calendar"
                  label={dateLabel}
                  color={theme.color}
                  background={theme.softAccent ?? theme.soft}
                />
                <Chip
                  icon={theme.icon}
                  label={theme.label}
                  color={theme.color}
                  background={theme.softAccent ?? theme.soft}
                />
                {showRound ? (
                  <Chip
                    icon="tournament"
                    label={`R${item.round}`}
                    color={muted}
                    background={
                      isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'
                    }
                  />
                ) : null}
                {isTournament ? (
                  <Chip
                    icon="trophy-outline"
                    label="Tournament"
                    color={isDark ? '#fbbf24' : '#b45309'}
                    background={
                      isDark
                        ? 'rgba(251, 191, 36, 0.16)'
                        : 'rgba(180, 83, 9, 0.12)'
                    }
                  />
                ) : null}
              </View>
              <Text style={[styles.matchId, {color: muted}]}>#{item.id}</Text>
            </View>

            <View style={styles.teamsRow}>
              <View style={styles.teamCol}>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.teamName,
                    {color: homeWins ? theme.color : bodyText},
                  ]}>
                  {home}
                </Text>
                {hasScore ? (
                  <Text
                    style={[
                      styles.score,
                      {
                        color: homeWins
                          ? theme.color
                          : isDark
                            ? '#e5e5e5'
                            : '#0f172a',
                      },
                    ]}>
                    {homeScore}
                  </Text>
                ) : null}
              </View>

              <View style={styles.vsCol}>
                <View style={[styles.vsBadge, {backgroundColor: theme.soft}]}>
                  <MCI name="bullseye-arrow" size={18} color={theme.color} />
                </View>
                {!hasScore ? (
                  <Text style={[styles.vsHint, {color: muted}]}>VS</Text>
                ) : null}
              </View>

              <View style={styles.teamCol}>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.teamName,
                    {color: awayWins ? theme.color : bodyText},
                  ]}>
                  {away}
                </Text>
                {hasScore ? (
                  <Text
                    style={[
                      styles.score,
                      {
                        color: awayWins
                          ? theme.color
                          : isDark
                            ? '#e5e5e5'
                            : '#0f172a',
                      },
                    ]}>
                    {awayScore}
                  </Text>
                ) : null}
              </View>
            </View>

            <View
              style={[
                styles.footer,
                {
                  borderTopColor: isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(15,23,42,0.08)',
                },
              ]}>
              <View style={styles.statusRow}>
                <MCI
                  name="clipboard-text-outline"
                  size={16}
                  color={theme.color}
                />
                <Text style={[styles.statusText, {color: muted}]}>
                  {isTournament ? 'Tournament match' : 'Mini league match'}
                </Text>
              </View>
              {opening ? (
                <View style={styles.statusRow}>
                  <ActivityIndicator size="small" color={theme.color} />
                  <Text style={[styles.ctaText, {color: theme.color}]}>
                    Opening…
                  </Text>
                </View>
              ) : (
                <View style={styles.statusRow}>
                  <Text style={[styles.ctaText, {color: theme.color}]}>
                    Scoresheet
                  </Text>
                  <MCI name="chevron-right" size={18} color={theme.color} />
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  shadowWrap: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 18,
    backgroundColor: 'transparent',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  chipsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  matchId: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  teamName: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
  score: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: '800',
  },
  vsCol: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  vsBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsHint: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  footer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
  },
})
