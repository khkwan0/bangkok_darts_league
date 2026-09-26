import {useNetwork} from '@/hooks/useNetwork'
import {
  latestForumPostAt,
  refreshForumActivity,
  syncGlobalForumBadge,
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
  const {Get} = useNetwork()
  const getRef = React.useRef(Get)
  getRef.current = Get

  const refresh = React.useCallback(async () => {
    try {
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

  React.useEffect(() => {
    refresh()
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refresh()
      }
    })
    return () => subscription.remove()
  }, [refresh])

  return {refreshForumActivity: refresh}
}
