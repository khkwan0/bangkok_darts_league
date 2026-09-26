import {formatForumDate, topicSlug} from '@/components/Forums/formatForumDate'
import {ForumIconBadge, ForumStatChip} from '@/components/Forums/ForumUiParts'
import {FORUM_STAT_COLORS, forumListCardStyle, getForumAccent} from '@/components/Forums/forumUi'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {useForums} from '@/hooks/useForums'
import {
  syncBoardSeenFromTopics,
  syncGlobalForumBadge,
  useTopicHasNewPosts,
} from '@/lib/forumActivity'
import type {ForumBoard, ForumTopicListItem} from '@/types/forums'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useTheme} from "expo-router/react-navigation"
import {useFocusEffect, useLocalSearchParams, useRouter, Stack} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  useColorScheme,
  View as RNView,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

function ForumNewTopicFab({onPress}: {onPress: () => void}) {
  const {t} = useTranslation()
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Pressable
      onPress={onPress}
      className="absolute right-4 flex-row items-center rounded-full px-5 py-3.5"
      style={{
        bottom: insets.bottom + 16,
        backgroundColor: '#2196F3',
        shadowColor: '#1565C0',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: isDark ? 0.4 : 0.28,
        shadowRadius: 8,
        elevation: 6,
      }}>
      <MCI name="plus" size={20} color="#fff" style={{marginRight: 8}} />
      <Text className="font-bold text-white">{t('forums_new_topic')}</Text>
    </Pressable>
  )
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function TopicRow({
  topic,
  accentIndex,
  onPress,
}: {
  topic: ForumTopicListItem
  accentIndex: number
  onPress: () => void
}) {
  const {t, i18n} = useTranslation()
  const {colors} = useTheme()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const accent = getForumAccent(accentIndex)
  const hasNewPosts = useTopicHasNewPosts(topic.id, topic.last_post_at)
  const rowIcon = topic.is_locked
    ? 'lock'
    : topic.is_pinned
      ? 'pin'
      : topic.has_poll
        ? 'poll'
        : 'comment-text-outline'

  return (
    <Pressable
      onPress={onPress}
      accessibilityHint={hasNewPosts ? t('forums_new_posts') : undefined}
      className="mb-3 overflow-hidden rounded-xl"
      style={forumListCardStyle(
        colors.card,
        isDark,
        topic.is_pinned ? 'rgba(233, 30, 99, 0.35)' : accent.border,
      )}>
      <RNView
        className="absolute bottom-0 left-0 top-0 w-0.5"
        style={{
          backgroundColor: topic.is_pinned
            ? FORUM_STAT_COLORS.pinned.fg
            : accent.fg,
        }}
      />
      <RNView className="flex-row items-start px-4 py-3.5 pl-5">
        <RNView className="relative">
          <ForumIconBadge
            icon={rowIcon}
            fg={topic.is_pinned ? FORUM_STAT_COLORS.pinned.fg : accent.fg}
            bg={topic.is_pinned ? FORUM_STAT_COLORS.pinned.bg : accent.bg}
          />
          {hasNewPosts ? (
            <RNView
              className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}
        </RNView>
        <RNView className="ml-3 flex-1">
          <RNView className="flex-row items-start justify-between">
            <Text className="flex-1 pr-2 text-base font-bold">{topic.title}</Text>
            {hasNewPosts ? (
              <RNView className="mr-2 mt-1 h-2.5 w-2.5 rounded-full bg-red-500" />
            ) : null}
            <MCI
              name="chevron-right"
              size={22}
              color={topic.is_pinned ? FORUM_STAT_COLORS.pinned.fg : accent.fg}
            />
          </RNView>
          <Text className="mt-1 text-sm font-medium" style={{color: accent.fg}}>
            {topic.author_name}
          </Text>
          <Text className="mt-0.5 text-xs opacity-60">
            {formatForumDate(topic.created_at, i18n.language)}
          </Text>
          <RNView className="mt-3 flex-row flex-wrap gap-2">
            {topic.is_pinned ? (
              <ForumStatChip
                icon="pin"
                label={t('forums_pinned')}
                fg={FORUM_STAT_COLORS.pinned.fg}
                bg={FORUM_STAT_COLORS.pinned.bg}
              />
            ) : null}
            {topic.is_locked ? (
              <ForumStatChip
                icon="lock"
                label={t('forums_locked_short')}
                fg={FORUM_STAT_COLORS.locked.fg}
                bg={FORUM_STAT_COLORS.locked.bg}
              />
            ) : null}
            <ForumStatChip
              icon="reply"
              label={t('forums_replies_count', {count: topic.reply_count})}
              fg={FORUM_STAT_COLORS.replies.fg}
              bg={FORUM_STAT_COLORS.replies.bg}
            />
            <ForumStatChip
              icon="eye-outline"
              label={t(
                topic.view_count === 1
                  ? 'forums_view_count'
                  : 'forums_views_count',
                {count: topic.view_count},
              )}
              fg={FORUM_STAT_COLORS.views.fg}
              bg={FORUM_STAT_COLORS.views.bg}
            />
          </RNView>
        </RNView>
      </RNView>
    </Pressable>
  )
}

export default function ForumTopics() {
  const {t} = useTranslation()
  const router = useRouter()
  const {colors} = useTheme()
  const {state} = useLeagueContext()
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const params = useLocalSearchParams<{
    categorySlug: string
    forumSlug: string
    forumName?: string
  }>()
  const {getTopics, getCategories} = useForums()

  const cat = firstParam(params.categorySlug)
  const forumKey = firstParam(params.forumSlug)
  const headerTitle = firstParam(params.forumName) ?? t('forums')

  const [forum, setForum] = React.useState<ForumBoard | null>(null)
  const [topics, setTopics] = React.useState<ForumTopicListItem[]>([])
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const forumRef = React.useRef(forum)
  const topicsRef = React.useRef(topics)
  forumRef.current = forum
  topicsRef.current = topics

  const syncBoardReadState = React.useCallback(async () => {
    const currentForum = forumRef.current
    const currentTopics = topicsRef.current
    if (!currentForum?.id || currentTopics.length === 0) {
      return
    }
    await syncBoardSeenFromTopics(
      currentForum.id,
      currentForum.last_post_at,
      currentTopics,
    )
    try {
      const categories = await getCategories()
      await syncGlobalForumBadge(categories)
    } catch (e) {
      console.error('Error syncing global forum badge:', e)
    }
  }, [getCategories])

  useFocusEffect(
    React.useCallback(() => {
      void syncBoardReadState()
      return () => {
        void syncBoardReadState()
      }
    }, [syncBoardReadState]),
  )

  React.useEffect(() => {
    void syncBoardReadState()
  }, [topics, syncBoardReadState])

  const loadPage = React.useCallback(
    async (pageNum: number, append = false) => {
      if (!cat || !forumKey) {
        setError(t('forums_load_error'))
        setLoading(false)
        setRefreshing(false)
        setLoadingMore(false)
        return
      }
      try {
        setError(null)
        const result = await getTopics(cat, forumKey, pageNum)
        if (!result.forum?.id && result.items.length === 0) {
          setError(t('forums_load_error'))
        }
        setForum(result.forum?.id ? result.forum : null)
        setTotalPages(result.total_pages)
        setPage(result.page)
        setTopics(prev =>
          append ? [...prev, ...result.items] : result.items,
        )
      } catch (e) {
        console.error(e)
        setError(t('forums_load_error'))
      } finally {
        setLoading(false)
        setRefreshing(false)
        setLoadingMore(false)
      }
    },
    [cat, forumKey, getTopics, t],
  )

  React.useEffect(() => {
    setLoading(true)
    loadPage(1)
  }, [cat, forumKey])

  function openTopic(topic: ForumTopicListItem) {
    if (!cat || !forumKey) return
    router.push({
      pathname: '/Settings/Forums/topic',
      params: {
        categorySlug: cat,
        forumSlug: forumKey,
        topicSlug: topicSlug(topic),
        title: topic.title,
      },
    })
  }

  function openNewTopic() {
    if (!cat || !forumKey || !forum) return
    router.push({
      pathname: '/Settings/Forums/new-topic',
      params: {
        categorySlug: cat,
        forumSlug: forumKey,
        forumName: forum.name,
      },
    })
  }

  function loadMore() {
    if (loadingMore || page >= totalPages) return
    setLoadingMore(true)
    loadPage(page + 1, true)
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{title: headerTitle}} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    )
  }

  const canCreateTopic = Boolean(state.user?.id && forum && !forum.is_locked)

  return (
    <>
      <Stack.Screen options={{title: headerTitle}} />
      <View className="flex-1">
        {forum?.description || forum?.is_locked ? (
          <RNView
            className="mb-2 mt-3 px-4 py-3"
            style={{
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: isDark
                ? 'rgba(148, 163, 184, 0.2)'
                : 'rgba(148, 163, 184, 0.25)',
            }}>
            {forum.description ? (
              <Text className="text-sm" style={{color: isDark ? '#90CAF9' : '#1565C0'}}>
                {forum.description}
              </Text>
            ) : null}
            {forum.is_locked ? (
              <View className={forum.description ? 'mt-2' : undefined}>
                <ForumStatChip
                  icon="lock"
                  label={t('forums_locked')}
                  fg={FORUM_STAT_COLORS.locked.fg}
                  bg={FORUM_STAT_COLORS.locked.bg}
                />
              </View>
            ) : null}
          </RNView>
        ) : null}

        <FlatList
          data={topics}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: canCreateTopic ? insets.bottom + 88 : 12,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                loadPage(1)
              }}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Text className="px-2 py-8 text-center opacity-70">
              {error ?? t('forums_no_topics')}
            </Text>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator className="py-4" color={colors.primary} />
            ) : null
          }
          renderItem={({item, index}) => (
            <TopicRow
              topic={item}
              accentIndex={index}
              onPress={() => openTopic(item)}
            />
          )}
        />
        {canCreateTopic ? <ForumNewTopicFab onPress={openNewTopic} /> : null}
      </View>
    </>
  )
}
