import {useSyncExternalStore} from 'react'

type Listener = () => void

let unreadCount = 0
let generation = 0
const listeners = new Set<Listener>()

function emit() {
  generation += 1
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeAdminSupportUnread(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getAdminSupportUnreadCount() {
  return unreadCount
}

export function setAdminSupportUnreadCount(value: number) {
  const next = Math.max(0, Math.floor(value) || 0)
  if (unreadCount === next) {
    return
  }
  unreadCount = next
  emit()
}

export function useAdminSupportUnreadCount() {
  return useSyncExternalStore(
    subscribeAdminSupportUnread,
    getAdminSupportUnreadCount,
    () => 0,
  )
}

export async function refreshAdminSupportUnread(
  fetchCount: () => Promise<number>,
) {
  try {
    const count = await fetchCount()
    setAdminSupportUnreadCount(count)
  } catch (e) {
    console.error('Failed to refresh admin support unread state:', e)
  }
}

export function getAdminSupportUnreadGeneration() {
  return generation
}
