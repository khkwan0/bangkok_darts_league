import {ThemedText as Text} from '@/components/ThemedText'
import Button from '@/components/Button'
import {
  useAdminLastSeen,
  type AdminLastSeenRow,
  type LastSeenRedisUsage,
} from '@/hooks/useAdminLastSeen'
import {usePreferredTimeZone} from '@/hooks/usePreferredTimeZone'
import {formatPreferredDateTime} from '@/lib/bangkokTime'
import {useFocusEffect, useNavigation} from 'expo-router'
import TrieSearch from 'trie-search'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'

type SortKey = 'last_seen' | 'name'
type SortDir = 'asc' | 'desc'
type SearchableRow = AdminLastSeenRow & {player_id_str: string}

function relativeTime(iso: string): string {
  const at = Date.parse(iso)
  if (!Number.isFinite(at)) return iso
  const sec = Math.max(0, Math.floor((Date.now() - at) / 1000))
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 14) return `${day}d ago`
  return ''
}

function compareRows(
  a: AdminLastSeenRow,
  b: AdminLastSeenRow,
  key: SortKey,
  dir: SortDir,
): number {
  const mul = dir === 'asc' ? 1 : -1
  if (key === 'last_seen') {
    const delta = Date.parse(a.last_seen_at) - Date.parse(b.last_seen_at)
    if (delta !== 0) return delta * mul
    return a.player_id - b.player_id
  }
  const an = (a.nickname || '').toLocaleLowerCase()
  const bn = (b.nickname || '').toLocaleLowerCase()
  const byName = an.localeCompare(bn)
  if (byName !== 0) return byName * mul
  return (a.player_id - b.player_id) * mul
}

function formatByteSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  const kb = bytes / 1024
  if (kb < 1024) {
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  }
  const mb = kb / 1024
  return `${mb < 10 ? mb.toFixed(2) : mb.toFixed(1)} MB`
}

function redisKeyLabel(key: string, t: (key: string) => string): string {
  if (key.endsWith(':last')) return t('admin_last_seen_redis_key_last')
  if (key.endsWith(':ios')) return t('admin_last_seen_platform_ios')
  if (key.endsWith(':android')) return t('admin_last_seen_platform_android')
  if (key.endsWith(':web')) return t('admin_last_seen_platform_web')
  return key
}

function SortChip({
  label,
  active,
  dir,
  onPress,
}: {
  label: string
  active: boolean
  dir: SortDir
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 py-1.5 ${
        active ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}>
      <Text className={`text-sm font-medium ${active ? 'text-white' : ''}`}>
        {label}
        {active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
      </Text>
    </Pressable>
  )
}

export default function AdminLastSeen() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const timeZone = usePreferredTimeZone()
  const {listLastSeen, flushLastSeen} = useAdminLastSeen()
  const isDark = (useColorScheme() ?? 'light') === 'dark'
  const muted = isDark ? '#94A3B8' : '#64748B'

  const [rows, setRows] = React.useState<AdminLastSeenRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [sortKey, setSortKey] = React.useState<SortKey>('last_seen')
  const [sortDir, setSortDir] = React.useState<SortDir>('desc')
  const [usage, setUsage] = React.useState<LastSeenRedisUsage | null>(null)
  const [canFlush, setCanFlush] = React.useState(false)
  const [flushing, setFlushing] = React.useState(false)
  const trie = React.useRef(
    new TrieSearch<SearchableRow>(
      ['nickname', 'firstname', 'lastname', 'player_id_str'],
      {idFieldOrFunction: 'player_id'},
    ),
  )

  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: t('admin_last_seen'),
    })
  }, [navigation, t])

  const rebuildTrie = React.useCallback((data: AdminLastSeenRow[]) => {
    const searchable: SearchableRow[] = data.map(row => ({
      ...row,
      player_id_str: String(row.player_id),
    }))
    trie.current = new TrieSearch<SearchableRow>(
      ['nickname', 'firstname', 'lastname', 'player_id_str'],
      {idFieldOrFunction: 'player_id'},
    )
    trie.current.addAll(searchable)
  }, [])

  const load = React.useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        setError('')
        const res = await listLastSeen()
        if (res.error) {
          setError(t('admin_last_seen_load_failed'))
          if (!isRefresh) {
            setRows([])
            rebuildTrie([])
            setUsage(null)
            setCanFlush(false)
          }
          return
        }
        setRows(res.data)
        rebuildTrie(res.data)
        setUsage(res.usage)
        setCanFlush(res.canFlush)
      } catch {
        setError(t('admin_last_seen_load_failed'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [listLastSeen, rebuildTrie, t],
  )

  function confirmFlush() {
    Alert.alert(
      t('admin_last_seen_flush_confirm_title'),
      t('admin_last_seen_flush_confirm_body'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('admin_last_seen_flush'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setFlushing(true)
                const res = await flushLastSeen()
                if (res.error) {
                  Alert.alert(
                    t('error'),
                    res.error === 'superadmin_required'
                      ? t('admin_last_seen_flush_forbidden')
                      : t('admin_last_seen_flush_failed'),
                  )
                  return
                }
                setRows([])
                rebuildTrie([])
                setUsage(res.usage)
                Alert.alert(t('admin_last_seen_flush_ok'))
              } catch {
                Alert.alert(t('error'), t('admin_last_seen_flush_failed'))
              } finally {
                setFlushing(false)
              }
            })()
          },
        },
      ],
    )
  }

  useFocusEffect(
    React.useCallback(() => {
      void load()
    }, [load]),
  )

  const visible = React.useMemo(() => {
    const trimmed = query.trim()
    const matched = trimmed ? trie.current.search(trimmed) : rows
    const copy = [...matched]
    copy.sort((a, b) => compareRows(a, b, sortKey, sortDir))
    return copy
  }, [query, rows, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(current => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'name' ? 'asc' : 'desc')
  }

  function platformLabel(platform: string) {
    if (platform === 'ios') return t('admin_last_seen_platform_ios')
    if (platform === 'android') return t('admin_last_seen_platform_android')
    return t('admin_last_seen_platform_web')
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View className="flex-1">
      <View className="px-4 pt-3 pb-2">
        <Text className="mb-2 text-sm" style={{color: muted}}>
          {t('admin_last_seen_help')}
        </Text>
        <View className="mb-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
          <Text className="text-xs font-semibold uppercase" style={{color: muted}}>
            {t('admin_last_seen_redis')}
          </Text>
          <Text className="mt-1 text-xl font-semibold">
            {formatByteSize(usage?.total_bytes)}
          </Text>
          {usage?.keys?.map(row => (
            <View
              key={row.key}
              className="mt-2 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-sm">{redisKeyLabel(row.key, t)}</Text>
                <Text className="text-xs" style={{color: muted}}>
                  {row.key}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-sm">{formatByteSize(row.bytes)}</Text>
                <Text className="text-xs" style={{color: muted}}>
                  {t('admin_last_seen_redis_fields', {count: row.fields})}
                </Text>
              </View>
            </View>
          ))}
          {canFlush ? (
            <View className="mt-3">
              <Button
                type="outline"
                small
                disabled={flushing}
                onPress={confirmFlush}>
                {flushing
                  ? 'admin_last_seen_flushing'
                  : 'admin_last_seen_flush'}
              </Button>
            </View>
          ) : null}
        </View>
        <View className="mb-3 flex-row items-center rounded-xl bg-gray-100 px-3 py-2 dark:bg-gray-800">
          <MCI name="magnify" size={20} color={muted} />
          <TextInput
            className="ml-2 flex-1 text-base text-slate-900 dark:text-slate-100"
            placeholder={t('admin_last_seen_search')}
            placeholderTextColor={muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
        <View className="flex-row gap-2">
          <SortChip
            label={t('admin_last_seen_sort_seen')}
            active={sortKey === 'last_seen'}
            dir={sortDir}
            onPress={() => toggleSort('last_seen')}
          />
          <SortChip
            label={t('admin_last_seen_sort_name')}
            active={sortKey === 'name'}
            dir={sortDir}
            onPress={() => toggleSort('name')}
          />
        </View>
      </View>
      {error ? (
        <Text className="px-4 pb-2 text-sm text-red-600">{error}</Text>
      ) : null}
      <FlatList
        data={visible}
        keyExtractor={item => String(item.player_id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
          />
        }
        contentContainerClassName="pb-10"
        ListEmptyComponent={
          <View className="items-center px-8 py-12">
            <MCI name="clock-outline" size={32} color={muted} />
            <Text className="mt-3 text-center" style={{color: muted}}>
              {query.trim()
                ? t('admin_last_seen_empty_search')
                : t('admin_last_seen_empty')}
            </Text>
          </View>
        }
        renderItem={({item}) => {
          const realName = [item.firstname, item.lastname]
            .filter(Boolean)
            .join(' ')
          const relative = relativeTime(item.last_seen_at)
          const platforms = (
            ['ios', 'android', 'web'] as Array<keyof typeof item.platforms>
          ).filter(platform => item.platforms[platform])
          if (platforms.length === 0) platforms.push(item.last_platform)
          return (
            <View className="mx-4 mb-2 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="font-semibold">
                    {item.nickname || `#${item.player_id}`}
                  </Text>
                  <Text className="text-xs" style={{color: muted}}>
                    #{item.player_id}
                    {realName ? ` · ${realName}` : ''}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-medium">
                    {relative || formatPreferredDateTime(item.last_seen_at, timeZone)}
                  </Text>
                  {relative ? (
                    <Text className="text-xs" style={{color: muted}}>
                      {formatPreferredDateTime(item.last_seen_at, timeZone)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View className="mt-2 flex-row flex-wrap gap-1.5">
                {platforms.map(platform => (
                  <View
                    key={platform}
                    className={`rounded-full px-2 py-0.5 ${
                      platform === item.last_platform
                        ? 'bg-blue-100 dark:bg-blue-900/40'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                    <Text
                      className={`text-xs ${
                        platform === item.last_platform ? 'font-semibold' : ''
                      }`}>
                      {platformLabel(platform)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )
        }}
      />
    </View>
  )
}
