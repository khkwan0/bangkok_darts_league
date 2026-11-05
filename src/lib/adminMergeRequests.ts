import {useSyncExternalStore} from 'react'

type Listener = () => void

let pendingCount = 0
let generation = 0
const listeners = new Set<Listener>()

function emit() {
  generation += 1
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeAdminMergeRequests(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getAdminMergeRequestCount() {
  return pendingCount
}

export function setAdminMergeRequestCount(value: number) {
  const next = Math.max(0, Math.floor(value) || 0)
  if (pendingCount === next) {
    return
  }
  pendingCount = next
  emit()
}

export function useAdminMergeRequestCount() {
  return useSyncExternalStore(
    subscribeAdminMergeRequests,
    getAdminMergeRequestCount,
    () => 0,
  )
}

export async function refreshAdminMergeRequests(
  fetchCount: () => Promise<number>,
) {
  try {
    const count = await fetchCount()
    setAdminMergeRequestCount(count)
  } catch (e) {
    console.error('Failed to refresh pending merge requests:', e)
  }
}

export function getAdminMergeRequestGeneration() {
  return generation
}
