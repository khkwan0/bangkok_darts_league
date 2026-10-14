import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {useAchievements} from '@/hooks/useAchievements'
import type {AchievementItem, PlayerAchievements} from '@/types/achievements'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {Stack} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
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

function pickLocalized(
  labels: {en: string; th: string},
  lang: string,
): string {
  return lang.startsWith('th') ? labels.th : labels.en
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
          style={{backgroundColor: locked ? 'rgba(100,116,139,0.2)' : `${color}22`}}>
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

export default function AchievementsScreen() {
  const {t, i18n} = useTranslation()
  const {state} = useLeagueContext()
  const {getPlayerAchievements} = useAchievements()
  const [data, setData] = React.useState<PlayerAchievements | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [expandedCode, setExpandedCode] = React.useState<string | null>(null)
  const lang = i18n.language || 'en'
  const playerId = Number(state.user?.id) || 0

  const load = React.useCallback(async () => {
    if (!playerId) {
      setData(null)
      setError(null)
      setLoading(false)
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

  React.useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const toggle = (code: string) => {
    setExpandedCode(prev => (prev === code ? null : code))
  }

  return (
    <View className="flex-1">
      <Stack.Screen options={{title: t('achievements')}} />
      {!playerId ? (
        <RNView className="flex-1 items-center justify-center px-8">
          <MCI name="trophy-outline" size={40} color="#94A3B8" />
          <Text className="mt-3 text-center opacity-70">
            {t('achievements_login_required')}
          </Text>
        </RNView>
      ) : loading ? (
        <RNView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="mt-3 opacity-60">{t('loading')}</Text>
        </RNView>
      ) : error ? (
        <RNView className="flex-1 items-center justify-center px-8">
          <Text className="text-center opacity-70">{error}</Text>
          <Pressable onPress={() => void load()} className="mt-4">
            <Text className="font-bold text-sky-500">{t('retry')}</Text>
          </Pressable>
        </RNView>
      ) : (
        <ScrollView
          contentContainerStyle={{padding: 16, paddingBottom: 32}}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void load()
              }}
            />
          }>
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
              <Text className="mb-2 text-xs font-bold uppercase tracking-wide opacity-50">
                {t('achievements_earned')}
              </Text>
              {data!.unlocked.map(item => (
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
