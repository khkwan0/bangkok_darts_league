import type {ForumCategoryWithForums} from '@/types/forums'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useEffect, useState, useSyncExternalStore} from 'react'

export const FORUMS_LAST_SEEN_KEY = 'forums_last_seen_at'
export const FORUMS_TOPIC_BASELINE_KEY = 'forums_topic_baseline'
export const FORUMS_TOPIC_READS_KEY = 'forums_topic_reads'
export const FORUMS_BOARD_READS_KEY = 'forums_board_reads'

const LEGACY_READ_KEYS = [
  FORUMS_LAST_SEEN_KEY,
  FORUMS_TOPIC_BASELINE_KEY,
  FORUMS_TOPIC_READS_KEY,
  FORUMS_BOARD_READS_KEY,
] as const

type Listener = () => void

export type ForumReadState = {
  lastSeenAt: string | null
  topicBaseline: string | null
  topicReads: Record<string, string>
  boardReads: Record<string, string>
}

export type ForumReadPush = {
  lastSeenAt?: string | null
  topicBaseline?: string | null
  topicReads?: {topicId: number; seenAt: string}[]
  boardReads?: {forumId: number; seenAt: string}[]
}

export type ForumReadsApi = {
  fetchState: () => Promise<ForumReadState | null>
  pushState: (body: ForumReadPush) => Promise<void>
}

let hasNewForumPosts = false
let lastSeenMemory: string | null = null
let seenGeneration = 0

let topicBaselineMemory: string | null = null
let topicReadsMemory: Record<string, string> = {}
let boardReadsMemory: Record<string, string> = {}
let topicActivityVersion = 0
let cacheLoaded = false
let cacheGeneration = 0
let loadInFlight: Promise<void> | null = null

let storagePlayerId: number | null = null
let readsApi: ForumReadsApi | null = null
let hydratedPlayerId: number | null = null
let hydratedAt = 0
let hydrateSeq = 0
let hydrateInFlight: Promise<void> | null = null

const FIRST_VISIT_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000
const HYDRATE_CACHE_MS = 15_000

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

function emptyState(): ForumReadState {
  return {
    lastSeenAt: null,
    topicBaseline: null,
    topicReads: {},
    boardReads: {},
  }
}

function parseIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

function parseReadMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [id, seenAt] of Object.entries(value as Record<string, unknown>)) {
    const iso = parseIso(seenAt)
    const numericId = Number(id)
    if (!iso || !Number.isFinite(numericId) || numericId <= 0) continue
    out[String(numericId)] = iso
  }
  return out
}

function parseReadList(value: unknown, idKey: string): Record<string, string> {
  if (!Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const id = Number(record[idKey])
    const seenAt = parseIso(record.seenAt)
    if (!Number.isFinite(id) || id <= 0 || !seenAt) continue
    out[String(id)] = seenAt
  }
  return out
}

export function parseForumReadState(data: unknown): ForumReadState | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  return {
    lastSeenAt: parseIso(record.lastSeenAt),
    topicBaseline: parseIso(record.topicBaseline),
    topicReads: parseReadList(record.topicReads, 'topicId'),
    boardReads: parseReadList(record.boardReads, 'forumId'),
  }
}

function latestTimestamp(
  ...values: (string | null | undefined)[]
): string | null {
  let best: string | null = null
  let bestMs = Number.NEGATIVE_INFINITY
  for (const value of values) {
    if (!value) continue
    const ms = Date.parse(value)
    if (Number.isNaN(ms) || ms <= bestMs) continue
    bestMs = ms
    best = value
  }
  return best
}

function timestampIsNewer(
  candidate: string | null | undefined,
  existing: string | null | undefined,
): boolean {
  if (!candidate) return false
  const candidateMs = Date.parse(candidate)
  if (Number.isNaN(candidateMs)) return false
  if (!existing) return true
  const existingMs = Date.parse(existing)
  if (Number.isNaN(existingMs)) return true
  return candidateMs > existingMs
}

function mergeReadMaps(
  left: Record<string, string>,
  right: Record<string, string>,
): Record<string, string> {
  const merged = {...left}
  for (const [id, seenAt] of Object.entries(right)) {
    merged[id] = latestTimestamp(merged[id], seenAt) ?? seenAt
  }
  return merged
}

function pruneState(state: ForumReadState): ForumReadState {
  const floor = latestTimestamp(state.lastSeenAt, state.topicBaseline)
  const floorMs = floor ? Date.parse(floor) : Number.NaN
  if (!floor || Number.isNaN(floorMs)) return state
  const topicReads: Record<string, string> = {}
  const boardReads: Record<string, string> = {}
  for (const [id, seenAt] of Object.entries(state.topicReads)) {
    const ms = Date.parse(seenAt)
    if (!Number.isNaN(ms) && ms > floorMs) topicReads[id] = seenAt
  }
  for (const [id, seenAt] of Object.entries(state.boardReads)) {
    const ms = Date.parse(seenAt)
    if (!Number.isNaN(ms) && ms > floorMs) boardReads[id] = seenAt
  }
  return {...state, topicReads, boardReads}
}

function mergeStates(left: ForumReadState, right: ForumReadState): ForumReadState {
  return pruneState({
    lastSeenAt: latestTimestamp(left.lastSeenAt, right.lastSeenAt),
    topicBaseline: latestTimestamp(left.topicBaseline, right.topicBaseline),
    topicReads: mergeReadMaps(left.topicReads, right.topicReads),
    boardReads: mergeReadMaps(left.boardReads, right.boardReads),
  })
}

function isEmptyState(state: ForumReadState): boolean {
  return (
    !state.lastSeenAt &&
    !state.topicBaseline &&
    Object.keys(state.topicReads).length === 0 &&
    Object.keys(state.boardReads).length === 0
  )
}

function snapshot(): ForumReadState {
  return {
    lastSeenAt: lastSeenMemory,
    topicBaseline: topicBaselineMemory,
    topicReads: {...topicReadsMemory},
    boardReads: {...boardReadsMemory},
  }
}

function applyState(state: ForumReadState) {
  lastSeenMemory = state.lastSeenAt
  topicBaselineMemory = state.topicBaseline
  topicReadsMemory = state.topicReads
  boardReadsMemory = state.boardReads
  cacheLoaded = true
}

function storageKey(playerId: number) {
  return `forums_read_state:${playerId}`
}

function resetMemory() {
  cacheGeneration += 1
  hydrateSeq += 1
  hydrateInFlight = null
  hydratedPlayerId = null
  hydratedAt = 0
  loadInFlight = null
  lastSeenMemory = null
  topicBaselineMemory = null
  topicReadsMemory = {}
  boardReadsMemory = {}
  cacheLoaded = false
  setHasNewForumPosts(false)
  emitTopicActivity()
}

/** Binds forum read sync to the signed-in player. Changing player clears the in-memory cache. */
export function configureForumReadsSession(
  playerId: number | null,
  api: ForumReadsApi | null,
) {
  readsApi = api
  if (storagePlayerId === playerId) return
  storagePlayerId = playerId
  resetMemory()
}

async function readLegacy(): Promise<ForumReadState> {
  try {
    const pairs = await AsyncStorage.multiGet([...LEGACY_READ_KEYS])
    const byKey = new Map(pairs)
    return {
      lastSeenAt: parseIso(byKey.get(FORUMS_LAST_SEEN_KEY)),
      topicBaseline: parseIso(byKey.get(FORUMS_TOPIC_BASELINE_KEY)),
      topicReads: parseReadMap(
        byKey.get(FORUMS_TOPIC_READS_KEY)
          ? JSON.parse(byKey.get(FORUMS_TOPIC_READS_KEY) as string)
          : null,
      ),
      boardReads: parseReadMap(
        byKey.get(FORUMS_BOARD_READS_KEY)
          ? JSON.parse(byKey.get(FORUMS_BOARD_READS_KEY) as string)
          : null,
      ),
    }
  } catch {
    return emptyState()
  }
}

async function readBlob(playerId: number): Promise<ForumReadState> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(playerId))
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      lastSeenAt: parseIso(parsed.lastSeenAt),
      topicBaseline: parseIso(parsed.topicBaseline),
      topicReads: parseReadMap(parsed.topicReads),
      boardReads: parseReadMap(parsed.boardReads),
    }
  } catch {
    return emptyState()
  }
}

async function loadFromDisk() {
  const generation = cacheGeneration
  const playerId = storagePlayerId
  let state = emptyState()
  if (playerId != null) {
    const [saved, legacy] = await Promise.all([
      readBlob(playerId),
      readLegacy(),
    ])
    state = mergeStates(saved, legacy)
    if (!isEmptyState(legacy)) {
      await AsyncStorage.multiRemove([...LEGACY_READ_KEYS])
      await AsyncStorage.setItem(storageKey(playerId), JSON.stringify(state))
    }
  } else {
    state = await readLegacy()
  }
  if (generation !== cacheGeneration || playerId !== storagePlayerId) return
  applyState(state)
}

async function ensureLoaded() {
  if (cacheLoaded) return
  if (!loadInFlight) {
    loadInFlight = loadFromDisk().finally(() => {
      loadInFlight = null
    })
  }
  await loadInFlight
}

async function persistSnapshot() {
  const state = pruneState(snapshot())
  applyState(state)
  try {
    if (storagePlayerId != null) {
      await AsyncStorage.setItem(
        storageKey(storagePlayerId),
        JSON.stringify(state),
      )
      return
    }
    await AsyncStorage.multiSet([
      [FORUMS_TOPIC_READS_KEY, JSON.stringify(state.topicReads)],
      [FORUMS_BOARD_READS_KEY, JSON.stringify(state.boardReads)],
    ])
    if (state.lastSeenAt) {
      await AsyncStorage.setItem(FORUMS_LAST_SEEN_KEY, state.lastSeenAt)
    } else {
      await AsyncStorage.removeItem(FORUMS_LAST_SEEN_KEY)
    }
    if (state.topicBaseline) {
      await AsyncStorage.setItem(FORUMS_TOPIC_BASELINE_KEY, state.topicBaseline)
    } else {
      await AsyncStorage.removeItem(FORUMS_TOPIC_BASELINE_KEY)
    }
  } catch (e) {
    console.error('Error saving forum read state:', e)
  }
}

function pushPartial(partial: ForumReadPush) {
  const api = readsApi
  if (!api || storagePlayerId == null) return
  void api.pushState(partial).catch(e => {
    console.error('Error saving forum reads to account:', e)
  })
}

function buildPush(
  merged: ForumReadState,
  server: ForumReadState,
): ForumReadPush | null {
  const push: ForumReadPush = {}
  if (timestampIsNewer(merged.lastSeenAt, server.lastSeenAt)) {
    push.lastSeenAt = merged.lastSeenAt
  }
  if (timestampIsNewer(merged.topicBaseline, server.topicBaseline)) {
    push.topicBaseline = merged.topicBaseline
  }
  const topicReads: {topicId: number; seenAt: string}[] = []
  for (const [id, seenAt] of Object.entries(merged.topicReads)) {
    if (!timestampIsNewer(seenAt, server.topicReads[id])) continue
    topicReads.push({topicId: Number(id), seenAt})
  }
  if (topicReads.length > 0) push.topicReads = topicReads
  const boardReads: {forumId: number; seenAt: string}[] = []
  for (const [id, seenAt] of Object.entries(merged.boardReads)) {
    if (!timestampIsNewer(seenAt, server.boardReads[id])) continue
    boardReads.push({forumId: Number(id), seenAt})
  }
  if (boardReads.length > 0) push.boardReads = boardReads
  if (
    push.lastSeenAt == null &&
    push.topicBaseline == null &&
    !push.topicReads &&
    !push.boardReads
  ) {
    return null
  }
  return push
}

async function doHydrate(seq: number) {
  await ensureLoaded()
  const api = readsApi
  const playerId = storagePlayerId
  if (playerId == null || !api) return
  let server: ForumReadState | null = null
  try {
    server = await api.fetchState()
  } catch (e) {
    console.error('Error loading forum reads:', e)
    return
  }
  if (!server) return
  if (seq !== hydrateSeq || playerId !== storagePlayerId) return

  let merged = mergeStates(snapshot(), server)
  if (!merged.lastSeenAt && !merged.topicBaseline) {
    merged = pruneState({
      ...merged,
      topicBaseline: new Date(Date.now() - FIRST_VISIT_LOOKBACK_MS).toISOString(),
    })
  }
  if (seq !== hydrateSeq || playerId !== storagePlayerId) return
  applyState(merged)
  await persistSnapshot()
  const delta = buildPush(snapshot(), server)
  if (delta) {
    try {
      await api.pushState(delta)
    } catch (e) {
      console.error('Error saving forum reads to account:', e)
    }
  }
  if (seq !== hydrateSeq || playerId !== storagePlayerId) return
  hydratedPlayerId = playerId
  hydratedAt = Date.now()
  emitTopicActivity()
}

/** Loads account read state and uploads any newer on-device reads. */
export async function hydrateForumReadsFromServer(options?: {force?: boolean}) {
  if (hydrateInFlight) return hydrateInFlight
  const fresh =
    !options?.force &&
    storagePlayerId != null &&
    hydratedPlayerId === storagePlayerId &&
    Date.now() - hydratedAt < HYDRATE_CACHE_MS
  if (fresh) return
  const seq = hydrateSeq
  hydrateInFlight = doHydrate(seq).finally(() => {
    if (hydrateSeq === seq) hydrateInFlight = null
  })
  return hydrateInFlight
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

export async function getForumsLastSeenAt(): Promise<string | null> {
  await ensureLoaded()
  return lastSeenMemory
}

function coveredByFloor(seenAt: string): boolean {
  const floor = latestTimestamp(topicBaselineMemory, lastSeenMemory)
  if (!floor) return false
  const seenMs = Date.parse(seenAt)
  const floorMs = Date.parse(floor)
  return !Number.isNaN(seenMs) && !Number.isNaN(floorMs) && seenMs <= floorMs
}

export async function topicHasNewPosts(
  topicId: number,
  lastPostAt: string | null,
): Promise<boolean> {
  if (!lastPostAt) {
    return false
  }
  await ensureForumUnreadBaseline()
  await ensureLoaded()
  const threshold = latestTimestamp(
    topicReadsMemory[String(topicId)],
    topicBaselineMemory,
    lastSeenMemory,
  )
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
  await ensureLoaded()
  const threshold = latestTimestamp(
    boardReadsMemory[String(boardId)],
    topicBaselineMemory,
    lastSeenMemory,
  )
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
  await hydrateForumReadsFromServer()
  await ensureLoaded()
  const key = String(topicId)
  const seenAt = laterTimestamp(
    laterTimestamp(new Date().toISOString(), lastPostAt),
    topicReadsMemory[key],
  )
  if (topicReadsMemory[key] === seenAt || coveredByFloor(seenAt)) {
    return
  }
  topicReadsMemory = {...topicReadsMemory, [key]: seenAt}
  cacheLoaded = true
  await persistSnapshot()
  pushPartial({topicReads: [{topicId, seenAt}]})
  emitTopicActivity()
}

export async function syncBoardSeenFromTopics(
  boardId: number,
  boardLastPostAt: string | null,
  topics: {id: number; last_post_at: string | null}[],
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
  await hydrateForumReadsFromServer()
  await ensureLoaded()
  const key = String(boardId)
  const seenAt = laterTimestamp(
    laterTimestamp(new Date().toISOString(), lastPostAt),
    boardReadsMemory[key],
  )
  if (boardReadsMemory[key] === seenAt || coveredByFloor(seenAt)) {
    return
  }
  boardReadsMemory = {...boardReadsMemory, [key]: seenAt}
  cacheLoaded = true
  await persistSnapshot()
  pushPartial({boardReads: [{forumId: boardId, seenAt}]})
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

  // No account cursor yet (offline, or the read state has not loaded). Don't
  // invent one — that would mark every post read and upload it.
  if (!lastSeenMemory && !topicBaselineMemory) {
    setHasNewForumPosts(forums.some(forum => Boolean(forum.last_post_at)))
    return
  }

  const latestPostAt = latestForumPostAtForGlobalBadge(categories)
  const seenAt = laterTimestamp(new Date().toISOString(), latestPostAt)
  if (lastSeenMemory === seenAt || coveredByFloor(seenAt)) {
    setHasNewForumPosts(false)
    return
  }
  lastSeenMemory = seenAt
  cacheLoaded = true
  setHasNewForumPosts(false)
  await persistSnapshot()
  pushPartial({lastSeenAt: seenAt})
}

/**
 * Loads the account read cursor before unread dots are calculated.
 * A brand-new account uses a 30-day lookback so recent posts still show as new.
 */
export async function ensureForumUnreadBaseline() {
  await hydrateForumReadsFromServer()
}

/** Clears global + board + topic indicators until a newer post/reply appears. */
export async function markAllForumsRead(latestPostAt?: string | null) {
  seenGeneration += 1
  await hydrateForumReadsFromServer()
  await ensureLoaded()
  const now = new Date().toISOString()
  const seenAt = laterTimestamp(now, latestPostAt)

  lastSeenMemory = seenAt
  topicBaselineMemory = seenAt
  topicReadsMemory = {}
  boardReadsMemory = {}
  cacheLoaded = true
  setHasNewForumPosts(false)
  await persistSnapshot()
  pushPartial({lastSeenAt: seenAt, topicBaseline: seenAt})
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
    await hydrateForumReadsFromServer()
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
