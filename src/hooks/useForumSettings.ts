import {FORUM_SETTINGS_DEFAULTS, type ForumSettings} from '@/types/forums'
import {useForums} from '@/hooks/useForums'
import React from 'react'

export function useForumSettings() {
  const {getForumSettings} = useForums()
  const [settings, setSettings] = React.useState<ForumSettings>(
    FORUM_SETTINGS_DEFAULTS,
  )
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getForumSettings()
        if (!cancelled && data) setSettings(data)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getForumSettings])

  return {settings, loaded}
}

export function forumLengthErrorKey(error: string): string | null {
  if (
    error === 'opening_post_too_long' ||
    error === 'reply_too_long' ||
    error === 'topic_title_too_long'
  ) {
    return `forums_${error}`
  }
  return null
}
