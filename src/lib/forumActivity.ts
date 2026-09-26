import type {ForumCategoryWithForums} from '@/types/forums'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useEffect, useState, useSyncExternalStore} from 'react'

export const FORUMS_LAST_SEEN_KEY = 'forums_last_seen_at'
export const FORUMS_TOPIC_BASELINE_KEY = 'forums_topic_baseline'
export const FORUMS_TOPIC_READS_KEY = 'forums_topic_reads'
export const FORUMS_BOARD_READS_KEY = 'forums_board_reads'

type Listener = () => void

let hasNewForumPosts = false
let lastSeenMemory: string | null = null
let lastSeenLoaded = false
let seenGeneration = 0

let topicBaselineMemory: string | null = null
let topicBaselineLoaded = false
let topicReadsMemory: Record<string, string> = {}
let topicReadsLoaded = false
let boardReadsMemory: Record<string, string> = {}
let boardReadsLoaded = false
let topicActivityVersion = 0

const FIRST_VISIT_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000

const listeners = new Set<Listener>()
const topicListeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

function emitTopicActivity() {
  topicActivityVersion += 1
  for (const listener of topicListeners) {
    listener()
  }
}

export function subscribeForumActivity(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function subscribeTopicActivity(listener: Listener) {
  topicListeners.add(listener)
  return () => {
    topicListeners.delete(listener)
  }
}

export function getHasNewForumPosts() {
  return hasNewForumPosts
}

export function setHasNewForumPosts(value: boolean) {
  if (hasNewForumPosts === value) {
    return
  }
  hasNewForumPosts = value
  emit()
}

export function useHasNewForumPosts() {
  return useSyncExternalStore(
    subscribeForumActivity,
    getHasNewForumPosts,
    () => false,
  )
}

export function getTopicActivityVersion() {
  return topicActivityVersion
}

export function useTopicActivityVersion() {
  return useSyncExternalStore(
    subscribeTopicActivity,
    getTopicActivityVersion,
    () => 0,
  )
}

export function latestForumPostAt(
  categories: ForumCategoryWithForums[],
): string | null {
  let latestMs = 0
  let latest: string | null = null
  for (const category of categories) {
    for (const forum of category.forums ?? []) {
      if (!forum.last_post_at) {
        continue
      }
      const ms = Date.parse(forum.last_post_at)
      if (!Number.isNaN(ms) && ms > latestMs) {
        latestMs = ms
        latest = forum.last_post_at
      }
    }
  }
  return latest
}

export function forumsForGlobalBadge(
  categories: ForumCategoryWithForums[],
): ForumCategoryWithForums['forums'] {
  return categories.flatMap(category =>
    (category.forums ?? []).filter(forum => forum.contributes_to_global_badge),
  )
}

export function latestForumPostAtForGlobalBadge(
  categories: ForumCategoryWithForums[],
): string | null {
  return latestForumPostAt(
    categories.map(category => ({
      ...category,
      forums: (category.forums ?? []).filter(
        forum => forum.contributes_to_global_badge,
      ),
    })),
  )
}

export function isNewerForumActivity(
  latestPostAt: string | null,
  lastSeenAt: string | null,
): boolean {
  if (!latestPostAt) {
    return false
  }
  const latestMs = Date.parse(latestPostAt)
  if (Number.isNaN(latestMs)) {
    return false
  }
  if (!lastSeenAt) {
    return true
  }
  const seenMs = Date.parse(lastSeenAt)
  if (Number.isNaN(seenMs)) {
    return true
  }
  return latestMs > seenMs
}

export async function getForumsLastSeenAt(): Promise<string | null> {
  if (lastSeenLoaded) {
    return lastSeenMemory
  }
  try {
    const stored = await AsyncStorage.getItem(FORUMS_LAST_SEEN_KEY)
    if (!lastSeenLoaded) {
      lastSeenMemory = stored
      lastSeenLoaded = true
    }
    return lastSeenMemory
  } catch {
    lastSeenLoaded = true
    return lastSeenMemory
  }
}

async function getTopicBaseline(): Promise<string | null> {
  if (topicBaselineLoaded) {
    return topicBaselineMemory
  }
  try {
    const stored = await AsyncStorage.getItem(FORUMS_TOPIC_BASELINE_KEY)
    if (!topicBaselineLoaded) {
      topicBaselineMemory = stored
      topicBaselineLoaded = true
    }
    return topicBaselineMemory
  } catch {
    topicBaselineLoaded = true
    return topicBaselineMemory
  }
}

async function getTopicReads(): Promise<Record<string, string>> {
  if (topicReadsLoaded) {
    return topicReadsMemory
  }
  try {
    const raw = await AsyncStorage.getItem(FORUMS_TOPIC_READS_KEY)
    if (!topicReadsLoaded) {
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>
        topicReadsMemory =
          parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : {}
      } else {
        topicReadsMemory = {}
      }
      topicReadsLoaded = true
    }
    return topicReadsMemory
  } catch {
    topicReadsLoaded = true
    topicReadsMemory = {}
    return topicReadsMemory
  }
}

async function getBoardReads(): Promise<Record<string, string>> {
  if (boardReadsLoaded) {
    return boardReadsMemory
  }
  try {
    const raw = await AsyncStorage.getItem(FORUMS_BOARD_READS_KEY)
    if (!boardReadsLoaded) {
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>
        boardReadsMemory =
          parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : {}
      } else {
        boardReadsMemory = {}
      }
      boardReadsLoaded = true
    }
    return boardReadsMemory
  } catch {
    boardReadsLoaded = true
    boardReadsMemory = {}
    return boardReadsMemory
  }
}

function laterTimestamp(a: string, b: string | null | undefined): string {
  if (!b) {
    return a
  }
  const aMs = Date.parse(a)
  const bMs = Date.parse(b)
  if (Number.isNaN(bMs)) {
    return a
  }
  if (Number.isNaN(aMs) || bMs > aMs) {
    return b
  }
  return a
}

export async function topicHasNewPosts(
  topicId: number,
  lastPostAt: string | null,
): Promise<boolean> {
  if (!lastPostAt) {
    return false
  }
  await ensureForumUnreadBaseline()
  const [reads, baseline, lastSeen] = await Promise.all([
    getTopicReads(),
    getTopicBaseline(),
    getForumsLastSeenAt(),
  ])
  const threshold = reads[String(topicId)] ?? baseline ?? lastSeen
  if (!threshold) {
    return false
  }
  return isNewerForumActivity(lastPostAt, threshold)
}

export async function boardHasNewPosts(
  boardId: number,
  lastPostAt: string | null,
): Promise<boolean> {
  if (!lastPostAt) {
    return false
  }
  await ensureForumUnreadBaseline()
  const [reads, baseline, lastSeen] = await Promise.all([
    getBoardReads(),
    getTopicBaseline(),
    getForumsLastSeenAt(),
  ])
  const threshold = reads[String(boardId)] ?? baseline ?? lastSeen
  if (!threshold) {
    return false
  }
  return isNewerForumActivity(lastPostAt, threshold)
}

export function useTopicHasNewPosts(
  topicId: number,
  lastPostAt: string | null,
) {
  const version = useTopicActivityVersion()
  const [hasNew, setHasNew] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const next = await topicHasNewPosts(topicId, lastPostAt)
      if (!cancelled) {
        setHasNew(next)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [topicId, lastPostAt, version])

  return hasNew
}

export function useBoardHasNewPosts(
  boardId: number,
  lastPostAt: string | null,
) {
  const version = useTopicActivityVersion()
  const [hasNew, setHasNew] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const next = await boardHasNewPosts(boardId, lastPostAt)
      if (!cancelled) {
        setHasNew(next)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [boardId, lastPostAt, version])

  return hasNew
}

export async function markTopicSeen(
  topicId: number,
  lastPostAt?: string | null,
) {
  const reads = await getTopicReads()
  const key = String(topicId)
  const seenAt = laterTimestamp(
    laterTimestamp(new Date().toISOString(), lastPostAt),
    reads[key],
  )
  if (reads[key] === seenAt) {
    return
  }
  topicReadsMemory = {...reads, [key]: seenAt}
  topicReadsLoaded = true
  try {
    await AsyncStorage.setItem(
      FORUMS_TOPIC_READS_KEY,
      JSON.stringify(topicReadsMemory),
    )
  } catch (e) {
    console.error('Error saving forum topic reads:', e)
  }
  emitTopicActivity()
}

export async function syncBoardSeenFromTopics(
  boardId: number,
  boardLastPostAt: string | null,
  topics: Array<{id: number; last_post_at: string | null}>,
) {
  if (!boardLastPostAt || topics.length === 0) {
    return
  }
  const unread = await Promise.all(
    topics.map(topic => topicHasNewPosts(topic.id, topic.last_post_at)),
  )
  if (unread.some(Boolean)) {
    return
  }
  await markBoardSeen(boardId, boardLastPostAt)
}

export async function markBoardSeen(
  boardId: number,
  lastPostAt?: string | null,
) {
  const reads = await getBoardReads()
  const key = String(boardId)
  const seenAt = laterTimestamp(
    laterTimestamp(new Date().toISOString(), lastPostAt),
    reads[key],
  )
  if (reads[key] === seenAt) {
    return
  }
  boardReadsMemory = {...reads, [key]: seenAt}
  boardReadsLoaded = true
  try {
    await AsyncStorage.setItem(
      FORUMS_BOARD_READS_KEY,
      JSON.stringify(boardReadsMemory),
    )
  } catch (e) {
    console.error('Error saving forum board reads:', e)
  }
  emitTopicActivity()
}

/**
 * Keeps the FAB / quick-action badge in sync with per-board read state.
 * Clears the global indicator once every board has no unread posts.
 */
export async function syncGlobalForumBadge(
  categories: ForumCategoryWithForums[],
) {
  const forums = forumsForGlobalBadge(categories)
  if (forums.length === 0) {
    setHasNewForumPosts(false)
    return
  }

  const unreadByBoard = await Promise.all(
    forums.map(forum => boardHasNewPosts(forum.id, forum.last_post_at)),
  )
  if (unreadByBoard.some(Boolean)) {
    setHasNewForumPosts(true)
    return
  }

  const latestPostAt = latestForumPostAtForGlobalBadge(categories)
  const seenAt = laterTimestamp(new Date().toISOString(), latestPostAt)
  lastSeenMemory = seenAt
  lastSeenLoaded = true
  setHasNewForumPosts(false)

  try {
    await AsyncStorage.setItem(FORUMS_LAST_SEEN_KEY, seenAt)
  } catch (e) {
    console.error('Error saving global forum read state:', e)
  }
}

/**
 * Ensures board/topic "new" dots have a threshold without clearing the global badge.
 * First visit uses a 30-day lookback so recent activity is still marked new.
 */
export async function ensureForumUnreadBaseline() {
  await getTopicBaseline()
  if (topicBaselineMemory) {
    return
  }
  const lastSeen = await getForumsLastSeenAt()
  if (lastSeen) {
    return
  }
  const firstVisitBaseline = new Date(
    Date.now() - FIRST_VISIT_LOOKBACK_MS,
  ).toISOString()
  topicBaselineMemory = firstVisitBaseline
  topicBaselineLoaded = true
  try {
    await AsyncStorage.setItem(FORUMS_TOPIC_BASELINE_KEY, firstVisitBaseline)
  } catch (e) {
    console.error('Error saving forums topic baseline:', e)
  }
}

/** Clears global + board + topic indicators until a newer post/reply appears. */
export async function markAllForumsRead(latestPostAt?: string | null) {
  seenGeneration += 1
  await Promise.all([getForumsLastSeenAt(), getTopicBaseline(), getTopicReads(), getBoardReads()])
  const now = new Date().toISOString()
  const seenAt = laterTimestamp(now, latestPostAt)

  lastSeenMemory = seenAt
  lastSeenLoaded = true
  topicBaselineMemory = seenAt
  topicBaselineLoaded = true
  topicReadsMemory = {}
  topicReadsLoaded = true
  boardReadsMemory = {}
  boardReadsLoaded = true
  setHasNewForumPosts(false)

  try {
    await AsyncStorage.multiSet([
      [FORUMS_LAST_SEEN_KEY, seenAt],
      [FORUMS_TOPIC_BASELINE_KEY, seenAt],
      [FORUMS_TOPIC_READS_KEY, '{}'],
      [FORUMS_BOARD_READS_KEY, '{}'],
    ])
  } catch (e) {
    console.error('Error saving forums mark-all-read state:', e)
  }
  emitTopicActivity()
}

/** @deprecated Use markAllForumsRead — kept for any lingering call sites. */
export async function markForumsSeen(latestPostAt?: string | null) {
  return markAllForumsRead(latestPostAt)
}

export async function refreshForumActivity(
  fetchLatestPostAt: () => Promise<string | null>,
) {
  const generation = seenGeneration
  try {
    const [latestPostAt, lastSeenAt] = await Promise.all([
      fetchLatestPostAt(),
      getForumsLastSeenAt(),
    ])
    if (generation !== seenGeneration) {
      return
    }
    setHasNewForumPosts(isNewerForumActivity(latestPostAt, lastSeenAt))
  } catch (e) {
    console.error('Error refreshing forum activity:', e)
  }
}
