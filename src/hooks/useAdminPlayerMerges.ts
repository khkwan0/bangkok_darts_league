import {useNetwork} from '@/hooks/useNetwork'
import React from 'react'

export type AdminMergeRequest = {
  merge_request_id: number
  player_id: number
  player_nickname: string
  target_id: number
  target_name: string
  created_at: string
}

export type AdminPlayerMergeRecord = {
  alt_player_id: number
  master_player_id: number
  alt_nickname: string | null
  master_nickname: string | null
  merged_at: string
  source: string
  active: boolean
  merge_request_id?: number
  merge_log_id?: number
  transfer_stats?: boolean
  transferred_frames_count?: number
  transferred_darts_stats_count?: number
  reverted_at?: string | null
}

export type MergePlayersResult = {
  status: string
  transferred_frames?: number
  transferred_darts_stats?: number
  merge_log_id?: number
  error?: string
}

export type UnmergePlayerResult = {
  status: string
  alt_player_id?: number
  previous_master_player_id?: number
  frames_restored?: number
  darts_stats_restored?: number
  warning?: string
  error?: string
}

export function useAdminPlayerMerges() {
  const network = useNetwork()
  const networkRef = React.useRef(network)
  networkRef.current = network

  const listMergeRequests = React.useCallback(async (): Promise<{
    data: AdminMergeRequest[]
    error?: string
  }> => {
    const res = await networkRef.current.Get('/admin/mergerequests')
    if (res?.status === 'ok') {
      return {data: (res.data as AdminMergeRequest[]) ?? []}
    }
    return {data: [], error: res?.error || 'failed'}
  }, [])

  const acceptMergeRequest = React.useCallback(
    async (requestId: number): Promise<{status: string; error?: string}> => {
      const res = await networkRef.current.Get(
        `/admin/mergerequest/accept/${requestId}`,
      )
      if (res?.status === 'ok') return {status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const denyMergeRequest = React.useCallback(
    async (requestId: number): Promise<{status: string; error?: string}> => {
      const res = await networkRef.current.Get(
        `/admin/mergerequest/deny/${requestId}`,
      )
      if (res?.status === 'ok') return {status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const mergePlayers = React.useCallback(
    async (options: {
      altPlayerId: number
      masterPlayerId: number
      transferStats?: boolean
    }): Promise<MergePlayersResult> => {
      const res = await networkRef.current.Put('/admin/player/merge', {
        altPlayerId: options.altPlayerId,
        masterPlayerId: options.masterPlayerId,
        transferStats: Boolean(options.transferStats),
      })
      if (res?.status === 'ok') {
        return {
          status: 'ok',
          transferred_frames: Number(res.transferred_frames) || 0,
          transferred_darts_stats: Number(res.transferred_darts_stats) || 0,
          merge_log_id:
            res.merge_log_id != null ? Number(res.merge_log_id) : undefined,
        }
      }
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const unmergePlayer = React.useCallback(
    async (playerId: number): Promise<UnmergePlayerResult> => {
      const res = await networkRef.current.Put('/admin/player/unmerge', {
        playerId,
      })
      if (res?.status === 'ok') {
        return {
          status: 'ok',
          alt_player_id: Number(res.alt_player_id) || playerId,
          previous_master_player_id:
            Number(res.previous_master_player_id) || undefined,
          frames_restored: Number(res.frames_restored) || 0,
          darts_stats_restored: Number(res.darts_stats_restored) || 0,
          warning: res.warning,
        }
      }
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const listMerges = React.useCallback(async (): Promise<{
    data: AdminPlayerMergeRecord[]
    error?: string
  }> => {
    const res = await networkRef.current.Get('/admin/player/merges')
    if (res?.status === 'ok') {
      return {data: (res.data as AdminPlayerMergeRecord[]) ?? []}
    }
    return {data: [], error: res?.error || 'failed'}
  }, [])

  return {
    listMergeRequests,
    acceptMergeRequest,
    denyMergeRequest,
    mergePlayers,
    unmergePlayer,
    listMerges,
  }
}
