import {useLeague} from '@/hooks/useLeague'
import React from 'react'

export type LeagueSeason = {
  id: number
  name: string
  short_name?: string
  is_active?: boolean
}

type SeasonsResponse = {
  status?: string
  data?: {
    id: number
    name?: string
    short_name?: string
    status_id?: number
  }[]
}

/**
 * League (non-mini) season list with the active season preselected.
 * `pastSeasonId` is null while the current season is selected so callers keep
 * hitting the server's current-season default.
 */
export function useLeagueSeasonSelection(initialSeasonId?: number | null) {
  const league = useLeague()
  const [seasons, setSeasons] = React.useState<LeagueSeason[]>([])
  const [seasonId, setSeasonId] = React.useState<number | null>(
    initialSeasonId ?? null,
  )

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res: SeasonsResponse | undefined = await league.GetSeasons()
      if (cancelled || res?.status !== 'ok' || !Array.isArray(res.data)) return
      const rows: LeagueSeason[] = res.data.map(s => ({
        id: Number(s.id),
        name: s.name || s.short_name || String(s.id),
        short_name: s.short_name,
        is_active: s.status_id === 1,
      }))
      setSeasons(rows)
      setSeasonId(prev => {
        if (prev != null && rows.some(s => s.id === prev)) return prev
        const active = rows.find(s => s.is_active) || rows[0]
        return active ? active.id : null
      })
    })()
    return () => {
      cancelled = true
    }
    // useLeague returns fresh functions each render; load once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedSeason = seasons.find(s => s.id === seasonId) ?? null
  const pastSeasonId =
    selectedSeason && !selectedSeason.is_active ? selectedSeason.id : null

  return {seasons, seasonId, setSeasonId, selectedSeason, pastSeasonId}
}
