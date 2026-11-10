import {useNetwork} from '@/hooks/useNetwork'
import {configuredLeagueId} from '@/lib/leagueRequest'
import type {
  HighlightCompetition,
  WeeklyHighlights,
} from '@/types/weeklyHighlights'
import React from 'react'

/** Drop a pool-league payload so this app never shows pool Player of the Week. */
function isThisLeague(res: WeeklyHighlights): boolean {
  if (res.sport === 'pool') return false
  if (
    typeof res.leagueId === 'number' &&
    res.leagueId > 0 &&
    res.leagueId !== configuredLeagueId()
  ) {
    return false
  }
  return true
}

export function useWeeklyHighlights() {
  const network = useNetwork()
  const networkRef = React.useRef(network)
  networkRef.current = network

  const getWeeklyHighlights = React.useCallback(
    async (opts?: {
      seasonId?: number | null
      date?: string | null
      gameType?: string | null
      divisionId?: number | null
      teamId?: number | null
      /** Omitted = auto: league, or the cup when the week had only cup matches. */
      competition?: HighlightCompetition | null
      includeCandidates?: boolean
    }): Promise<WeeklyHighlights | null> => {
      const params = new URLSearchParams()
      params.set('competition', opts?.competition ?? 'auto')
      if (opts?.seasonId != null && opts.seasonId > 0) {
        params.set('season', String(opts.seasonId))
      }
      if (opts?.date && /^\d{4}-\d{2}-\d{2}$/.test(opts.date)) {
        params.set('date', opts.date)
      }
      if (opts?.gameType && opts.gameType !== 'all') {
        params.set('gameType', opts.gameType)
      }
      if (opts?.divisionId != null && opts.divisionId > 0) {
        params.set('divisionId', String(opts.divisionId))
      }
      if (opts?.teamId != null && opts.teamId > 0) {
        params.set('teamId', String(opts.teamId))
      }
      if (opts?.includeCandidates) {
        params.set('includeCandidates', '1')
      }
      const res = await networkRef.current.Get(
        `/stats/weekly-highlights?${params.toString()}`,
      )
      if (!res || res.status === 'error' || res.httpStatus) {
        return null
      }
      if (typeof res !== 'object' || !('playerOfTheWeek' in res)) {
        return null
      }
      const highlights = res as WeeklyHighlights
      if (!isThisLeague(highlights)) return null
      return highlights
    },
    [],
  )

  return {getWeeklyHighlights}
}
