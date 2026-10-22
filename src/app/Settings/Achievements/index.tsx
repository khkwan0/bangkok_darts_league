import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {useAchievements} from '@/hooks/useAchievements'
import type {
  AchievementItem,
  PlayerAchievements,
  RecentAchievementUnlock,
} from '@/types/achievements'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {Stack, router} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View as RNView,
} from 'react-native'

const TIER_COLOR: Record<string, string> = {
  bronze: '#B45309',
  silver: '#94A3B8',
  gold: '#EAB308',
  platinum: '#22D3EE',
}

type ViewMode = 'mine' | 'league'

function pickLocalized(
  labels: {en: string; th: string},
  lang: string,
): string {
  return lang.startsWith('th') ? labels.th : labels.en
}

function formatAwardedAt(iso: string, lang: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(lang.startsWith('th') ? 'th-TH' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  const {t} = useTranslation()
  return (
    <RNView className="mb-4 flex-row overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      {(
        [
          ['mine', t('achievements_view_mine')],
          ['league', t('achievements_view_league')],
        ] as const
      ).map(([value, label]) => {
        const active = mode === value
        return (
          <Pressable
            key={value}
            onPress={() => onChange(value)}
            className="flex-1 items-center px-3 py-2.5"
            style={{
              backgroundColor: active ? 'rgba(234,179,8,0.22)' : 'transparent',
            }}>
            <Text
              className="text-sm font-semibold"
              style={{opacity: active ? 1 : 0.55}}>
              {label}
            </Text>
          </Pressable>
        )
      })}
    </RNView>
  )
}

function AchievementRow({
  item,
  lang,
  locked,
  expanded,
  onPress,
}: {
  item: AchievementItem
  lang: string
  locked: boolean
  expanded: boolean
  onPress: () => void
}) {
  const {t} = useTranslation()
  const color = TIER_COLOR[item.tier] ?? TIER_COLOR.bronze
  const name = pickLocalized(item.name, lang)
  const description = pickLocalized(item.description, lang)
  const icon = (item.icon ||
    (item.kind === 'trophy' ? 'trophy' : 'medal')) as React.ComponentProps<
    typeof MCI
  >['name']

  return (
    <Pressable
      onPress={onPress}
      className="mb-2 overflow-hidden rounded-xl border px-3 py-3"
      style={{
        borderColor: locked ? '#33415555' : `${color}66`,
        backgroundColor: locked ? 'rgba(148,163,184,0.06)' : `${color}14`,
        opacity: locked ? 0.72 : 1,
      }}>
      <RNView className="flex-row items-center">
        <RNView
          className="mr-3 h-11 w-11 items-center justify-center rounded-full"
          style={{
            backgroundColor: locked ? 'rgba(100,116,139,0.2)' : `${color}22`,
          }}>
          <MCI
            name={locked ? 'lock-outline' : icon}
            size={22}
            color={locked ? '#64748B' : color}
          />
        </RNView>
        <RNView className="flex-1 min-w-0">
          <Text className="font-bold" numberOfLines={1}>
            {name}
          </Text>
          <Text className="mt-0.5 text-xs opacity-60 capitalize">
            {item.kind === 'trophy'
              ? t('achievement_trophy')
              : t('achievement_badge')}
            {' · '}
            {item.tier}
            {item.silly ? ` · ${t('achievement_fun')}` : ''}
          </Text>
        </RNView>
        <MCI
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#94A3B8"
        />
      </RNView>
      {expanded ? (
        <RNView className="mt-2 pl-14">
          <Text className="text-sm opacity-80 leading-5">{description}</Text>
          {item.awardedAt ? (
            <Text className="mt-1 text-xs opacity-50">
              {t('achievement_earned')}{' '}
              {new Date(item.awardedAt).toLocaleDateString()}
            </Text>
          ) : null}
        </RNView>
      ) : null}
    </Pressable>
  )
}

function UnlockRow({
  item,
  lang,
}: {
  item: RecentAchievementUnlock
  lang: string
}) {
  const {t} = useTranslation()
  const color = item.tier ? TIER_COLOR[item.tier] ?? TIER_COLOR.bronze : '#94A3B8'
  const name = pickLocalized(item.achievementName, lang)
  const icon = (item.icon ||
    (item.kind === 'trophy' ? 'trophy' : 'medal')) as React.ComponentProps<
    typeof MCI
  >['name']

  return (
    <Pressable
      onPress={() => {
        router.push({
          pathname: '/Settings/Players/PlayerInfo',
          params: {params: JSON.stringify({playerId: item.playerId})},
        })
      }}
      className="mb-2 overflow-hidden rounded-xl border px-3 py-3"
      style={{
        borderColor: `${color}66`,
        backgroundColor: `${color}14`,
      }}>
      <RNView className="flex-row items-center">
        <RNView
          className="mr-3 h-11 w-11 items-center justify-center rounded-full"
          style={{backgroundColor: `${color}22`}}>
          <MCI name={icon} size={22} color={color} />
        </RNView>
        <RNView className="flex-1 min-w-0">
          <Text className="font-bold" numberOfLines={1}>
            {item.playerNickname}
          </Text>
          <Text className="mt-0.5 text-sm opacity-80" numberOfLines={1}>
            {name}
          </Text>
          <Text className="mt-0.5 text-xs opacity-50 capitalize">
            {item.kind === 'trophy'
              ? t('achievement_trophy')
              : item.kind === 'badge'
                ? t('achievement_badge')
                : t('achievements')}
            {item.tier ? ` · ${item.tier}` : ''}
            {item.silly ? ` · ${t('achievement_fun')}` : ''}
            {' · '}
            {formatAwardedAt(item.awardedAt, lang)}
          </Text>
        </RNView>
        <MCI name="chevron-right" size={20} color="#94A3B8" />
      </RNView>
    </Pressable>
  )
}

export default function AchievementsScreen() {
  const {t, i18n} = useTranslation()
  const {state} = useLeagueContext()
  const {getPlayerAchievements, getRecentUnlocks} = useAchievements()
  const [viewMode, setViewMode] = React.useState<ViewMode>('mine')
  const [data, setData] = React.useState<PlayerAchievements | null>(null)
  const [unlocks, setUnlocks] = React.useState<RecentAchievementUnlock[] | null>(
    null,
  )
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [expandedCode, setExpandedCode] = React.useState<string | null>(null)
  const [sortMode, setSortMode] = React.useState<'default' | 'newest'>(
    'newest',
  )
  const lang = i18n.language || 'en'
  const playerId = Number(state.user?.id) || 0

  const unlockedSorted = React.useMemo(() => {
    const list = data?.unlocked ?? []
    if (sortMode !== 'newest') return list
    return [...list].sort((a, b) => {
      const aTime = a.awardedAt ? new Date(a.awardedAt).getTime() : 0
      const bTime = b.awardedAt ? new Date(b.awardedAt).getTime() : 0
      return bTime - aTime
    })
  }, [data?.unlocked, sortMode])

  const loadMine = React.useCallback(async () => {
    if (!playerId) {
      setData(null)
      setError(null)
      setLoading(false)
      setRefreshing(false)
      return
    }
    try {
      setError(null)
      const result = await getPlayerAchievements(playerId)
      setData(result)
      if (!result) {
        setError(t('achievements_load_failed'))
      }
    } catch (e) {
      console.error(e)
      setError(t('achievements_load_failed'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [getPlayerAchievements, playerId, t])

  const loadLeague = React.useCallback(async () => {
    try {
      setError(null)
      const result = await getRecentUnlocks()
      setUnlocks(result?.unlocks ?? null)
      if (!result) {
        setError(t('achievements_load_failed'))
      }
    } catch (e) {
      console.error(e)
      setError(t('achievements_load_failed'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [getRecentUnlocks, t])

  React.useEffect(() => {
    setLoading(true)
    setError(null)
    if (viewMode === 'mine') {
      void loadMine()
    } else {
      void loadLeague()
    }
  }, [viewMode, loadMine, loadLeague])

  const toggle = (code: string) => {
    setExpandedCode(prev => (prev === code ? null : code))
  }

  const onRefresh = () => {
    setRefreshing(true)
    if (viewMode === 'mine') {
      void loadMine()
    } else {
      void loadLeague()
    }
  }

  return (
    <View className="flex-1">
      <Stack.Screen options={{title: t('achievements')}} />
      {loading ? (
        <RNView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="mt-3 opacity-60">{t('loading')}</Text>
        </RNView>
      ) : error ? (
        <RNView className="flex-1 px-4 pt-4">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <RNView className="flex-1 items-center justify-center px-4">
            <Text className="text-center opacity-70">{error}</Text>
            <Pressable onPress={onRefresh} className="mt-4">
              <Text className="font-bold text-sky-500">{t('retry')}</Text>
            </Pressable>
          </RNView>
        </RNView>
      ) : viewMode === 'league' ? (
        <FlatList
          data={unlocks ?? []}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{padding: 16, paddingBottom: 32, flexGrow: 1}}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <RNView>
              <ViewModeToggle mode={viewMode} onChange={setViewMode} />
              <RNView className="mb-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                <RNView className="flex-row items-center">
                  <MCI name="account-group" size={22} color="#EAB308" />
                  <Text type="subtitle" className="ml-2">
                    {t('achievements_league_title')}
                  </Text>
                </RNView>
                <Text className="mt-1 text-sm opacity-60">
                  {t('achievements_league_subtitle', {
                    count: unlocks?.length ?? 0,
                  })}
                </Text>
              </RNView>
            </RNView>
          }
          ListEmptyComponent={
            <Text className="mt-2 text-sm opacity-60">
              {t('achievements_league_empty')}
            </Text>
          }
          renderItem={({item}) => <UnlockRow item={item} lang={lang} />}
        />
      ) : !playerId ? (
        <RNView className="flex-1 px-4 pt-4">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <RNView className="flex-1 items-center justify-center px-4">
            <MCI name="trophy-outline" size={40} color="#94A3B8" />
            <Text className="mt-3 text-center opacity-70">
              {t('achievements_login_required')}
            </Text>
          </RNView>
        </RNView>
      ) : (
        <ScrollView
          contentContainerStyle={{padding: 16, paddingBottom: 32}}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />

          <RNView className="mb-4 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <RNView className="flex-row items-center justify-between">
              <RNView className="flex-row items-center">
                <MCI name="trophy-variant" size={22} color="#EAB308" />
                <Text type="subtitle" className="ml-2">
                  {t('achievements')}
                </Text>
              </RNView>
              <Text className="font-bold">
                {data?.counts.total ?? 0}/{data?.counts.available ?? 0}
              </Text>
            </RNView>
            <Text className="mt-1 text-sm opacity-60">
              {t('achievements_progress', {
                badges: data?.counts.badges ?? 0,
                trophies: data?.counts.trophies ?? 0,
              })}
            </Text>
          </RNView>

          {(data?.unlocked?.length ?? 0) > 0 ? (
            <>
              <RNView className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase tracking-wide opacity-50">
                  {t('achievements_earned')}
                </Text>
                <RNView className="flex-row overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  {(
                    [
                      ['newest', t('achievements_sort_newest')],
                      ['default', t('achievements_sort_default')],
                    ] as const
                  ).map(([mode, label]) => {
                    const active = sortMode === mode
                    return (
                      <Pressable
                        key={mode}
                        onPress={() => setSortMode(mode)}
                        className="px-2.5 py-1"
                        style={{
                          backgroundColor: active
                            ? 'rgba(234,179,8,0.2)'
                            : 'transparent',
                        }}>
                        <Text
                          className="text-xs font-semibold"
                          style={{opacity: active ? 1 : 0.55}}>
                          {label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </RNView>
              </RNView>
              {unlockedSorted.map(item => (
                <AchievementRow
                  key={item.code}
                  item={item}
                  lang={lang}
                  locked={false}
                  expanded={expandedCode === item.code}
                  onPress={() => toggle(item.code)}
                />
              ))}
            </>
          ) : (
            <Text className="mb-4 text-sm opacity-60">
              {t('achievements_empty')}
            </Text>
          )}

          {(data?.locked?.length ?? 0) > 0 ? (
            <>
              <Text className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide opacity-50">
                {t('achievements_locked')}
              </Text>
              {data!.locked.map(item => (
                <AchievementRow
                  key={item.code}
                  item={item}
                  lang={lang}
                  locked
                  expanded={expandedCode === item.code}
                  onPress={() => toggle(item.code)}
                />
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  )
}
