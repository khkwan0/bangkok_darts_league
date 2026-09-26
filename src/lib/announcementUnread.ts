import {
  type AnnouncementReadMap,
  hasLatestUnreadAnnouncement,
} from '@/lib/announcementReads'
import {useSyncExternalStore} from 'react'

type AnnouncementListItem = {
  id: number
  modified_at: string
  read_at?: string | null
}

type Listener = () => void

let hasUnread = false
let generation = 0
const listeners = new Set<Listener>()

function emit() {
  generation += 1
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeAnnouncementUnread(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getHasUnreadAnnouncements() {
  return hasUnread
}

export function setHasUnreadAnnouncements(value: boolean) {
  if (hasUnread === value) {
    return
  }
  hasUnread = value
  emit()
}

export function useHasUnreadAnnouncements() {
  return useSyncExternalStore(
    subscribeAnnouncementUnread,
    getHasUnreadAnnouncements,
    () => false,
  )
}

export function syncAnnouncementUnreadFromList(
  items: AnnouncementListItem[],
  localReads: AnnouncementReadMap,
) {
  setHasUnreadAnnouncements(hasLatestUnreadAnnouncement(items, localReads))
}

export async function refreshAnnouncementUnread(
  fetchHasUnread: () => Promise<boolean>,
) {
  try {
    const value = await fetchHasUnread()
    setHasUnreadAnnouncements(value)
  } catch (e) {
    console.error('Failed to refresh announcement unread state:', e)
  }
}

export function getAnnouncementUnreadGeneration() {
  return generation
}
