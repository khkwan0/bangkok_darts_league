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

export function useAdminLastSeen() {
  const network = useNetwork()
  const networkRef = React.useRef(network)
  networkRef.current = network

  const listLastSeen = React.useCallback(async (): Promise<{
    data: AdminLastSeenRow[]
    usage: LastSeenRedisUsage | null
    canFlush: boolean
    error?: string
  }> => {
    const res = await networkRef.current.Get('/admin/last-seen')
    if (res?.status === 'ok' && Array.isArray(res.data)) {
      return {
        data: res.data as AdminLastSeenRow[],
        usage: (res.usage as LastSeenRedisUsage) ?? null,
        canFlush: res.can_flush === true,
      }
    }
    return {
      data: [],
      usage: null,
      canFlush: false,
      error: res?.error || 'failed',
    }
  }, [])

  const flushLastSeen = React.useCallback(async (): Promise<{
    usage: LastSeenRedisUsage | null
    error?: string
  }> => {
    const res = await networkRef.current.Delete('/admin/last-seen')
    if (res?.status === 'ok') {
      return {usage: (res.usage as LastSeenRedisUsage) ?? null}
    }
    return {
      usage: null,
      error: res?.error || 'failed',
    }
  }, [])

  return {listLastSeen, flushLastSeen}
}
