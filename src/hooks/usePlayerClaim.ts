import {useNetwork} from '@/hooks/useNetwork'
import React from 'react'

export type ClaimableShell = {
  id: number
  nickname: string
  firstname: string | null
  lastname: string | null
  profile_picture: string | null
  teams: Array<{id: number; name: string; short_name: string | null}>
  frame_count: number
  darts_leg_count: number
  has_history: boolean
}

export type ClaimRequest = {
  id: number
  claimant_player_id: number
  shell_player_id: number
  status: number
  created_at: string
  resolved_at: string | null
  resolved_by: number | null
  claimant_nickname?: string | null
  shell_nickname?: string | null
  resolved_by_nickname?: string | null
  shell_teams?: Array<{id: number; name: string}>
}

export function usePlayerClaim() {
  const network = useNetwork()
  const networkRef = React.useRef(network)
  networkRef.current = network

  const search = React.useCallback(async (q: string) => {
    const res = await networkRef.current.Get(
      `/player/claim/search?q=${encodeURIComponent(q)}`,
    )
    if (res?.status === 'ok') {
      return {data: (res.data as ClaimableShell[]) ?? []}
    }
    return {data: [] as ClaimableShell[], error: res?.error || 'failed'}
  }, [])

  const preview = React.useCallback(async (shellId: number) => {
    const res = await networkRef.current.Get(
      `/player/claim/preview/${shellId}`,
    )
    if (res?.status === 'ok') {
      return {data: res.data as {
        shell: ClaimableShell
        approver_count: number
        needs_admin: boolean
      }}
    }
    return {error: res?.error || 'failed'}
  }, [])

  const create = React.useCallback(async (shellPlayerId: number) => {
    const res = await networkRef.current.Post('/player/claim', {
      shellPlayerId,
    })
    if (res?.status === 'ok') {
      return {data: res.data as {id: number; status: string}}
    }
    return {error: res?.error || 'failed'}
  }, [])

  const listMine = React.useCallback(async () => {
    const res = await networkRef.current.Get('/player/claim/mine')
    if (res?.status === 'ok') {
      return {data: (res.data as ClaimRequest[]) ?? []}
    }
    return {data: [] as ClaimRequest[], error: res?.error || 'failed'}
  }, [])

  const listInbox = React.useCallback(async () => {
    const res = await networkRef.current.Get('/player/claim/inbox')
    if (res?.status === 'ok') {
      return {data: (res.data as ClaimRequest[]) ?? []}
    }
    return {data: [] as ClaimRequest[], error: res?.error || 'failed'}
  }, [])

  const approve = React.useCallback(async (id: number) => {
    const res = await networkRef.current.Post(
      `/player/claim/${id}/approve`,
      {},
    )
    if (res?.status === 'ok') return {status: 'ok' as const}
    return {status: 'error' as const, error: res?.error || 'failed'}
  }, [])

  const deny = React.useCallback(async (id: number) => {
    const res = await networkRef.current.Post(`/player/claim/${id}/deny`, {})
    if (res?.status === 'ok') return {status: 'ok' as const}
    return {status: 'error' as const, error: res?.error || 'failed'}
  }, [])

  const cancel = React.useCallback(async (id: number) => {
    const res = await networkRef.current.Post(
      `/player/claim/${id}/cancel`,
      {},
    )
    if (res?.status === 'ok') return {status: 'ok' as const}
    return {status: 'error' as const, error: res?.error || 'failed'}
  }, [])

  return {
    search,
    preview,
    create,
    listMine,
    listInbox,
    approve,
    deny,
    cancel,
  }
}
