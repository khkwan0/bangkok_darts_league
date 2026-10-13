import {useNetwork} from '@/hooks/useNetwork'
import type {WeeklyHighlights} from '@/types/weeklyHighlights'
import React from 'react'

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
      includeCandidates?: boolean
    }): Promise<WeeklyHighlights | null> => {
      const params = new URLSearchParams()
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
      const qs = params.toString()
      const path = qs
        ? `/stats/weekly-highlights?${qs}`
        : '/stats/weekly-highlights'
      const res = await networkRef.current.Get(path)
      if (!res || res.status === 'error' || res.httpStatus) {
        return null
      }
      if (typeof res !== 'object' || !('playerOfTheWeek' in res)) {
        return null
      }
      return res as WeeklyHighlights
    },
    [],
  )

  return {getWeeklyHighlights}
}
