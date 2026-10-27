import {useLeagueContext} from '@/context/LeagueContext'
import {useNetwork} from '@/hooks/useNetwork'
import {
  configureForumReadsSession,
  hydrateForumReadsFromServer,
  latestForumPostAt,
  parseForumReadState,
  refreshForumActivity,
  setHasNewForumPosts,
  syncGlobalForumBadge,
  type ForumReadPush,
} from '@/lib/forumActivity'
import type {ForumCategoryWithForums} from '@/types/forums'
import React from 'react'
import {AppState} from 'react-native'

function activityFromResponse(res: {
  status?: string
  data?: {last_post_at?: string | null} | ForumCategoryWithForums[]
}): string | null {
  if (res?.status !== 'ok' || res.data == null) {
    return null
  }
  if (Array.isArray(res.data)) {
    return latestForumPostAt(res.data)
  }
  return res.data.last_post_at ?? null
}

export function useForumActivitySync() {
  const {Get, Post} = useNetwork()
  const {state} = useLeagueContext()
  const playerId = state.user?.id ?? null
  const getRef = React.useRef(Get)
  const postRef = React.useRef(Post)

  React.useEffect(() => {
    getRef.current = Get
    postRef.current = Post
  })

  React.useEffect(() => {
    configureForumReadsSession(
      playerId,
      playerId
        ? {
            fetchState: async () => {
              const res = await getRef.current('/forums/reads')
              if (res?.status !== 'ok') return null
              return parseForumReadState(res.data)
            },
            pushState: async (body: ForumReadPush) => {
              const res = await postRef.current('/forums/reads', body)
              if (res?.status !== 'ok') {
                throw new Error(res?.error || 'request_failed')
              }
            },
          }
        : null,
    )
  }, [playerId])

  const refresh = React.useCallback(async () => {
    try {
      await hydrateForumReadsFromServer({force: true})
      const forums = await getRef.current('/forums')
      if (forums?.status === 'ok' && Array.isArray(forums.data)) {
        await syncGlobalForumBadge(forums.data)
        return
      }
    } catch (e) {
      console.error('Error syncing global forum badge:', e)
    }

    await refreshForumActivity(async () => {
      const activity = await getRef.current('/forums/activity')
      const fromActivity = activityFromResponse(activity)
      if (activity?.status === 'ok') {
        return fromActivity
      }
      const forums = await getRef.current('/forums')
      return activityFromResponse(forums)
    })
  }, [])

  const forumsEnabled = state.forumsEnabled !== false

  React.useEffect(() => {
    if (!forumsEnabled) {
      setHasNewForumPosts(false)
      return
    }
    refresh()
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refresh()
      }
    })
    return () => subscription.remove()
  }, [refresh, playerId, forumsEnabled])

  return {refreshForumActivity: refresh}
}
