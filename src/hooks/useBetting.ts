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
    if (res?.status === 'ok' && res.data?.markets) {
      return res.data.markets as BettingMarket[]
    }
    return [] as BettingMarket[]
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

  return {
    refreshAccount,
    optIn,
    getMarkets,
    placeBet,
    getLeaderboard,
  }
}
