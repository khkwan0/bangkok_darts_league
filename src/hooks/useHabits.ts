import {useNetwork} from '@/hooks/useNetwork'
import React from 'react'

export type HabitStreakRow = {
  kind: 'prediction_week' | 'confirm_on_time' | 'finalize_same_night'
  current_count: number
  best_count: number
  last_qualified_week_key: string | null
}

export type HabitChallenge = {
  code: string
  target: number
  name: {en: string; th: string}
  description: {en: string; th: string}
}

export type HabitsSnapshot = {
  week_key: string
  weeklies_enabled?: boolean
  predictions_enabled: boolean
  picks: {
    tippable: number
    tipped: number
    remaining_match_ids: number[]
    week_complete: boolean
  }
  prediction_streak: HabitStreakRow | null
  confirm_streak: HabitStreakRow | null
  finalize_streak: HabitStreakRow | null
  weekly_race: {
    week_key: string
    points: number
    picks: number
    rank: number | null
  } | null
  challenge: {
    challenge: HabitChallenge
    week_key: string
    current: number
    target: number
    completed: boolean
    completed_at: string | null
  } | null
  is_captain: boolean
}

export type WeeklyRaceRow = {
  player_id: number
  nickname: string | null
  firstname: string | null
  lastname: string | null
  points: number
  picks: number
  exacts: number
  winners: number
}

export type RivalryMeeting = {
  match_id: number
  date: string | null
  home_team_id: number
  away_team_id: number
  home_frames: number
  away_frames: number
  winner_team_id: number | null
}

export type RivalryPayload = {
  home_team_id: number
  away_team_id: number
  meetings: RivalryMeeting[]
  revenge_for: 'home' | 'away' | null
  matchup: {
    home_team_short_name: string
    away_team_short_name: string
  } | null
}

export function useHabits() {
  const network = useNetwork()
  const networkRef = React.useRef(network)
  networkRef.current = network

  const getSnapshot = React.useCallback(async () => {
    const res = await networkRef.current.Get('/habits/me')
    if (res?.status === 'ok' && res.data) {
      return {ok: true as const, data: res.data as HabitsSnapshot}
    }
    return {
      ok: false as const,
      error: String(res?.error ?? 'load_failed'),
      data: null,
    }
  }, [])

  const getWeeklyLeaderboard = React.useCallback(
    async (opts?: {weekKey?: string; limit?: number}) => {
      const params = new URLSearchParams()
      if (opts?.weekKey) params.set('week_key', opts.weekKey)
      if (opts?.limit) params.set('limit', String(opts.limit))
      const qs = params.toString()
      const res = await networkRef.current.Get(
        `/habits/weekly-leaderboard${qs ? `?${qs}` : ''}`,
      )
      if (res?.status === 'ok' && res.data) {
        return {
          week_key: String(res.data.week_key),
          rows: (res.data.rows ?? []) as WeeklyRaceRow[],
        }
      }
      throw new Error(String(res?.error ?? 'load_failed'))
    },
    [],
  )

  const getRivalry = React.useCallback(async (matchId: number) => {
    const res = await networkRef.current.Get(`/habits/rivalry/${matchId}`)
    if (res?.status === 'ok' && res.data) {
      return {ok: true as const, data: res.data as RivalryPayload}
    }
    return {
      ok: false as const,
      error: String(res?.error ?? 'load_failed'),
      data: null,
    }
  }, [])

  return {getSnapshot, getWeeklyLeaderboard, getRivalry}
}
