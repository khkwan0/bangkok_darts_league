import {formatForumDate} from '@/components/Forums/formatForumDate'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {
  releaseNoteClientScope,
  releaseNoteSportScope,
  useReleaseNotes,
  type ReleaseNote,
} from '@/hooks/useReleaseNotes'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useRouter} from 'expo-router'
import {useNavigation, useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {ActivityIndicator, FlatList, Pressable, RefreshControl, View as RNView} from 'react-native'

const PAGE_SIZE = 50

export default function ReleaseNotesScreen() {
  const {t, i18n} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const {colors} = useTheme()
  const {listPublic} = useReleaseNotes()
  const [items, setItems] = React.useState<ReleaseNote[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const requestRef = React.useRef(0)
  const pagingRef = React.useRef(false)

  React.useEffect(() => {
    navigation.setOptions({title: t('release_notes')})
  }, [navigation, t])

  const loadFirst = React.useCallback(async () => {
    const requestId = ++requestRef.current
    pagingRef.current = false
    try {
      setError(null)
      const result = await listPublic(1)
      if (requestId !== requestRef.current) return
      if (result.error) {
        setError(t('release_notes_load_error'))
        setItems([])
        setTotal(0)
      } else {
        setItems(result.items)
        setTotal(result.total)
      }
    } catch (e) {
      console.error(e)
      if (requestId !== requestRef.current) return
      setError(t('release_notes_load_error'))
      setItems([])
      setTotal(0)
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [listPublic, t])

  React.useEffect(() => {
    void loadFirst()
  }, [loadFirst])

  const loadMore = React.useCallback(async () => {
    if (pagingRef.current || loading || items.length === 0 || items.length >= total) return
    pagingRef.current = true
    const requestId = requestRef.current
    const nextPage = Math.floor(items.length / PAGE_SIZE) + 1
    setLoadingMore(true)
    try {
      const result = await listPublic(nextPage)
      if (requestId !== requestRef.current) return
      if (!result.error) {
        setItems(current => {
          const seen = new Set(current.map(item => item.id))
          return [...current, ...result.items.filter(item => !seen.has(item.id))]
        })
        setTotal(result.total)
      }
    } catch (e) {
      console.error(e)
    } finally {
      if (requestId === requestRef.current) {
        pagingRef.current = false
        setLoadingMore(false)
      }
    }
  }, [items.length, listPublic, loading, total])

  const renderItem = React.useCallback(
    ({item}: {item: ReleaseNote}) => (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/Settings/ReleaseNotes/[id]',
            params: {id: String(item.id)},
          })
        }
        className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-gray-800/10 dark:border-slate-700">
        <RNView className="flex-row items-start px-4 py-3.5">
          <RNView className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-sky-500/15">
            <MCI name="text-box-outline" size={22} color="#0284C7" />
          </RNView>
          <RNView className="flex-1">
            <Text className="text-xs font-semibold uppercase opacity-60">
              {t(`release_notes_kind_${item.kind}`)}
              {' · '}
              {t(`release_notes_sport_${releaseNoteSportScope(item.audiences)}`)}
              {' · '}
              {t(`release_notes_client_${releaseNoteClientScope(item.audiences)}`)}
            </Text>
            <Text className="font-semibold">{item.title}</Text>
            {item.preview ? (
              <Text className="mt-1 text-sm opacity-60" numberOfLines={2}>
                {item.preview}
              </Text>
            ) : null}
            <Text className="mt-2 text-xs opacity-50">
              {formatForumDate(item.created_at, i18n.language)}
            </Text>
          </RNView>
          <MCI name="chevron-right" size={22} color={colors.text} style={{opacity: 0.4}} />
        </RNView>
      </Pressable>
    ),
    [colors.text, i18n.language, router, t],
  )

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <FlatList
      className="flex-1"
      data={error ? [] : items}
      keyExtractor={item => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={{flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24}}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={7}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void loadFirst()
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      ListEmptyComponent={
        error ? (
          <View className="flex-1 items-center justify-center px-6 py-12">
            <Text className="text-center text-red-500">{error}</Text>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center py-12">
            <MCI name="text-box-outline" size={48} color={colors.text} style={{opacity: 0.35}} />
            <Text className="mt-4 text-center opacity-60">{t('release_notes_empty')}</Text>
          </View>
        )
      }
      ListFooterComponent={
        !error && items.length < total ? (
          <Pressable
            onPress={() => void loadMore()}
            disabled={loadingMore}
            className="mb-4 items-center rounded-lg bg-sky-600 py-3">
            {loadingMore ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="font-semibold text-white">{t('release_notes_more')}</Text>
            )}
          </Pressable>
        ) : null
      }
    />
  )
}
