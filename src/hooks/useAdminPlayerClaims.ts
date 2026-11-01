import {useNetwork} from '@/hooks/useNetwork'
import React from 'react'
import type {ClaimRequest} from '@/hooks/usePlayerClaim'

export function useAdminPlayerClaims() {
  const network = useNetwork()
  const networkRef = React.useRef(network)
  networkRef.current = network

  const listPending = React.useCallback(async (): Promise<{
    data: ClaimRequest[]
    error?: string
  }> => {
    const res = await networkRef.current.Get(
      '/admin/player/claims?scope=pending',
    )
    if (res?.status === 'ok') {
      return {data: (res.data as ClaimRequest[]) ?? []}
    }
    return {data: [], error: res?.error || 'failed'}
  }, [])

  const listHistory = React.useCallback(async (): Promise<{
    data: ClaimRequest[]
    error?: string
  }> => {
    const res = await networkRef.current.Get(
      '/admin/player/claims?scope=history',
    )
    if (res?.status === 'ok') {
      return {data: (res.data as ClaimRequest[]) ?? []}
    }
    return {data: [], error: res?.error || 'failed'}
  }, [])

  const approve = React.useCallback(async (id: number) => {
    const res = await networkRef.current.Post(
      `/admin/player/claims/${id}/approve`,
      {},
    )
    if (res?.status === 'ok') return {status: 'ok' as const}
    return {status: 'error' as const, error: res?.error || 'failed'}
  }, [])

  const deny = React.useCallback(async (id: number) => {
    const res = await networkRef.current.Post(
      `/admin/player/claims/${id}/deny`,
      {},
    )
    if (res?.status === 'ok') return {status: 'ok' as const}
    return {status: 'error' as const, error: res?.error || 'failed'}
  }, [])

  return {listPending, listHistory, approve, deny}
}
