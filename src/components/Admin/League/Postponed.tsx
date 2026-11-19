import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {useLeague} from '@/hooks'
import {useNetwork} from '@/hooks/useNetwork'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {
  buildPostponedAnnouncement,
  type PostponedAnnouncementMatch,
} from '@/lib/postponedAnnouncement'
import {useFocusEffect, useNavigation, useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Share,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'

type PostponedKind = 'league' | 'cup'

type PostponedMatch = PostponedAnnouncementMatch & {
  date: string | Date
  original_date?: string | Date | null
  division_name?: string | null
  postponed_by_name?: string | null
}

function toYmd(date: string | Date): string {
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
  }
  const dateObj = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(dateObj.getTime())) return ''
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${dateObj.getFullYear()}-${month}-${day}`
}

function formatDate(date: string | Date): string {
  const ymd = toYmd(date)
  if (!ymd) return String(date)
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function hasRescheduledDate(match: PostponedMatch): boolean {
  if (match.original_date == null || match.original_date === '') return false
  return toYmd(match.original_date) !== toYmd(match.date)
}

function matchInfoFromResponse(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== 'object') return null
  const body = res as Record<string, unknown>
  if (body.status === 'ok' && body.data && typeof body.data === 'object') {
    return body.data as Record<string, unknown>
  }
  if (body.match_id || body.id) return body
  return null
}

function ViewChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      className={`rounded-full px-3 py-1.5 ${
        active ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}>
      <Text className={`text-sm font-medium ${active ? 'text-white' : ''}`}>
        {label}
      </Text>
    </Pressable>
  )
}

export default function AdminLeaguePostponed() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const muted = isDark ? '#9CA3AF' : '#6B7280'
  const inputClass =
    'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100'
  const {state} = useLeagueContext()
  const network = useNetwork()
  const league = useLeague()
  const networkRef = React.useRef(network)
  networkRef.current = network

  const [kind, setKind] = React.useState<PostponedKind>('league')
  const [matches, setMatches] = React.useState<PostponedMatch[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [openingId, setOpeningId] = React.useState<number | null>(null)
  const [draftByKind, setDraftByKind] = React.useState<
    Record<PostponedKind, string>
  >({
    league: '',
    cup: '',
  })
  const [dirtyByKind, setDirtyByKind] = React.useState<
    Record<PostponedKind, boolean>
  >({
    league: false,
    cup: false,
  })
  React.useEffect(() => {
    navigation.setOptions({title: t('admin_league_postponed')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings' as any)
    }
  }, [router, state.user])

  const dirtyRef = React.useRef(dirtyByKind)
  dirtyRef.current = dirtyByKind

  const applyGeneratedText = React.useCallback(
    (view: PostponedKind, rows: PostponedMatch[], force = false) => {
      if (!force && dirtyRef.current[view]) return
      const nextText = buildPostponedAnnouncement(rows, view)
      setDraftByKind(draft => ({...draft, [view]: nextText}))
      if (force) {
        setDirtyByKind(prev => ({...prev, [view]: false}))
      }
    },
    [],
  )

  const load = React.useCallback(
    async (view: PostponedKind, opts?: {forceText?: boolean}) => {
      setError(null)
      const path =
        view === 'cup'
          ? '/matches/postponed?view=cup'
          : '/matches/postponed'
      const res = await networkRef.current.Get(path)
      if (Array.isArray(res)) {
        const rows = res as PostponedMatch[]
        setMatches(rows)
        applyGeneratedText(view, rows, opts?.forceText === true)
        return
      }
      setMatches([])
      applyGeneratedText(view, [], opts?.forceText === true)
      setError(t('admin_league_load_failed'))
    },
    [applyGeneratedText, t],
  )

  useFocusEffect(
    React.useCallback(() => {
      let active = true
      ;(async () => {
        setLoading(true)
        await load(kind)
        if (active) setLoading(false)
      })()
      return () => {
        active = false
      }
    }, [kind, load]),
  )

  async function onRefresh() {
    setRefreshing(true)
    await load(kind, {forceText: !dirtyByKind[kind]})
    setRefreshing(false)
  }

  function resetAnnouncement() {
    const text = buildPostponedAnnouncement(matches, kind)
    setDraftByKind(prev => ({...prev, [kind]: text}))
    setDirtyByKind(prev => ({...prev, [kind]: false}))
  }

  async function shareAnnouncement() {
    const message = draftByKind[kind]?.trim()
    if (!message) return
    try {
      await Share.share({message})
    } catch {
      // user dismissed share sheet
    }
  }

  async function openMatch(matchId: number) {
    if (openingId) return
    setOpeningId(matchId)
    try {
      // @ts-expect-error runtime method
      const res = await league.GetMatchById(matchId)
      const matchInfo = matchInfoFromResponse(res)
      if (matchInfo) {
        router.push({
          pathname: '/Match',
          params: {params: JSON.stringify(matchInfo)},
        })
      }
    } finally {
      setOpeningId(null)
    }
  }

  function postponedByLabel(match: PostponedMatch): string | null {
    const name = match.postponed_by_name?.trim()
    if (!name || !(match.postponed_by && match.postponed_by > 0)) return null
    const team =
      match.postponed_by_team_short_name?.trim() ||
      match.postponed_by_team_name?.trim() ||
      ''
    if (team) {
      return t('postponed_by_player', {name, team})
    }
    return t('postponed_by_player_no_team', {name})
  }

  if (!isLeagueAdmin(state.user)) {
    return null
  }

  const draft = draftByKind[kind]

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <View className="border-b border-gray-200 px-4 pb-3 pt-3 dark:border-gray-800">
        <View className="mb-2 flex-row flex-wrap gap-2">
          <ViewChip
            label={t('admin_league_postponed_league')}
            active={kind === 'league'}
            onPress={() => setKind('league')}
          />
          <ViewChip
            label={t('admin_league_postponed_cup')}
            active={kind === 'cup'}
            onPress={() => setKind('cup')}
          />
        </View>
        {!loading && !error ? (
          <Text className="mb-2 text-sm" style={{color: muted}}>
            {matches.length === 0
              ? t('admin_league_postponed_empty')
              : t('admin_league_postponed_count', {count: matches.length})}
          </Text>
        ) : null}
        {error ? (
          <Text className="mb-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </Text>
        ) : null}

        <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t('admin_league_postponed_announcement')}
        </Text>
        <TextInput
          className={`${inputClass} min-h-[220px]`}
          value={draft}
          onChangeText={text => {
            setDraftByKind(prev => ({...prev, [kind]: text}))
            setDirtyByKind(prev => ({...prev, [kind]: true}))
          }}
          multiline
          textAlignVertical="top"
          editable={!loading}
          autoCorrect={false}
          spellCheck={false}
        />
        <View className="mt-2 flex-row flex-wrap gap-2">
          <Pressable
            onPress={resetAnnouncement}
            disabled={loading}
            className="rounded-full bg-gray-200 px-3 py-1.5 dark:bg-gray-700">
            <Text className="text-sm font-medium">
              {t('admin_league_postponed_reset')}
            </Text>
          </Pressable>
          <Pressable
            onPress={shareAnnouncement}
            disabled={loading || !draft.trim()}
            className="rounded-full bg-blue-600 px-3 py-1.5">
            <Text className="text-sm font-medium text-white">
              {t('admin_league_postponed_share')}
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => String(item.id)}
          contentContainerClassName="p-4 pb-10"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-base" style={{color: muted}}>
                {t('admin_league_postponed_all_on_schedule')}
              </Text>
            </View>
          }
          renderItem={({item}) => {
            const byLine = postponedByLabel(item)
            const originalDate = item.original_date ?? item.date
            const rescheduled = hasRescheduledDate(item)
            const busy = openingId === item.id
            return (
              <Pressable
                onPress={() => openMatch(item.id)}
                disabled={busy}
                className="mb-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                {item.division_name ? (
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                    {item.division_name}
                  </Text>
                ) : null}
                <Text className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
                  {item.home_team_name} vs {item.away_team_name}
                </Text>
                <Text className="text-sm" style={{color: muted}}>
                  {t('admin_league_postponed_originally', {
                    date: formatDate(originalDate),
                  })}
                </Text>
                {rescheduled ? (
                  <Text className="mt-0.5 text-sm" style={{color: muted}}>
                    {t('admin_league_postponed_rescheduled', {
                      date: formatDate(item.date),
                    })}
                  </Text>
                ) : null}
                {byLine ? (
                  <Text className="mt-0.5 text-sm" style={{color: muted}}>
                    {byLine}
                  </Text>
                ) : null}
                {busy ? (
                  <View className="mt-2">
                    <ActivityIndicator size="small" />
                  </View>
                ) : null}
              </Pressable>
            )
          }}
        />
      )}
    </View>
  )
}
