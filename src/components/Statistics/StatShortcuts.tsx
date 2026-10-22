import {useStatColors} from '@/components/PlayerStatistics/statUi'
import {Ionicons} from '@expo/vector-icons'
import {router, usePathname, type Href} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, Text, View} from 'react-native'

type IonName = React.ComponentProps<typeof Ionicons>['name']

type Shortcut = {
  key: string
  href: Href
  labelKey: string
  shortKey: string
  hintKey: string
  icon: IonName
  color: string
}

const SHORTCUTS: Shortcut[] = [
  {
    key: 'standings',
    href: '/statistics/LeagueStandings',
    labelKey: 'league_standings',
    shortKey: 'league_standings_short',
    hintKey: 'stats_home_standings_hint',
    icon: 'trophy',
    color: '#C8960C',
  },
  {
    key: 'teams',
    href: '/statistics/TeamStatistics',
    labelKey: 'team_statistics',
    shortKey: 'team_statistics_short',
    hintKey: 'stats_home_teams_hint',
    icon: 'people',
    color: '#16a34a',
  },
  {
    key: 'players',
    href: '/statistics/PlayerStatistics',
    labelKey: 'player_statistics',
    shortKey: 'player_statistics_short',
    hintKey: 'stats_home_players_hint',
    icon: 'person',
    color: '#2563eb',
  },
  {
    key: 'rankings',
    href: '/statistics/PlayerRankings',
    labelKey: 'player_rankings',
    shortKey: 'player_rankings_short',
    hintKey: 'stats_home_rankings_hint',
    icon: 'podium',
    color: '#7c3aed',
  },
  {
    key: 'highlights',
    href: '/statistics/Highlights',
    labelKey: 'highlights',
    shortKey: 'highlights',
    hintKey: 'stats_home_highlights_hint',
    icon: 'sparkles',
    color: '#db2777',
  },
]

function tint(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export type StatShortcutKey = (typeof SHORTCUTS)[number]['key']

export default function StatShortcuts({
  variant,
  showSignIn = false,
  onSelectShortcut,
  selectedKey,
}: {
  variant: 'grid' | 'compact' | 'list'
  showSignIn?: boolean
  /** Regular-width: select in-pane instead of stack push. */
  onSelectShortcut?: (key: StatShortcutKey, href: Href) => void
  selectedKey?: StatShortcutKey | null
}) {
  const {t} = useTranslation()
  const colors = useStatColors()
  const pathname = usePathname()

  const open = (item: Shortcut) => {
    if (onSelectShortcut) {
      onSelectShortcut(item.key, item.href)
      return
    }
    router.push(item.href)
  }

  if (variant === 'list') {
    return (
      <View style={{paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12}}>
        {SHORTCUTS.map(item => {
          const selected = selectedKey === item.key
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{selected}}
              accessibilityLabel={t(item.labelKey)}
              onPress={() => open(item)}
              style={({pressed}) => ({
                opacity: pressed ? 0.85 : 1,
                marginBottom: 8,
                borderRadius: 14,
                borderWidth: selected ? 1.5 : 1,
                borderColor: selected ? item.color : colors.border,
                backgroundColor: selected
                  ? tint(item.color, colors.isDark ? 0.22 : 0.1)
                  : colors.card,
              })}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  gap: 12,
                }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: tint(
                      item.color,
                      colors.isDark ? 0.28 : 0.14,
                    ),
                  }}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{flex: 1, minWidth: 0}}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 15,
                      fontWeight: '700',
                      color: colors.text,
                    }}>
                    {t(item.labelKey)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 2,
                      fontSize: 12,
                      color: colors.muted,
                    }}>
                    {t(item.hintKey)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={selected ? item.color : colors.muted}
                />
              </View>
            </Pressable>
          )
        })}
        {showSignIn ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('stats_sign_in_title')}
            onPress={() =>
              router.push({pathname: '/Auth', params: {from: pathname}})
            }
            style={({pressed}) => ({
              opacity: pressed ? 0.85 : 1,
              marginTop: 4,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            })}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 12,
                gap: 12,
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tint(
                    colors.accent,
                    colors.isDark ? 0.28 : 0.12,
                  ),
                }}>
                <Ionicons
                  name="log-in-outline"
                  size={18}
                  color={colors.accent}
                />
              </View>
              <View style={{flex: 1, minWidth: 0}}>
                <Text
                  style={{fontSize: 15, fontWeight: '700', color: colors.text}}>
                  {t('stats_sign_in_title')}
                </Text>
                <Text
                  numberOfLines={2}
                  style={{marginTop: 2, fontSize: 12, color: colors.muted}}>
                  {t('stats_sign_in_hint')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
          </Pressable>
        ) : null}
      </View>
    )
  }

  if (variant === 'compact') {
    return (
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 4,
        }}>
        {SHORTCUTS.map(item => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={t(item.labelKey)}
            onPress={() => open(item)}
            style={({pressed}) => ({
              flex: 1,
              opacity: pressed ? 0.72 : 1,
              borderWidth: selectedKey === item.key ? 2 : 0,
              borderColor: item.color,
              borderRadius: 14,
            })}>
            <View
              style={{
                alignItems: 'center',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
                paddingVertical: 10,
                paddingHorizontal: 4,
              }}>
              <Ionicons name={item.icon} size={20} color={item.color} />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.text,
                }}>
                {t(item.shortKey)}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    )
  }

  return (
    <View>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6}}>
        {SHORTCUTS.map(item => (
          <View key={item.key} style={{width: '50%', padding: 6}}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(item.labelKey)}
              onPress={() => open(item)}
              style={({pressed}) => ({opacity: pressed ? 0.75 : 1})}>
              <View
                style={{
                  minHeight: 148,
                  borderRadius: 16,
                  borderWidth: selectedKey === item.key ? 2 : 1,
                  borderColor:
                    selectedKey === item.key ? item.color : colors.border,
                  backgroundColor: colors.card,
                  padding: 16,
                }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: tint(item.color, colors.isDark ? 0.22 : 0.12),
                  }}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <Text
                  style={{
                    marginTop: 14,
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.text,
                  }}>
                  {t(item.labelKey)}
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    lineHeight: 18,
                    color: colors.muted,
                  }}>
                  {t(item.hintKey)}
                </Text>
              </View>
            </Pressable>
          </View>
        ))}
      </View>
      {showSignIn ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('stats_sign_in_title')}
          onPress={() =>
            router.push({pathname: '/Auth', params: {from: pathname}})
          }
          style={({pressed}) => ({
            marginTop: 10,
            opacity: pressed ? 0.75 : 1,
          })}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              padding: 16,
              gap: 12,
            }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: tint(colors.accent, colors.isDark ? 0.28 : 0.12),
              }}>
              <Ionicons name="log-in-outline" size={22} color={colors.accent} />
            </View>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 16, fontWeight: '700', color: colors.text}}>
                {t('stats_sign_in_title')}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  lineHeight: 18,
                  color: colors.muted,
                }}>
                {t('stats_sign_in_hint')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
        </Pressable>
      ) : null}
    </View>
  )
}
