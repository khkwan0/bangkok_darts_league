import ForumTopicOptions, {
  type ForumTopicOptionField,
} from '@/components/Forums/ForumTopicOptions'
import {ForumPostCard, ForumTopicHeader} from '@/components/Forums/ForumPostCard'
import ForumPostsControls, {
  type ForumPostSortOrder,
} from '@/components/Forums/ForumPostsControls'
import {
  ForumReplyComposer,
  ForumReplyFab,
} from '@/components/Forums/ForumReplyComposer'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {useForumSettings, forumLengthErrorKey} from '@/hooks/useForumSettings'
import {useForums} from '@/hooks/useForums'
import {markTopicSeen} from '@/lib/forumActivity'
import type {
  ForumPost,
  ForumPostReactionState,
  ForumReactionIcon,
  ForumTopicDetail,
} from '@/types/forums'
import {useTheme} from "expo-router/react-navigation"
import {useLocalSearchParams, useRouter, Stack} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function emptyReactions(): ForumPostReactionState {
  return {counts: {}, userIconId: null}
}

export default function ForumTopic() {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const router = useRouter()
  const {state} = useLeagueContext()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    categorySlug: string
    forumSlug: string
    topicSlug: string
    title?: string
  }>()
  const {getTopic, getPosts, createReply, addPostReaction, getReactionIcons, getPostReactions, updateTopic, updatePost} =
    useForums()
  const {settings: forumSettings} = useForumSettings()

  const cat = firstParam(params.categorySlug)
  const forumKey = firstParam(params.forumSlug)
  const topicKey = firstParam(params.topicSlug)
  const headerTitle = firstParam(params.title) ?? t('forums')

  const [detail, setDetail] = React.useState<ForumTopicDetail | null>(null)
  const [posts, setPosts] = React.useState<ForumPost[]>([])
  const [originalPost, setOriginalPost] = React.useState<ForumPost | null>(null)
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [sortOrder, setSortOrder] = React.useState<ForumPostSortOrder>('asc')
  const [loading, setLoading] = React.useState(true)
  const [loadingPosts, setLoadingPosts] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [replyText, setReplyText] = React.useState('')
  const [isAnonymous, setIsAnonymous] = React.useState(false)
  const [replyOpen, setReplyOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [replyError, setReplyError] = React.useState<string | null>(null)
  const [reactionIcons, setReactionIcons] = React.useState<ForumReactionIcon[]>(
    [],
  )
  const [reactionsByPostId, setReactionsByPostId] = React.useState<
    Record<number, ForumPostReactionState>
  >({})
  const [reacting, setReacting] = React.useState<{
    postId: number
    iconId: number
  } | null>(null)
  const [reactionErrorsByPostId, setReactionErrorsByPostId] = React.useState<
    Record<number, string | null>
  >({})
  const [topicOptionLoading, setTopicOptionLoading] =
    React.useState<ForumTopicOptionField | null>(null)
  const [editingPostId, setEditingPostId] = React.useState<number | null>(null)
  const [editContent, setEditContent] = React.useState('')
  const [editSubmitting, setEditSubmitting] = React.useState(false)
  const [editError, setEditError] = React.useState<string | null>(null)
  const postsRequestRef = React.useRef(0)
  const getPostsRef = React.useRef(getPosts)
  const getReactionIconsRef = React.useRef(getReactionIcons)
  const getPostReactionsRef = React.useRef(getPostReactions)
  getPostsRef.current = getPosts
  getReactionIconsRef.current = getReactionIcons
  getPostReactionsRef.current = getPostReactions

  const syncReactionsForPosts = React.useCallback(
    async (
      result: Awaited<ReturnType<typeof getPosts>>,
      append: boolean,
      requestId: number,
    ) => {
      if (requestId !== postsRequestRef.current) return

      const postIds = [
        ...(result.original_post ? [result.original_post.id] : []),
        ...result.items.map(post => post.id),
      ]
      const hasEmbeddedReactions =
        Boolean(result.reactions_by_post_id) &&
        Object.keys(result.reactions_by_post_id ?? {}).length > 0

      if (result.reaction_icons?.length) {
        setReactionIcons(result.reaction_icons)
      } else {
        const icons = await getReactionIconsRef.current()
        if (requestId !== postsRequestRef.current) return
        if (icons.length) setReactionIcons(icons)
      }

      if (hasEmbeddedReactions) {
        setReactionsByPostId(prev =>
          append
            ? {...prev, ...(result.reactions_by_post_id ?? {})}
            : {...(result.reactions_by_post_id ?? {})},
        )
        return
      }

      if (postIds.length === 0) return

      const bundle = await getPostReactionsRef.current(postIds)
      if (requestId !== postsRequestRef.current) return
      if (bundle.reaction_icons.length) {
        setReactionIcons(bundle.reaction_icons)
      }
      setReactionsByPostId(prev =>
        append
          ? {...prev, ...bundle.reactions_by_post_id}
          : {...bundle.reactions_by_post_id},
      )
    },
    [],
  )

  const applyPostsResult = React.useCallback(
    (result: Awaited<ReturnType<typeof getPosts>>, append = false) => {
      setPage(result.page)
      setTotalPages(result.total_pages)
      setOriginalPost(result.original_post)
      setPosts(prev => (append ? [...prev, ...result.items] : result.items))
    },
    [],
  )

  const loadPosts = React.useCallback(
    async (pageNum: number, sort: ForumPostSortOrder, append = false) => {
      if (!cat || !forumKey || !topicKey) return null
      const requestId = postsRequestRef.current
      const result = await getPostsRef.current(
        cat,
        forumKey,
        topicKey,
        pageNum,
        sort,
      )
      if (requestId !== postsRequestRef.current) return null
      applyPostsResult(result, append)
      await syncReactionsForPosts(result, append, requestId)
      return result
    },
    [cat, forumKey, topicKey, applyPostsResult, syncReactionsForPosts],
  )

  const loadTopic = React.useCallback(async () => {
    if (!cat || !forumKey || !topicKey) {
      setLoading(false)
      return
    }
    try {
      setReplyError(null)
      const topicDetail = await getTopic(cat, forumKey, topicKey)
      setDetail(topicDetail)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [cat, forumKey, topicKey, getTopic])

  React.useEffect(() => {
    setLoading(true)
    setPage(1)
    setPosts([])
    setOriginalPost(null)
    setReactionIcons([])
    setReactionsByPostId({})
    setReactionErrorsByPostId({})
    postsRequestRef.current += 1
    setSortOrder('asc')
    loadTopic()
  }, [cat, forumKey, topicKey])

  React.useEffect(() => {
    if (!detail?.topic?.id) return
    void markTopicSeen(detail.topic.id, detail.topic.last_post_at)
  }, [detail?.topic?.id, detail?.topic.last_post_at])

  React.useEffect(() => {
    if (!detail || !cat || !forumKey || !topicKey) return
    const requestId = postsRequestRef.current
    setLoadingPosts(true)
    ;(async () => {
      try {
        const result = await getPostsRef.current(
          cat,
          forumKey,
          topicKey,
          1,
          sortOrder,
        )
        if (requestId !== postsRequestRef.current) return
        applyPostsResult(result, false)
        await syncReactionsForPosts(result, false, requestId)
      } catch (e) {
        console.error(e)
      } finally {
        if (requestId === postsRequestRef.current) {
          setLoadingPosts(false)
        }
      }
    })()
  }, [detail, sortOrder, cat, forumKey, topicKey, applyPostsResult, syncReactionsForPosts])

  async function handleRefresh() {
    setRefreshing(true)
    setPage(1)
    await loadTopic()
    await loadPosts(1, sortOrder, false)
    setRefreshing(false)
  }

  function handleSortChange(nextSort: ForumPostSortOrder) {
    if (nextSort === sortOrder) return
    postsRequestRef.current += 1
    setPage(1)
    setPosts([])
    setReactionsByPostId({})
    setReactionErrorsByPostId({})
    setLoadingMore(false)
    setSortOrder(nextSort)
  }

  async function handleReact(postId: number, iconId: number) {
    const current = reactionsByPostId[postId] ?? emptyReactions()
    if (current.userIconId != null || reacting != null) return

    setReactionErrorsByPostId(prev => ({...prev, [postId]: null}))
    setReacting({postId, iconId})
    try {
      const result = await addPostReaction(postId, iconId)
      if ('counts' in result) {
        setReactionsByPostId(prev => ({...prev, [postId]: result}))
      } else if (result.error === 'already_reacted') {
        setReactionErrorsByPostId(prev => ({
          ...prev,
          [postId]: t('forums_reaction_already'),
        }))
      } else {
        setReactionErrorsByPostId(prev => ({
          ...prev,
          [postId]: t('forums_reaction_failed'),
        }))
      }
    } catch (e) {
      console.error(e)
      setReactionErrorsByPostId(prev => ({
        ...prev,
        [postId]: t('forums_reaction_failed'),
      }))
    } finally {
      setReacting(null)
    }
  }

  function canEditPost(post: ForumPost): boolean {
    const userId = state.user?.id
    if (!userId || !detail) return false
    return post.author_id === userId || detail.can_moderate
  }

  function patchPostInState(postId: number, content: string, editedAt: string) {
    setOriginalPost(prev =>
      prev?.id === postId ? {...prev, content, edited_at: editedAt} : prev,
    )
    setPosts(prev =>
      prev.map(post =>
        post.id === postId ? {...post, content, edited_at: editedAt} : post,
      ),
    )
  }

  function startPostEdit(post: ForumPost) {
    setEditingPostId(post.id)
    setEditContent(post.content)
    setEditError(null)
  }

  function cancelPostEdit() {
    setEditingPostId(null)
    setEditContent('')
    setEditError(null)
  }

  async function savePostEdit() {
    if (editingPostId == null || !editContent.trim()) return
    try {
      setEditSubmitting(true)
      setEditError(null)
      const result = await updatePost(editingPostId, editContent.trim())
      if (result.status === 'ok') {
        patchPostInState(editingPostId, editContent.trim(), result.edited_at)
        cancelPostEdit()
      } else {
        const lengthKey = forumLengthErrorKey(result.error)
        setEditError(
          lengthKey
            ? t(lengthKey, {max: result.max_length ?? 0})
            : t('forums_edit_post_failed'),
        )
      }
    } catch (e) {
      console.error(e)
      setEditError(t('forums_edit_post_failed'))
    } finally {
      setEditSubmitting(false)
    }
  }

  function renderPostCard(
    post: ForumPost,
    accentIndex: number,
    isOriginalPost = false,
  ) {
    const reactions = reactionsByPostId[post.id] ?? emptyReactions()
    const isEditing = editingPostId === post.id
    const editMaxLength =
      post.post_number === 1
        ? forumSettings.opening_post_max_length
        : forumSettings.reply_max_length
    return (
      <ForumPostCard
        post={post}
        accentIndex={accentIndex}
        isOriginalPost={isOriginalPost}
        reactionIcons={reactionIcons}
        reactions={reactions}
        onReact={iconId => handleReact(post.id, iconId)}
        submittingReactionIconId={
          reacting?.postId === post.id ? reacting.iconId : null
        }
        reactionError={reactionErrorsByPostId[post.id] ?? null}
        canEdit={canEditPost(post)}
        editing={isEditing}
        editContent={isEditing ? editContent : post.content}
        onEditStart={() => startPostEdit(post)}
        onEditChange={setEditContent}
        onEditSave={savePostEdit}
        onEditCancel={cancelPostEdit}
        editSubmitting={editSubmitting && isEditing}
        editError={isEditing ? editError : null}
        editMaxLength={editMaxLength}
      />
    )
  }

  function loadMore() {
    if (loadingMore || loadingPosts || page >= totalPages) return
    setLoadingMore(true)
    loadPosts(page + 1, sortOrder, true).finally(() => setLoadingMore(false))
  }

  async function handleTopicOptionToggle(
    field: ForumTopicOptionField,
    value: boolean,
  ) {
    if (!cat || !forumKey || !topicKey || !detail) return
    setTopicOptionLoading(field)
    try {
      const result = await updateTopic(cat, forumKey, topicKey, {[field]: value})
      if (result.status === 'ok') {
        setDetail(prev =>
          prev
            ? {
                ...prev,
                topic: {...prev.topic, [field]: value},
                can_reply:
                  field === 'is_locked'
                    ? value
                      ? false
                      : !prev.forum.is_locked
                    : prev.can_reply,
              }
            : prev,
        )
        if (result.topic_slug && result.topic_slug !== topicKey) {
          router.replace({
            pathname: '/Settings/Forums/topic',
            params: {
              categorySlug: cat,
              forumSlug: forumKey,
              topicSlug: result.topic_slug,
              title: detail.topic.title,
            },
          })
        }
        return
      }
    } catch (e) {
      console.error(e)
    } finally {
      setTopicOptionLoading(null)
    }
  }

  function handleEditTopic() {
    if (!cat || !forumKey || !topicKey || !detail) return
    router.push({
      pathname: '/Settings/Forums/edit-topic',
      params: {
        categorySlug: cat,
        forumSlug: forumKey,
        topicSlug: topicKey,
        title: detail.topic.title,
      },
    })
  }

  async function handleReply() {
    if (!cat || !forumKey || !topicKey || !replyText.trim()) return
    try {
      setSubmitting(true)
      setReplyError(null)
      const res = await createReply(
        cat,
        forumKey,
        topicKey,
        replyText.trim(),
        isAnonymous,
      )
      if (res?.status === 'ok') {
        setReplyText('')
        setIsAnonymous(false)
        setReplyOpen(false)
        setPage(1)
        await loadTopic()
        await loadPosts(1, sortOrder, false)
      } else if (res?.error === 'locked') {
        setReplyError(t('forums_locked'))
      } else {
        const lengthKey = forumLengthErrorKey(res?.error ?? '')
        setReplyError(
          lengthKey
            ? t(lengthKey, {max: res?.max_length ?? forumSettings.reply_max_length})
            : t('forums_reply_error'),
        )
      }
    } catch (e) {
      console.error(e)
      setReplyError(t('forums_reply_error'))
    } finally {
      setSubmitting(false)
    }
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

  if (!detail) {
    return (
      <>
        <Stack.Screen options={{title: headerTitle}} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center opacity-70">{t('forums_not_found')}</Text>
        </View>
      </>
    )
  }

  const canReply = detail.can_reply
  const canManageTopic = detail.can_manage
  const canPinTopic = detail.can_pin
  const canLockHideTopic = detail.can_lock_hide
  const showTopicOptions = canPinTopic || canLockHideTopic
  const listBottomPadding =
    canReply && replyOpen ? 24 : canReply && !replyOpen ? insets.bottom + 80 : 16

  return (
    <>
      <Stack.Screen options={{title: headerTitle}} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}>
        <FlatList
          key={sortOrder}
          data={posts}
          extraData={{sortOrder, reactionsByPostId, reacting, reactionIcons}}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: listBottomPadding,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <>
              <ForumTopicHeader detail={detail} canReply={canReply} />
              {showTopicOptions || canManageTopic ? (
                <ForumTopicOptions
                  isPinned={detail.topic.is_pinned}
                  isLocked={detail.topic.is_locked}
                  isHidden={detail.topic.is_hidden}
                  canPin={canPinTopic}
                  canLockHide={canLockHideTopic}
                  showEdit={canManageTopic}
                  loadingField={topicOptionLoading}
                  onToggle={handleTopicOptionToggle}
                  onEdit={handleEditTopic}
                />
              ) : null}
              {originalPost ? (
                renderPostCard(originalPost, 0, true)
              ) : loadingPosts ? (
                <ActivityIndicator className="mb-3 py-4" color={colors.primary} />
              ) : null}
              <ForumPostsControls
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
                totalPosts={detail.topic.reply_count}
              />
            </>
          }
          ListEmptyComponent={
            loadingPosts ? (
              <ActivityIndicator className="py-8" color={colors.primary} />
            ) : posts.length === 0 ? (
              <Text className="py-8 text-center opacity-70">
                {t('forums_no_replies')}
              </Text>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator className="py-4" color={colors.primary} />
            ) : null
          }
          renderItem={({item, index}) => renderPostCard(item, index)}
        />

        {canReply && replyOpen ? (
          <ForumReplyComposer
            value={replyText}
            onChangeText={setReplyText}
            isAnonymous={isAnonymous}
            onAnonymousChange={setIsAnonymous}
            onSubmit={handleReply}
            onCancel={() => {
              setReplyOpen(false)
              setReplyError(null)
              setIsAnonymous(false)
            }}
            submitting={submitting}
            error={replyError}
            maxLength={forumSettings.reply_max_length}
          />
        ) : null}

        {canReply && !replyOpen ? (
          <ForumReplyFab onPress={() => setReplyOpen(true)} />
        ) : null}
      </KeyboardAvoidingView>
    </>
  )
}
