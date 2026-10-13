import {useLeagueContext} from '@/context/LeagueContext'
import {useNetwork} from '@/hooks/useNetwork'
import React from 'react'

export type BettingMarketType = 'moneyline' | 'spread' | 'total'
export type BettingSelectionKey = 'home' | 'away' | 'over' | 'under'

export type BettingSelection = {
  id: number
  selection_key: BettingSelectionKey
  odds: number
  volume: number
}

export type BettingMarket = {
  id: number
  match_id: number
  market_type: BettingMarketType
  line: number | null
  status: 'open' | 'locked' | 'settled' | 'void'
  selections: BettingSelection[]
}

export type BettingMatchup = {
  match_id: number
  home_team_id: number
  away_team_id: number
  home_team_name: string
  away_team_name: string
  home_team_short_name: string
  away_team_short_name: string
  home_logo: string | null
  away_logo: string | null
  date: string | null
  home: {
    wins: number
    losses: number
    ties: number
    frames_for: number
    frames_against: number
  }
  away: {
    wins: number
    losses: number
    ties: number
    frames_for: number
    frames_against: number
  }
}

export type BettingBetStatus = 'pending' | 'won' | 'lost' | 'push' | 'void'

export type BettingBet = {
  id: number
  match_id: number
  market_id: number
  match_date: string | null
  home_team_short_name: string
  away_team_short_name: string
  market_type: BettingMarketType | string
  line: number | null
  selection_key: BettingSelectionKey | string
  stake: number
  odds: number
  potential_payout: number
  status: BettingBetStatus
  payout: number
  placed_at: string
  settled_at: string | null
}

export function useBetting() {
  const network = useNetwork()
  const {dispatch} = useLeagueContext()
  const networkRef = React.useRef(network)
  networkRef.current = network

  const refreshAccount = React.useCallback(async () => {
    const res = await networkRef.current.Get('/betting/account')
    if (res?.status === 'ok' && res.data) {
      dispatch({
        type: 'SET_BETTING_OPTED_IN',
        payload: !!res.data.opted_in,
      })
      dispatch({
        type: 'SET_BETTING_BALANCE',
        payload: Number(res.data.balance) || 0,
      })
      return res.data as {
        opted_in: boolean
        balance: number
        opted_in_at: string | null
      }
    }
    return null
  }, [dispatch])

  const optIn = React.useCallback(async () => {
    const res = await networkRef.current.Post('/betting/opt-in', {})
    if (res?.status === 'ok' && res.data) {
      dispatch({type: 'SET_BETTING_OPTED_IN', payload: true})
      dispatch({
        type: 'SET_BETTING_BALANCE',
        payload: Number(res.data.balance) || 0,
      })
      return res.data as {
        opted_in: boolean
        balance: number
        granted: boolean
      }
    }
    return {error: res?.error ?? 'opt_in_failed'}
  }, [dispatch])

  const getMarkets = React.useCallback(async (matchId: number) => {
    const res = await networkRef.current.Get(
      `/betting/markets?matchId=${matchId}`,
    )
    if (res?.status === 'ok' && res.data) {
      return {
        markets: (res.data.markets ?? []) as BettingMarket[],
        matchup: (res.data.matchup ?? null) as BettingMatchup | null,
      }
    }
    return {markets: [] as BettingMarket[], matchup: null as BettingMatchup | null}
  }, [])

  const placeBet = React.useCallback(
    async (input: {
      matchId: number
      marketType: BettingMarketType
      selectionKey: BettingSelectionKey
      stake: number
    }) => {
      const res = await networkRef.current.Post('/betting/bets', input)
      if (res?.status === 'ok' && res.data) {
        dispatch({
          type: 'SET_BETTING_BALANCE',
          payload: Number(res.data.balance) || 0,
        })
        return {ok: true as const, data: res.data}
      }
      return {
        ok: false as const,
        error: String(res?.error ?? 'bet_failed'),
      }
    },
    [dispatch],
  )

  const getLeaderboard = React.useCallback(async (limit = 25) => {
    const res = await networkRef.current.Get(
      `/betting/leaderboard?limit=${limit}`,
    )
    if (res?.status === 'ok' && Array.isArray(res.data)) {
      return res.data
    }
    return []
  }, [])

  const listBets = React.useCallback(
    async (options?: {
      status?: BettingBetStatus | 'all'
      limit?: number
    }): Promise<{items: BettingBet[]; error?: string}> => {
      const params = new URLSearchParams({
        limit: String(options?.limit ?? 50),
      })
      if (options?.status && options.status !== 'all') {
        params.set('status', options.status)
      }
      const res = await networkRef.current.Get(
        `/betting/bets?${params.toString()}`,
      )
      if (res?.status === 'ok' && Array.isArray(res.data)) {
        return {items: res.data as BettingBet[]}
      }
      return {
        items: [],
        error: String(res?.error ?? 'list_bets_failed'),
      }
    },
    [],
  )

  return {
    refreshAccount,
    optIn,
    getMarkets,
    placeBet,
    getLeaderboard,
    listBets,
  }
}
