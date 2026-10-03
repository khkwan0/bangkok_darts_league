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

export function subscribeSupportUnread(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSupportUnreadCount() {
  return unreadCount
}

export function setSupportUnreadCount(value: number) {
  const next = Math.max(0, Math.floor(value) || 0)
  if (unreadCount === next) {
    return
  }
  unreadCount = next
  emit()
}

export function useSupportUnreadCount() {
  return useSyncExternalStore(
    subscribeSupportUnread,
    getSupportUnreadCount,
    () => 0,
  )
}

export function useHasUnreadSupport() {
  return useSupportUnreadCount() > 0
}

export async function refreshSupportUnread(
  fetchCount: () => Promise<number>,
) {
  try {
    const count = await fetchCount()
    setSupportUnreadCount(count)
  } catch (e) {
    console.error('Failed to refresh support unread state:', e)
  }
}

export function getSupportUnreadGeneration() {
  return generation
}
