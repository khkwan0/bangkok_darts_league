import config from '@/config'
import {useWeeklyHighlights} from '@/hooks/useWeeklyHighlights'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {router} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Image, Pressable, ScrollView, useColorScheme} from 'react-native'
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

function formatWeekDay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
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
  size = 52,
  isDark,
}: {
  player: WeeklyHighlightPlayer
  size?: number
  isDark: boolean
}) {
  const uri = player.pic ? config.profileUrl + player.pic : null
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: isDark ? '#3A3A3A' : '#CFCFCF',
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
        <Text
          style={{
            fontWeight: '700',
            fontSize: size * 0.4,
            color: isDark ? '#F0F0F0' : undefined,
          }}>
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
  isDark,
}: {
  spotlight: WeeklySpotlight
  label: string
  isDark: boolean
}) {
  const chipBg = isDark ? '#2A2A2A' : '#F7F7F7'
  const chipBorder = isDark ? '#4A4A4A' : '#E0E0E0'
  const muted = isDark ? '#B0B0B0' : '#666666'
  const primary = isDark ? '#F5F5F5' : '#1A1A1A'

  return (
    <Pressable
      onPress={() => openPlayer(spotlight.player.playerId)}
      style={{
        minWidth: 140,
        marginRight: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: chipBorder,
        backgroundColor: chipBg,
      }}>
      <Text style={{fontSize: 11, color: muted, fontWeight: '600'}}>
        {label}
      </Text>
      <Text
        style={{fontWeight: '700', marginTop: 2, color: primary}}
        numberOfLines={1}>
        {spotlight.player.nickname}
      </Text>
      <Text style={{fontSize: 12, color: muted}} numberOfLines={1}>
        {spotlight.detail}
      </Text>
    </Pressable>
  )
}

export default function WeeklyHighlightsCard() {
  const {t} = useTranslation()
  const {getWeeklyHighlights} = useWeeklyHighlights()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const [gameType, setGameType] = React.useState('all')
  const [data, setData] = React.useState<WeeklyHighlights | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await getWeeklyHighlights({gameType})
        if (!cancelled) setData(res)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getWeeklyHighlights, gameType])

  if (loading && !data?.playerOfTheWeek) return null
  if (!data?.playerOfTheWeek) return null

  const potw = data.playerOfTheWeek
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF'
  const border = isDark ? '#3A3A3A' : '#E0E0E0'
  const muted = isDark ? '#B0B0B0' : '#666666'
  const primary = isDark ? '#F5F5F5' : '#1A1A1A'
  const options =
    data.gameTypes?.length > 0
      ? data.gameTypes
      : [{code: 'all', label: 'All'}]
  const activeGameType = data.gameType || gameType

  return (
    <View
      className="mx-4 mb-3 rounded-xl p-3"
      style={{
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: border,
      }}>
      <View
        className="flex-row items-center justify-between"
        style={{marginBottom: 2, backgroundColor: 'transparent'}}>
        <Text style={{fontSize: 12, color: muted, fontWeight: '600'}}>
          {t('player_of_the_week')}
        </Text>
        <Pressable
          onPress={() => router.push('/statistics/highlights' as any)}
          hitSlop={8}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: isDark ? '#5A5A5A' : '#D0D0D0',
            backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
          }}>
          <Text style={{fontSize: 12, fontWeight: '700', color: primary}}>
            {t('more')}
          </Text>
        </Pressable>
      </View>
      <Text style={{fontSize: 12, color: muted, marginBottom: 8}}>
        {formatWeekRange(
          data.weekStart || data.matchDate,
          data.weekEnd || data.matchDate,
        )}
      </Text>

      {options.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{marginBottom: 10}}>
          {options.map(opt => {
            const active = activeGameType === opt.code
            return (
              <Pressable
                key={opt.code}
                onPress={() => setGameType(opt.code)}
                style={{
                  marginRight: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active
                    ? isDark
                      ? '#FFFFFF'
                      : '#37003C'
                    : isDark
                      ? '#4A4A4A'
                      : '#D0D0D0',
                  backgroundColor: active
                    ? isDark
                      ? '#FFFFFF'
                      : '#37003C'
                    : isDark
                      ? '#2A2A2A'
                      : '#F5F5F5',
                }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: active
                      ? isDark
                        ? '#1A1A1A'
                        : '#FFFFFF'
                      : muted,
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
        className="flex-row items-center"
        style={{gap: 12, opacity: loading ? 0.6 : 1}}>
        <Avatar player={potw} size={56} isDark={isDark} />
        <View style={{flex: 1, backgroundColor: 'transparent'}}>
          <Text
            style={{fontSize: 18, fontWeight: '700', color: primary}}
            numberOfLines={1}>
            {potw.nickname}
          </Text>
          {potw.team ? (
            <Text style={{color: muted}} numberOfLines={1}>
              {potw.team.shortName || potw.team.name}
            </Text>
          ) : null}
          <Text style={{color: muted, marginTop: 2}}>
            {potw.won}–{potw.lost}
            {potw.played > 0 ? ` · ${potw.winPct}%` : ''}
          </Text>
        </View>
      </Pressable>

      {data.spotlights.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{marginTop: 12}}>
          {data.spotlights.map(s => (
            <SpotlightRow
              key={s.id}
              spotlight={s}
              label={t(SPOTLIGHT_I18N[s.id] || s.label)}
              isDark={isDark}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  )
}
