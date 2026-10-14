import {useNetwork} from '@/hooks/useNetwork'
import React from 'react'

export type PredictedSide = 'home' | 'away'
export type PredictionStatus = 'open' | 'locked' | 'scored' | 'void'
export type PredictionWindowStatus = 'open' | 'locked' | 'settled' | 'void'

export type MatchPrediction = {
  id: number
  player_id: number
  match_id: number
  league_id: number
  season_id: number
  predicted_side: PredictedSide
  predicted_margin: number
  status: PredictionStatus
  points: number
  created_at: string
  updated_at: string
  match_date?: string | null
  home_team_short_name?: string | null
  away_team_short_name?: string | null
  home_frames?: number | null
  away_frames?: number | null
}

export type PredictionTeamStats = {
  wins: number
  losses: number
  ties: number
  frames_for: number
  frames_against: number
}

export type PredictionMatchup = {
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
  home: PredictionTeamStats
  away: PredictionTeamStats
}

export type PredictionMatchPayload = {
  match_id: number
  window_status: PredictionWindowStatus
  max_margin: number
  match_status_id: number
  home_frames: number | null
  away_frames: number | null
  matchup: PredictionMatchup | null
  prediction: MatchPrediction | null
}

export type PredictionLeaderboardRow = {
  player_id: number
  nickname: string | null
  firstname: string | null
  lastname: string | null
  points: number
  picks: number
  exacts: number
  winners: number
}

export function usePredictions() {
  const network = useNetwork()
  const networkRef = React.useRef(network)
  networkRef.current = network

  const getMatch = React.useCallback(async (matchId: number) => {
    const res = await networkRef.current.Get(
      `/predictions/match/${matchId}`,
    )
    if (res?.status === 'ok' && res.data) {
      return {
        ok: true as const,
        data: res.data as PredictionMatchPayload,
      }
    }
    return {
      ok: false as const,
      error: String(res?.error ?? 'load_failed'),
      data: null,
    }
  }, [])

  const upsert = React.useCallback(
    async (input: {
      matchId: number
      predictedSide: PredictedSide
      predictedMargin: number
    }) => {
      const res = await networkRef.current.Post('/predictions', input)
      if (res?.status === 'ok' && res.data) {
        return {ok: true as const, data: res.data as MatchPrediction}
      }
      return {
        ok: false as const,
        error: String(res?.error ?? 'save_failed'),
      }
    },
    [],
  )

  const listMine = React.useCallback(
    async (options?: {seasonId?: number; limit?: number}) => {
      const params = new URLSearchParams({
        limit: String(options?.limit ?? 50),
      })
      if (options?.seasonId) {
        params.set('seasonId', String(options.seasonId))
      }
      const res = await networkRef.current.Get(
        `/predictions/mine?${params.toString()}`,
      )
      if (res?.status === 'ok' && Array.isArray(res.data)) {
        return {items: res.data as MatchPrediction[]}
      }
      return {
        items: [] as MatchPrediction[],
        error: String(res?.error ?? 'list_failed'),
      }
    },
    [],
  )

  const getLeaderboard = React.useCallback(
    async (options?: {seasonId?: number; limit?: number}) => {
      const params = new URLSearchParams({
        limit: String(options?.limit ?? 50),
      })
      if (options?.seasonId) {
        params.set('seasonId', String(options.seasonId))
      }
      const res = await networkRef.current.Get(
        `/predictions/leaderboard?${params.toString()}`,
      )
      if (res?.status === 'ok' && res.data) {
        return {
          season_id: Number(res.data.season_id) || 0,
          rows: (res.data.rows ?? []) as PredictionLeaderboardRow[],
        }
      }
      return {season_id: 0, rows: [] as PredictionLeaderboardRow[]}
    },
    [],
  )

  return {getMatch, upsert, listMine, getLeaderboard}
}
