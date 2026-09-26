import AsyncStorage from '@react-native-async-storage/async-storage'

export const ANNOUNCEMENT_READS_KEY = 'announcement_reads'

/** Announcements older than this are never treated as unread. */
export const ANNOUNCEMENT_DIALOG_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

export type AnnouncementReadMap = Record<string, string>

export type AnnouncementReadSyncItem = {
  announcementId: number
  readAt: string
}

type AnnouncementTimestamps = {
  id: number
  modified_at: string
  read_at?: string | null
}

function parseReadMap(raw: string | null): AnnouncementReadMap {
  if (!raw) {
    return {}
  }
  try {
    const parsed = JSON.parse(raw) as AnnouncementReadMap
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // ignore corrupt storage
  }
  return {}
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

export function isAnnouncementUnread(
  modifiedAt: string,
  readAt: string | null | undefined,
): boolean {
  if (!readAt) {
    return true
  }
  const modMs = Date.parse(modifiedAt)
  const readMs = Date.parse(readAt)
  if (Number.isNaN(modMs)) {
    return false
  }
  if (Number.isNaN(readMs)) {
    return true
  }
  return modMs > readMs
}

export function isAnnouncementWithinUnreadWindow(
  modifiedAt: string | null | undefined,
): boolean {
  if (!modifiedAt) {
    return false
  }
  const modifiedMs = Date.parse(modifiedAt)
  if (Number.isNaN(modifiedMs)) {
    return false
  }
  return Date.now() - modifiedMs < ANNOUNCEMENT_DIALOG_MAX_AGE_MS
}

/** @deprecated Use isAnnouncementWithinUnreadWindow */
export function isAnnouncementRecentForDialog(
  modifiedAt: string | null | undefined,
): boolean {
  return isAnnouncementWithinUnreadWindow(modifiedAt)
}

export async function getLocalAnnouncementReads(): Promise<AnnouncementReadMap> {
  try {
    const raw = await AsyncStorage.getItem(ANNOUNCEMENT_READS_KEY)
    return parseReadMap(raw)
  } catch {
    return {}
  }
}

async function saveLocalAnnouncementReads(reads: AnnouncementReadMap) {
  await AsyncStorage.setItem(ANNOUNCEMENT_READS_KEY, JSON.stringify(reads))
}

export async function markAnnouncementReadLocal(
  announcementId: number,
  readAt?: string,
) {
  const reads = await getLocalAnnouncementReads()
  const key = String(announcementId)
  const seenAt = laterTimestamp(readAt ?? new Date().toISOString(), reads[key])
  reads[key] = seenAt
  await saveLocalAnnouncementReads(reads)
}

export function getMergedReadAt(
  announcementId: number,
  localReads: AnnouncementReadMap,
  backendReadAt?: string | null,
): string | null {
  const local = localReads[String(announcementId)]
  if (local && backendReadAt) {
    return laterTimestamp(local, backendReadAt)
  }
  return local ?? backendReadAt ?? null
}

export function isAnnouncementUnreadMerged(
  announcement: AnnouncementTimestamps,
  localReads: AnnouncementReadMap,
): boolean {
  if (!isAnnouncementWithinUnreadWindow(announcement.modified_at)) {
    return false
  }
  const readAt = getMergedReadAt(
    announcement.id,
    localReads,
    announcement.read_at,
  )
  return isAnnouncementUnread(announcement.modified_at, readAt)
}

export function findLatestAnnouncementForDialog<
  T extends AnnouncementTimestamps,
>(announcements: T[], localReads: AnnouncementReadMap): T | null {
  const latest = announcements[0]
  if (!latest || !isAnnouncementUnreadMerged(latest, localReads)) {
    return null
  }
  return latest
}

/** @deprecated Use findLatestAnnouncementForDialog */
export function findNewestUnreadAnnouncementForDialog<
  T extends AnnouncementTimestamps,
>(announcements: T[], localReads: AnnouncementReadMap): T | null {
  return findLatestAnnouncementForDialog(announcements, localReads)
}

export function hasLatestUnreadAnnouncement<T extends AnnouncementTimestamps>(
  announcements: T[],
  localReads: AnnouncementReadMap,
): boolean {
  return findLatestAnnouncementForDialog(announcements, localReads) != null
}

export function findNewestUnreadAnnouncement<T extends AnnouncementTimestamps>(
  announcements: T[],
  localReads: AnnouncementReadMap,
): T | null {
  for (const item of announcements) {
    if (isAnnouncementUnreadMerged(item, localReads)) {
      return item
    }
  }
  return null
}

export function hasAnyUnreadAnnouncement<T extends AnnouncementTimestamps>(
  announcements: T[],
  localReads: AnnouncementReadMap,
): boolean {
  return announcements.some(item => isAnnouncementUnreadMerged(item, localReads))
}

export async function syncAnnouncementReadsWithBackend(
  fetchBackendReads: () => Promise<AnnouncementReadSyncItem[]>,
  pushReadsToBackend: (reads: AnnouncementReadSyncItem[]) => Promise<void>,
): Promise<AnnouncementReadMap> {
  const localReads = await getLocalAnnouncementReads()
  let backendReads: AnnouncementReadSyncItem[] = []

  try {
    backendReads = await fetchBackendReads()
  } catch (e) {
    console.error('Failed to fetch backend announcement reads:', e)
    return localReads
  }

  const backendById = new Map(
    backendReads.map(item => [String(item.announcementId), item.readAt]),
  )
  const toPush: AnnouncementReadSyncItem[] = []
  const merged: AnnouncementReadMap = {...localReads}

  for (const [id, backendAt] of backendById.entries()) {
    const localAt = localReads[id]
    if (localAt && Date.parse(localAt) > Date.parse(backendAt)) {
      toPush.push({announcementId: Number(id), readAt: localAt})
      merged[id] = localAt
    } else {
      merged[id] = laterTimestamp(backendAt, localAt)
    }
  }

  for (const [id, localAt] of Object.entries(localReads)) {
    if (!backendById.has(id)) {
      toPush.push({announcementId: Number(id), readAt: localAt})
      merged[id] = localAt
    }
  }

  if (toPush.length > 0) {
    try {
      await pushReadsToBackend(toPush)
    } catch (e) {
      console.error('Failed to push announcement reads to backend:', e)
    }
  }

  await saveLocalAnnouncementReads(merged)
  return merged
}
