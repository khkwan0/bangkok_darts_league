import {useNetwork} from '@/hooks/useNetwork'
import React from 'react'

export type LastSeenPlatform = 'ios' | 'android' | 'web'

export type AdminLastSeenRow = {
  player_id: number
  nickname: string | null
  firstname: string | null
  lastname: string | null
  last_seen_at: string
  last_platform: LastSeenPlatform
  platforms: Partial<Record<LastSeenPlatform, string>>
}

export type LastSeenRedisKeyUsage = {
  key: string
  bytes: number | null
  fields: number
}

export type LastSeenRedisUsage = {
  total_bytes: number | null
  keys: LastSeenRedisKeyUsage[]
}

export type LastSeenSnapshotSummary = {
  id: number
  created_at: string
  created_by: number | null
  created_by_nickname: string | null
  player_count: number
  redis_bytes: number | null
}

export function useAdminLastSeen() {
  const network = useNetwork()
  const networkRef = React.useRef(network)
  networkRef.current = network

  const listLastSeen = React.useCallback(async (): Promise<{
    data: AdminLastSeenRow[]
    usage: LastSeenRedisUsage | null
    canFlush: boolean
    snapshots: LastSeenSnapshotSummary[]
    error?: string
  }> => {
    const res = await networkRef.current.Get('/admin/last-seen')
    if (res?.status === 'ok' && Array.isArray(res.data)) {
      return {
        data: res.data as AdminLastSeenRow[],
        usage: (res.usage as LastSeenRedisUsage) ?? null,
        canFlush: res.can_flush === true,
        snapshots: Array.isArray(res.snapshots)
          ? (res.snapshots as LastSeenSnapshotSummary[])
          : [],
      }
    }
    return {
      data: [],
      usage: null,
      canFlush: false,
      snapshots: [],
      error: res?.error || 'failed',
    }
  }, [])

  const getLastSeenSnapshot = React.useCallback(
    async (
      id: number,
    ): Promise<{
      data: AdminLastSeenRow[]
      snapshot: LastSeenSnapshotSummary | null
      error?: string
    }> => {
      const res = await networkRef.current.Get(
        `/admin/last-seen?snapshot=${id}`,
      )
      if (res?.status === 'ok' && Array.isArray(res.data)) {
        return {
          data: res.data as AdminLastSeenRow[],
          snapshot: (res.snapshot as LastSeenSnapshotSummary) ?? null,
        }
      }
      return {
        data: [],
        snapshot: null,
        error: res?.error || 'failed',
      }
    },
    [],
  )

  const flushLastSeen = React.useCallback(async (): Promise<{
    usage: LastSeenRedisUsage | null
    snapshot: LastSeenSnapshotSummary | null
    error?: string
  }> => {
    const res = await networkRef.current.Delete('/admin/last-seen')
    if (res?.status === 'ok') {
      return {
        usage: (res.usage as LastSeenRedisUsage) ?? null,
        snapshot: (res.snapshot as LastSeenSnapshotSummary) ?? null,
      }
    }
    return {
      usage: null,
      snapshot: null,
      error: res?.error || 'failed',
    }
  }, [])

  return {listLastSeen, getLastSeenSnapshot, flushLastSeen}
}
