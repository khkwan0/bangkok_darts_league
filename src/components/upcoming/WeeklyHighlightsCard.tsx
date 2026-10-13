import config from '@/config'
import {useWeeklyHighlights} from '@/hooks/useWeeklyHighlights'
import {
  loadHomeHighlightsCollapsed,
  saveHomeHighlightsCollapsed,
} from '@/lib/homeHighlightsCollapsed'
import {Ionicons, MaterialCommunityIcons} from '@expo/vector-icons'
import {LinearGradient} from 'expo-linear-gradient'
import {router} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import type {
  HighlightGameTypeOption,
  WeeklyHighlightPlayer,
  WeeklyHighlights,
  WeeklySpotlight,
} from '@/types/weeklyHighlights'

const SPOTLIGHT_I18N: Record<string, string> = {
  hot_hand: 'weekly_spotlight_hot_hand',
  perfect_night: 'weekly_spotlight_perfect_night',
  iron_man: 'weekly_spotlight_iron_man',
  doubles_star: 'weekly_spotlight_doubles_star',
  ton_machine: 'weekly_spotlight_ton_machine',
  closer: 'weekly_spotlight_closer',
  golden_break: 'weekly_spotlight_golden_break',
}

const SPOTLIGHT_ICON: Record<
  string,
  React.ComponentProps<typeof MaterialCommunityIcons>['name']
> = {
  hot_hand: 'fire',
  perfect_night: 'star-circle',
  iron_man: 'dumbbell',
  doubles_star: 'account-multiple',
  ton_machine: 'bullseye-arrow',
  closer: 'target',
  golden_break: 'billiards',
}

function getTheme(isDark: boolean) {
  if (isDark) {
    return {
      gradient: ['#2A1830', '#1C1220'] as const,
      border: 'rgba(232, 198, 240, 0.25)',
      title: '#F8FAFC',
      muted: 'rgba(226,232,240,0.7)',
      accent: '#E8C6F0',
      chipBg: 'rgba(255,255,255,0.08)',
      chipBorder: 'rgba(148,163,184,0.28)',
      chipActiveBg: '#F8FAFC',
      chipActiveText: '#1A1220',
      pillBg: 'rgba(245, 215, 110, 0.18)',
      pillText: '#F5D76E',
      spotlightBg: 'rgba(255,255,255,0.07)',
      spotlightBorder: 'rgba(148,163,184,0.22)',
      btnBg: 'rgba(255,255,255,0.12)',
      btnBorder: 'rgba(248,250,252,0.3)',
    }
  }
  return {
    gradient: ['#3F0A48', '#37003C'] as const,
    border: 'rgba(55, 0, 60, 0.3)',
    title: '#FFFFFF',
    muted: 'rgba(255,255,255,0.75)',
    accent: '#F3D9F8',
    chipBg: 'rgba(255,255,255,0.12)',
    chipBorder: 'rgba(255,255,255,0.24)',
    chipActiveBg: '#FFFFFF',
    chipActiveText: '#37003C',
    pillBg: 'rgba(245, 215, 110, 0.22)',
    pillText: '#FFE9A8',
    spotlightBg: 'rgba(255,255,255,0.12)',
    spotlightBorder: 'rgba(255,255,255,0.22)',
    btnBg: 'rgba(255,255,255,0.16)',
    btnBorder: 'rgba(255,255,255,0.32)',
  }
}

function formatWeekDay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  return `${formatWeekDay(weekStart)} – ${formatWeekDay(weekEnd)}`
}

function gameTypeLabel(
  opt: HighlightGameTypeOption,
  t: (key: string) => string,
): string {
  if (opt.code === 'all') return t('weekly_highlights_all')
  return opt.label
}

function Avatar({
  player,
  size = 44,
}: {
  player: WeeklyHighlightPlayer
  size?: number
}) {
  const uri = player.pic ? config.profileUrl + player.pic : null
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {uri ? (
        <Image
          source={{uri}}
          style={{width: size, height: size}}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text style={{fontWeight: '800', fontSize: size * 0.38, color: '#FFF'}}>
          {(player.nickname || '?').slice(0, 1).toUpperCase()}
        </Text>
      )}
    </View>
  )
}

function openPlayer(playerId: number) {
  router.push({
    pathname: '/statistics/PlayerStatistics/Player' as any,
    params: {params: JSON.stringify({playerId})},
  })
}

function SpotlightRow({
  spotlight,
  label,
  theme,
}: {
  spotlight: WeeklySpotlight
  label: string
  theme: ReturnType<typeof getTheme>
}) {
  const icon = SPOTLIGHT_ICON[spotlight.id] || 'star-four-points'
  return (
    <Pressable
      onPress={() => openPlayer(spotlight.player.playerId)}
      style={[
        styles.spotlight,
        {
          backgroundColor: theme.spotlightBg,
          borderColor: theme.spotlightBorder,
        },
      ]}>
      <View style={styles.spotlightTop}>
        <MaterialCommunityIcons name={icon} size={13} color={theme.pillText} />
        <Text style={[styles.spotlightLabel, {color: theme.muted}]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.spotlightName, {color: theme.title}]} numberOfLines={1}>
        {spotlight.player.nickname}
      </Text>
      <Text style={{fontSize: 11, color: theme.muted}} numberOfLines={1}>
        {spotlight.detail}
      </Text>
    </Pressable>
  )
}

export default function WeeklyHighlightsCard() {
  const {t} = useTranslation()
  const {getWeeklyHighlights} = useWeeklyHighlights()
  const isDark = useColorScheme() === 'dark'
  const theme = getTheme(isDark)
  const [gameType, setGameType] = React.useState('all')
  const [data, setData] = React.useState<WeeklyHighlights | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [collapsed, setCollapsed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    loadHomeHighlightsCollapsed().then(value => {
      if (!cancelled) setCollapsed(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await getWeeklyHighlights({gameType})
        if (cancelled) return
        if (res?.playerOfTheWeek) {
          setData(res)
        } else if (gameType !== 'all') {
          // Empty filter — keep the card up and fall back to All.
          setGameType('all')
        } else {
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getWeeklyHighlights, gameType])

  async function setCollapsedPersisted(next: boolean) {
    setCollapsed(next)
    try {
      await saveHomeHighlightsCollapsed(next)
    } catch {
      // ignore
    }
  }

  if (!data?.playerOfTheWeek) return null

  const potw = data.playerOfTheWeek
  const options =
    (data.gameTypes?.length ?? 0) > 0
      ? data.gameTypes
      : [{code: 'all', label: 'All'}]
  const activeGameType = data.gameType || gameType
  const record = `${potw.won}–${potw.lost}${
    potw.played > 0 ? ` · ${potw.winPct}%` : ''
  }`

  // Collapsed strip: always visible with Expand — never unmount the card.
  if (collapsed) {
    return (
      <View style={styles.wrap}>
        <LinearGradient
          colors={[...theme.gradient]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[styles.collapsedCard, {borderColor: theme.border}]}>
          <View style={styles.collapsedLeft}>
            <Ionicons name="trophy" size={16} color={theme.pillText} />
            <Text style={[styles.collapsedName, {color: theme.title}]} numberOfLines={1}>
              {potw.nickname}
            </Text>
          </View>
          <Pressable
            onPress={() => void setCollapsedPersisted(false)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('expand')}
            style={[
              styles.actionBtn,
              {backgroundColor: theme.btnBg, borderColor: theme.btnBorder},
            ]}>
            <Text style={[styles.actionBtnText, {color: theme.title}]}>
              {t('expand')}
            </Text>
            <Ionicons name="chevron-down" size={15} color={theme.title} />
          </Pressable>
        </LinearGradient>
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[...theme.gradient]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.card, {borderColor: theme.border}]}>
        <View style={styles.header}>
          <View style={{flex: 1, minWidth: 0}}>
            <Text style={[styles.kicker, {color: theme.accent}]}>
              {t('player_of_the_week')}
            </Text>
            <Text style={{fontSize: 12, color: theme.muted, marginTop: 2}}>
              {formatWeekRange(
                data.weekStart || data.matchDate,
                data.weekEnd || data.matchDate,
              )}
            </Text>
          </View>
          <Pressable
            onPress={() => void setCollapsedPersisted(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('hide')}
            style={[
              styles.iconBtn,
              {backgroundColor: theme.btnBg, borderColor: theme.btnBorder},
            ]}>
            <Ionicons name="chevron-up" size={18} color={theme.title} />
          </Pressable>
          <Pressable
            onPress={() =>
              router.push('/statistics/Highlights' as any, {withAnchor: true})
            }
            hitSlop={8}
            style={[
              styles.actionBtn,
              {backgroundColor: theme.btnBg, borderColor: theme.btnBorder},
            ]}>
            <Text style={[styles.actionBtnText, {color: theme.title}]}>
              {t('more')}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={theme.title} />
          </Pressable>
        </View>

        {options.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{marginBottom: 10}}
            contentContainerStyle={{paddingRight: 4}}>
            {options.map(opt => {
              const active = activeGameType === opt.code
              return (
                <Pressable
                  key={opt.code}
                  onPress={() => setGameType(opt.code)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? theme.chipActiveBg : theme.chipBorder,
                      backgroundColor: active
                        ? theme.chipActiveBg
                        : theme.chipBg,
                    },
                  ]}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: active ? theme.chipActiveText : theme.muted,
                    }}>
                    {gameTypeLabel(opt, t)}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        ) : null}

        <Pressable
          onPress={() => openPlayer(potw.playerId)}
          style={[styles.hero, {opacity: loading ? 0.75 : 1}]}>
          <Avatar player={potw} size={52} />
          <View style={{flex: 1, minWidth: 0}}>
            <Text style={[styles.heroName, {color: theme.title}]} numberOfLines={1}>
              {potw.nickname}
            </Text>
            {potw.team ? (
              <Text style={{color: theme.muted, fontSize: 13, marginTop: 1}} numberOfLines={1}>
                {potw.team.shortName || potw.team.name}
              </Text>
            ) : null}
          </View>
          <View style={[styles.recordPill, {backgroundColor: theme.pillBg}]}>
            <Text style={{color: theme.pillText, fontWeight: '800', fontSize: 12}}>
              {record}
            </Text>
          </View>
        </Pressable>

        {data.spotlights.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{marginTop: 10}}
            contentContainerStyle={{paddingRight: 4}}>
            {data.spotlights.map(s => (
              <SpotlightRow
                key={s.id}
                spotlight={s}
                label={t(SPOTLIGHT_I18N[s.id] || s.label)}
                theme={theme}
              />
            ))}
          </ScrollView>
        ) : null}
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    overflow: 'hidden',
  },
  collapsedCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  collapsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  collapsedName: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '800',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  chip: {
    marginRight: 6,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
  },
  recordPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  spotlight: {
    width: 140,
    marginRight: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  spotlightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  spotlightLabel: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  spotlightName: {
    fontWeight: '800',
    fontSize: 13,
  },
})
