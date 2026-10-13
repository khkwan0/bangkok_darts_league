import config from '@/config'
import {useWeeklyHighlights} from '@/hooks/useWeeklyHighlights'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import {MaterialIcons} from '@expo/vector-icons'
import {router} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  useColorScheme,
} from 'react-native'
import type {
  HighlightDivisionOption,
  HighlightGameTypeOption,
  HighlightTeamOption,
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

function shiftWeek(weekStart: string, deltaWeeks: number): string {
  const [y, m, d] = weekStart.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, 12))
  utc.setUTCDate(utc.getUTCDate() + deltaWeeks * 7)
  return utc.toISOString().slice(0, 10)
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

function medalFor(index: number): string | null {
  if (index === 0) return '🥇'
  if (index === 1) return '🥈'
  if (index === 2) return '🥉'
  return null
}

function openPlayer(playerId: number) {
  router.push({
    pathname: '/statistics/PlayerStatistics/Player' as any,
    params: {params: JSON.stringify({playerId})},
  })
}

function Chip({
  label,
  active,
  onPress,
  isDark,
}: {
  label: string
  active: boolean
  onPress: () => void
  isDark: boolean
}) {
  const muted = isDark ? '#B0B0B0' : '#666666'
  return (
    <Pressable
      onPress={onPress}
      style={{
        marginRight: 6,
        marginBottom: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
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
          color: active ? (isDark ? '#1A1A1A' : '#FFFFFF') : muted,
        }}>
        {label}
      </Text>
    </Pressable>
  )
}

function Avatar({
  player,
  size = 48,
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

function SpotlightCard({
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
        width: 156,
        marginRight: 10,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: chipBorder,
        backgroundColor: chipBg,
      }}>
      <Text style={{fontSize: 11, color: muted, fontWeight: '700'}}>
        {label}
      </Text>
      <View
        className="flex-row items-center"
        style={{marginTop: 8, gap: 8, backgroundColor: 'transparent'}}>
        <Avatar player={spotlight.player} size={40} isDark={isDark} />
        <View style={{flex: 1, backgroundColor: 'transparent'}}>
          <Text
            style={{fontWeight: '700', color: primary}}
            numberOfLines={1}>
            {spotlight.player.nickname}
          </Text>
          <Text style={{fontSize: 12, color: muted}} numberOfLines={1}>
            {spotlight.detail}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

export default function HighlightsExplorer() {
  const {t} = useTranslation()
  const {getWeeklyHighlights} = useWeeklyHighlights()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const contentStyle = useTabListContentContainerStyle({
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5',
  })

  const [weekDate, setWeekDate] = React.useState<string | null>(null)
  const [gameType, setGameType] = React.useState('all')
  const [divisionId, setDivisionId] = React.useState<number | null>(null)
  const [teamId, setTeamId] = React.useState<number | null>(null)
  const [data, setData] = React.useState<WeeklyHighlights | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  const muted = isDark ? '#B0B0B0' : '#666666'
  const primary = isDark ? '#F5F5F5' : '#1A1A1A'
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF'
  const border = isDark ? '#3A3A3A' : '#E0E0E0'

  const load = React.useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)
      try {
        const res = await getWeeklyHighlights({
          date: weekDate,
          gameType,
          divisionId,
          teamId,
          includeCandidates: true,
        })
        setData(res)
        if (res?.weekStart && !weekDate) {
          setWeekDate(res.weekStart)
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [getWeeklyHighlights, weekDate, gameType, divisionId, teamId],
  )

  React.useEffect(() => {
    void load('initial')
  }, [load])

  const gameTypes: HighlightGameTypeOption[] =
    (data?.gameTypes?.length ?? 0) > 0
      ? data!.gameTypes
      : [{code: 'all', label: 'All'}]
  const divisions: HighlightDivisionOption[] = data?.divisions ?? []
  const teams: HighlightTeamOption[] = data?.teams ?? []
  const potw = data?.playerOfTheWeek
  const candidates = data?.candidates ?? []

  const canGoNext = React.useMemo(() => {
    if (!data?.weekStart) return false
    const next = shiftWeek(data.weekStart, 1)
    // Don't step into the in-progress Bangkok week.
    const today = new Date()
    const bangkok = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(today)
    const [y, m, d] = bangkok.split('-').map(Number)
    const utc = new Date(Date.UTC(y, m - 1, d, 12))
    const day = utc.getUTCDay()
    const daysFromMonday = day === 0 ? 6 : day - 1
    utc.setUTCDate(utc.getUTCDate() - daysFromMonday - 7)
    const latestAllowed = utc.toISOString().slice(0, 10)
    return next <= latestAllowed
  }, [data?.weekStart])

  return (
    <ScrollView
      contentContainerStyle={contentStyle}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load('refresh')}
        />
      }>
      <View className="mx-4 mb-3" style={{backgroundColor: 'transparent'}}>
        <Text style={{color: muted}}>{t('highlights_subtitle')}</Text>
      </View>

      <View
        className="mx-4 mb-3 flex-row items-center justify-between rounded-xl px-3 py-2"
        style={{backgroundColor: cardBg, borderWidth: 1, borderColor: border}}>
        <Pressable
          hitSlop={8}
          onPress={() => {
            if (!data?.weekStart) return
            setWeekDate(shiftWeek(data.weekStart, -1))
          }}
          style={{padding: 6}}>
          <MaterialIcons name="chevron-left" size={28} color={primary} />
        </Pressable>
        <View style={{alignItems: 'center', backgroundColor: 'transparent'}}>
          <Text style={{fontSize: 12, color: muted, fontWeight: '600'}}>
            {t('highlight_week')}
          </Text>
          <Text style={{fontWeight: '700', color: primary}}>
            {data
              ? `${formatWeekDay(data.weekStart)} – ${formatWeekDay(data.weekEnd)}`
              : '—'}
          </Text>
        </View>
        <Pressable
          hitSlop={8}
          disabled={!canGoNext}
          onPress={() => {
            if (!data?.weekStart || !canGoNext) return
            setWeekDate(shiftWeek(data.weekStart, 1))
          }}
          style={{padding: 6, opacity: canGoNext ? 1 : 0.35}}>
          <MaterialIcons name="chevron-right" size={28} color={primary} />
        </Pressable>
      </View>

      <View className="mx-4 mb-2" style={{backgroundColor: 'transparent'}}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: muted,
            marginBottom: 6,
          }}>
          {t('game_type')}
        </Text>
        <View className="flex-row flex-wrap" style={{backgroundColor: 'transparent'}}>
          {gameTypes.map(opt => (
            <Chip
              key={opt.code}
              label={
                opt.code === 'all' ? t('weekly_highlights_all') : opt.label
              }
              active={(data?.gameType || gameType) === opt.code}
              onPress={() => {
                setGameType(opt.code)
                setTeamId(null)
              }}
              isDark={isDark}
            />
          ))}
        </View>
      </View>

      {divisions.length > 0 ? (
        <View className="mx-4 mb-2" style={{backgroundColor: 'transparent'}}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: muted,
              marginBottom: 6,
            }}>
            {t('division')}
          </Text>
          <View
            className="flex-row flex-wrap"
            style={{backgroundColor: 'transparent'}}>
            <Chip
              label={t('weekly_highlights_all')}
              active={divisionId == null}
              onPress={() => {
                setDivisionId(null)
                setTeamId(null)
              }}
              isDark={isDark}
            />
            {divisions.map(d => (
              <Chip
                key={d.id}
                label={d.name}
                active={divisionId === d.id}
                onPress={() => {
                  setDivisionId(d.id)
                  setTeamId(null)
                }}
                isDark={isDark}
              />
            ))}
          </View>
        </View>
      ) : null}

      {teams.length > 0 ? (
        <View className="mx-4 mb-3" style={{backgroundColor: 'transparent'}}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: muted,
              marginBottom: 6,
            }}>
            {t('team')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip
              label={t('weekly_highlights_all')}
              active={teamId == null}
              onPress={() => setTeamId(null)}
              isDark={isDark}
            />
            {teams.map(team => (
              <Chip
                key={team.id}
                label={team.shortName || team.name}
                active={teamId === team.id}
                onPress={() => setTeamId(team.id)}
                isDark={isDark}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {loading && !data ? (
        <View className="items-center py-16">
          <ActivityIndicator size="large" />
        </View>
      ) : !potw ? (
        <View
          className="mx-4 rounded-xl p-5"
          style={{backgroundColor: cardBg, borderWidth: 1, borderColor: border}}>
          <Text style={{color: muted, textAlign: 'center'}}>
            {t('highlights_empty')}
          </Text>
        </View>
      ) : (
        <>
          <Pressable
            onPress={() => openPlayer(potw.playerId)}
            className="mx-4 mb-3 rounded-2xl p-4"
            style={{
              backgroundColor: isDark ? '#2A102F' : '#F3E8F5',
              borderWidth: 1,
              borderColor: isDark ? '#5A2A62' : '#E4C8EA',
              opacity: loading ? 0.7 : 1,
            }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: isDark ? '#E8C6F0' : '#37003C',
                letterSpacing: 0.4,
              }}>
              {t('player_of_the_week').toUpperCase()}
            </Text>
            <View
              className="flex-row items-center"
              style={{marginTop: 12, gap: 14, backgroundColor: 'transparent'}}>
              <Avatar player={potw} size={72} isDark={isDark} />
              <View style={{flex: 1, backgroundColor: 'transparent'}}>
                <Text
                  style={{fontSize: 22, fontWeight: '800', color: primary}}
                  numberOfLines={1}>
                  {potw.nickname}
                </Text>
                {potw.team ? (
                  <Text style={{color: muted}} numberOfLines={1}>
                    {potw.team.shortName || potw.team.name}
                  </Text>
                ) : null}
                <Text
                  style={{
                    marginTop: 4,
                    fontWeight: '700',
                    color: isDark ? '#E8C6F0' : '#37003C',
                  }}>
                  {potw.won}–{potw.lost}
                  {potw.played > 0 ? ` · ${potw.winPct}%` : ''}
                </Text>
              </View>
            </View>
          </Pressable>

          {data.spotlights.length > 0 ? (
            <View className="mb-3" style={{backgroundColor: 'transparent'}}>
              <Text
                className="mx-4 mb-2"
                style={{fontSize: 14, fontWeight: '800', color: primary}}>
                {t('highlight_spotlights')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{paddingHorizontal: 16}}>
                {data.spotlights.map(s => (
                  <SpotlightCard
                    key={s.id}
                    spotlight={s}
                    label={t(SPOTLIGHT_I18N[s.id] || s.label)}
                    isDark={isDark}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {candidates.length > 0 ? (
            <View
              className="mx-4 rounded-2xl overflow-hidden"
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: border,
              }}>
              <View className="px-4 py-3" style={{backgroundColor: 'transparent'}}>
                <Text style={{fontSize: 14, fontWeight: '800', color: primary}}>
                  {t('highlight_week_board')}
                </Text>
                <Text style={{fontSize: 12, color: muted, marginTop: 2}}>
                  {t('highlight_week_board_hint')}
                </Text>
              </View>
              {candidates.slice(0, 20).map((player, index) => {
                const medal = medalFor(index)
                return (
                  <Pressable
                    key={player.playerId}
                    onPress={() => openPlayer(player.playerId)}
                    className="flex-row items-center px-4 py-3"
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: border,
                      backgroundColor: 'transparent',
                      gap: 10,
                    }}>
                    <Text
                      style={{
                        width: 28,
                        textAlign: 'center',
                        fontWeight: '800',
                        color: primary,
                      }}>
                      {medal || `${index + 1}`}
                    </Text>
                    <Avatar player={player} size={40} isDark={isDark} />
                    <View style={{flex: 1, backgroundColor: 'transparent'}}>
                      <Text
                        style={{fontWeight: '700', color: primary}}
                        numberOfLines={1}>
                        {player.nickname}
                      </Text>
                      <Text style={{fontSize: 12, color: muted}} numberOfLines={1}>
                        {player.team?.shortName ||
                          player.team?.name ||
                          t('unattached')}
                      </Text>
                    </View>
                    <View style={{alignItems: 'flex-end', backgroundColor: 'transparent'}}>
                      <Text style={{fontWeight: '800', color: primary}}>
                        {player.won}–{player.lost}
                      </Text>
                      <Text style={{fontSize: 12, color: muted}}>
                        {player.winPct}%
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  )
}
