import {useNetwork} from '@/hooks/useNetwork'
import {useLeagueContext} from '@/context/LeagueContext'
import config from '@/config'
import {leagueRequestHeaders} from '@/lib/leagueRequest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {File} from 'expo-file-system'
import {manipulateAsync, SaveFormat} from 'expo-image-manipulator'
import {useCallback, useRef} from 'react'
import type {
  ForumBoard,
  ForumCategoryWithForums,
  ForumPostSortOrder,
  ForumTopicDetail,
  ForumTopicListItem,
  ForumTopicPatchResult,
  ForumTopicUpdate,
  ForumTopicCreateInput,
  ForumTopicCreateResult,
  ForumPostsPage,
  ForumPostReactionState,
  ForumReactionIcon,
  ForumSettings,
  ForumImageUploadResult,
  Paginated,
} from '@/types/forums'
import {FORUM_SETTINGS_DEFAULTS} from '@/types/forums'

function encodePath(...segments: string[]) {
  return segments.map(s => encodeURIComponent(s)).join('/')
}

export function useForums() {
  const {Get, Post, Put, Patch} = useNetwork()
  const {apiUrl} = useLeagueContext()
  const getRef = useRef(Get)
  const postRef = useRef(Post)
  const putRef = useRef(Put)
  const patchRef = useRef(Patch)
  const apiUrlRef = useRef(apiUrl)
  getRef.current = Get
  postRef.current = Post
  putRef.current = Put
  patchRef.current = Patch
  apiUrlRef.current = apiUrl

  const getForumSettings = useCallback(async (): Promise<ForumSettings> => {
    const res = await getRef.current('/forums/settings')
    if (res?.status === 'ok' && res.data) {
      return {
        opening_post_max_length: Number(res.data.opening_post_max_length),
        reply_max_length: Number(res.data.reply_max_length),
        topic_title_max_length: Number(res.data.topic_title_max_length),
      }
    }
    return FORUM_SETTINGS_DEFAULTS
  }, [])

  const getCategories = useCallback(async (): Promise<ForumCategoryWithForums[]> => {
    const res = await getRef.current('/forums')
    if (res?.status === 'ok' && Array.isArray(res.data)) {
      return res.data
    }
    return []
  }, [])

  const getForum = useCallback(async (
    categorySlug: string,
    forumSlug: string,
  ): Promise<ForumBoard | null> => {
    const res = await getRef.current(`/forums/${encodePath(categorySlug, forumSlug)}`)
    if (res?.status === 'ok' && res.data) {
      return {
        ...res.data,
        can_pin: Boolean(res.data.can_pin),
        can_lock_hide: Boolean(res.data.can_lock_hide),
      }
    }
    return null
  }, [])

  const getTopics = useCallback(async (
    categorySlug: string,
    forumSlug: string,
    page = 1,
  ): Promise<Paginated<ForumTopicListItem> & {forum: ForumBoard}> => {
    const res = await getRef.current(
      `/forums/${encodePath(categorySlug, forumSlug)}/topics?page=${page}`,
    )
    if (res?.status === 'ok' && res.data) {
      return res.data
    }
    return {
      forum: {} as ForumBoard,
      items: [],
      page: 1,
      page_size: 20,
      total: 0,
      total_pages: 1,
    }
  }, [])

  const getTopic = useCallback(async (
    categorySlug: string,
    forumSlug: string,
    topicSlug: string,
  ): Promise<ForumTopicDetail | null> => {
    const res = await getRef.current(
      `/forums/${encodePath(categorySlug, forumSlug)}/topics/${encodeURIComponent(topicSlug)}`,
    )
    if (res?.status === 'ok' && res.data) {
      return {
        ...res.data,
        can_reply: Boolean(res.data.can_reply),
        can_moderate: Boolean(res.data.can_moderate),
        can_manage: Boolean(res.data.can_manage),
        can_pin: Boolean(res.data.can_pin),
        can_lock_hide: Boolean(res.data.can_lock_hide),
      }
    }
    return null
  }, [])

  const getPosts = useCallback(async (
    categorySlug: string,
    forumSlug: string,
    topicSlug: string,
    page = 1,
    sort: ForumPostSortOrder = 'asc',
  ): Promise<ForumPostsPage> => {
    const res = await getRef.current(
      `/forums/${encodePath(categorySlug, forumSlug)}/topics/${encodeURIComponent(topicSlug)}/posts?page=${page}&sort=${sort}`,
    )
    if (res?.status === 'ok' && res.data) {
      return {
        ...res.data,
        original_post: res.data.original_post ?? null,
        reaction_icons: res.data.reaction_icons ?? [],
        reactions_by_post_id: res.data.reactions_by_post_id ?? {},
      }
    }
    return {
      items: [],
      original_post: null,
      reaction_icons: [],
      reactions_by_post_id: {},
      page: 1,
      page_size: 20,
      total: 0,
      total_pages: 1,
    }
  }, [])

  const getRegistrationStatus = useCallback(async (): Promise<{
    authenticated: boolean
    is_member: boolean
  }> => {
    const res = await getRef.current('/forums/register')
    return {
      authenticated: Boolean(res?.authenticated),
      is_member: Boolean(res?.is_member),
    }
  }, [])

  const joinForums = useCallback(async (): Promise<boolean> => {
    const res = await postRef.current('/forums/register', {})
    return res?.status === 'ok'
  }, [])

  const createReply = useCallback(async (
    categorySlug: string,
    forumSlug: string,
    topicSlug: string,
    content: string,
    isAnonymous = false,
  ) => {
    return postRef.current(
      `/forums/${encodePath(categorySlug, forumSlug)}/topics/${encodeURIComponent(topicSlug)}/posts`,
      {content, is_anonymous: isAnonymous},
    )
  }, [])

  const createTopic = useCallback(async (
    categorySlug: string,
    forumSlug: string,
    input: ForumTopicCreateInput,
  ): Promise<ForumTopicCreateResult> => {
    const res = await postRef.current(
      `/forums/${encodePath(categorySlug, forumSlug)}/topics`,
      {
        title: input.title.trim(),
        content: input.content?.trim() ?? '',
        is_anonymous: Boolean(input.is_anonymous),
        ...(input.is_pinned != null ? {is_pinned: input.is_pinned} : {}),
        ...(input.is_locked != null ? {is_locked: input.is_locked} : {}),
        ...(input.is_hidden != null ? {is_hidden: input.is_hidden} : {}),
      },
    )
    if (res?.status === 'ok' && res.topic_slug) {
      return {
        status: 'ok',
        topic_slug: res.topic_slug,
        topic_id: res.topic_id,
      }
    }
    return {
      status: 'error',
      error: res?.error ?? 'server_error',
      max_length: res?.max_length,
    }
  }, [])

  const getReactionIcons = useCallback(async (): Promise<ForumReactionIcon[]> => {
    const res = await getRef.current('/forums/reaction-icons')
    if (Array.isArray(res?.data)) {
      return res.data
    }
    return []
  }, [])

  const getPostReactions = useCallback(async (
    postIds: number[],
  ): Promise<{
    reaction_icons: ForumReactionIcon[]
    reactions_by_post_id: Record<number, ForumPostReactionState>
  }> => {
    if (postIds.length === 0) {
      return {reaction_icons: [], reactions_by_post_id: {}}
    }
    const res = await getRef.current(
      `/forums/posts/reactions?post_ids=${postIds.join(',')}`,
    )
    if (res?.status === 'ok' && res.data) {
      return {
        reaction_icons: res.data.reaction_icons ?? [],
        reactions_by_post_id: res.data.reactions_by_post_id ?? {},
      }
    }
    return {reaction_icons: [], reactions_by_post_id: {}}
  }, [])

  const addPostReaction = useCallback(async (
    postId: number,
    iconId: number,
  ): Promise<
    ForumPostReactionState | {status: 'error'; error: string}
  > => {
    const res = await postRef.current(`/forums/posts/${postId}/reactions`, {
      icon_id: iconId,
    })
    if (res?.status === 'ok' && res.reactions) {
      return res.reactions as ForumPostReactionState
    }
    return {status: 'error', error: res?.error ?? 'server_error'}
  }, [])

  const updatePost = useCallback(async (
    postId: number,
    content: string,
  ): Promise<
    | {status: 'ok'; edited_at: string}
    | {status: 'error'; error: string; max_length?: number}
  > => {
    const res = await putRef.current(`/forums/posts/${postId}`, {content: content.trim()})
    if (res?.status === 'ok' && res.edited_at) {
      return {status: 'ok', edited_at: res.edited_at}
    }
    return {
      status: 'error',
      error: res?.error ?? 'server_error',
      max_length: res?.max_length,
    }
  }, [])

  const updateTopic = useCallback(async (
    categorySlug: string,
    forumSlug: string,
    topicSlug: string,
    updates: ForumTopicUpdate,
  ): Promise<ForumTopicPatchResult> => {
    const res = await patchRef.current(
      `/forums/${encodePath(categorySlug, forumSlug)}/topics/${encodeURIComponent(topicSlug)}`,
      updates,
    )
    if (res?.status === 'ok') {
      return {status: 'ok', topic_slug: res.topic_slug}
    }
    return {
      status: 'error',
      error: res?.error ?? 'server_error',
      max_length: res?.max_length,
    }
  }, [])

  const uploadForumImage = useCallback(async (
    originalUri: string,
  ): Promise<ForumImageUploadResult> => {
    try {
      const token = await AsyncStorage.getItem('jwt')
      const jpeg = await manipulateAsync(originalUri, [], {
        compress: 0.9,
        format: SaveFormat.JPEG,
      })
      const data = new FormData()
      data.append('original', new File(jpeg.uri))
      const apiDomain = apiUrlRef.current ?? config.apiUrl
      const res = await fetch(`${apiDomain}/forums/images`, {
        method: 'POST',
        body: data,
        headers: {
          ...leagueRequestHeaders(),
          Authorization: 'Bearer ' + token,
        },
      })
      const json = await res.json()
      if (json?.status === 'ok' && json.data) {
        return {
          status: 'ok',
          original_url: json.data.original_url,
          display_url: json.data.display_url,
        }
      }
      return {
        status: 'error',
        error: json?.error ?? 'server_error',
      }
    } catch (e) {
      console.error(e)
      return {status: 'error', error: 'server_error'}
    }
  }, [])

  return {
    getCategories,
    getForumSettings,
    getForum,
    getTopics,
    getTopic,
    getPosts,
    getReactionIcons,
    getPostReactions,
    getRegistrationStatus,
    joinForums,
    createTopic,
    createReply,
    addPostReaction,
    updatePost,
    updateTopic,
    uploadForumImage,
  }
}
