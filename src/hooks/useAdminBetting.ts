import {useNetwork} from '@/hooks/useNetwork'
import React from 'react'

export type AdminBetStatus = 'pending' | 'won' | 'lost' | 'push' | 'void'

export type AdminBettingActivityItem = {
  id: number
  player_id: number
  player_name: string
  match_id: number
  match_date: string | null
  home_team_short_name: string
  away_team_short_name: string
  market_type: string
  line: number | null
  selection_key: string
  stake: number
  odds: number
  potential_payout: number
  status: AdminBetStatus
  payout: number
  placed_at: string
  settled_at: string | null
}

export type AdminBettingSummary = {
  opted_in_accounts: number
  pending_stake_total: number
  won_payout_total: number
  counts: Record<AdminBetStatus | 'all', number>
}

type ActivityResult = {
  summary: AdminBettingSummary | null
  items: AdminBettingActivityItem[]
  total: number
  page: number
  pageSize: number
  error?: string
}

export function useAdminBetting() {
  const network = useNetwork()
  const networkRef = React.useRef(network)
  networkRef.current = network

  const listActivity = React.useCallback(
    async (options?: {
      status?: AdminBetStatus | 'all'
      q?: string
      matchId?: number
      page?: number
      pageSize?: number
    }): Promise<ActivityResult> => {
      const page = options?.page ?? 1
      const pageSize = options?.pageSize ?? 50
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (options?.status && options.status !== 'all') {
        params.set('status', options.status)
      }
      if (options?.q?.trim()) {
        params.set('q', options.q.trim())
      }
      if (options?.matchId && options.matchId > 0) {
        params.set('match_id', String(options.matchId))
      }
      const res = await networkRef.current.Get(
        `/admin/betting/activity?${params.toString()}`,
      )
      if (res?.status === 'ok') {
        return {
          summary: (res.summary as AdminBettingSummary) ?? null,
          items: (res.items as AdminBettingActivityItem[]) ?? [],
          total: Number(res.total) || 0,
          page: Number(res.page) || page,
          pageSize: Number(res.pageSize) || pageSize,
        }
      }
      return {
        summary: null,
        items: [],
        total: 0,
        page,
        pageSize,
        error: res?.error ?? 'request_failed',
      }
    },
    [],
  )

  return {listActivity}
}
