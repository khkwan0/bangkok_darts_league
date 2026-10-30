import {useNetwork} from '@/hooks/useNetwork'
import React from 'react'

export type AdminSeason = {
  id: number
  identifier: number
  name: string
  short_name?: string
  status_id: number
}

export type AdminGameType = {
  id: number
  code: string
  label: string
  frame_type_prefix: string
  sort_order: number
  show_close?: boolean
  show_score?: boolean
  show_win?: boolean
  usage_count?: number
}

export type AdminFrameType = {
  id: number
  name: string
  short_name: string
  alt_name: string
  no_players: number
  max_players: number
  default_games?: number
  default_series_mode?: 'best_of' | 'race_to'
  track_tons?: boolean
  track_heavy_tons?: boolean
  track_closes?: boolean
  track_board_score?: boolean
  track_stats?: boolean
  game_type_id: number
  usage_count?: number
}

export type AdminMatchFormat = {
  id: number
  name: string
  game_type: string
  format: string
  points_per_win: number
  points_per_tie: number
  points_per_loss: number
  usage_count?: number
}

export type AdminLeagueGameTypeOption = {
  code: string
  label: string
  frame_type_prefix?: string
}

export type AdminDivision = {
  id: number
  name: string
  short_name: string
  season_id: number
  game_type: string
  league_id: number
  handicapped: number
  handicap_difference: number
  primary_ranking: string
  secondary_ranking: string
  format_id: number | null
  format_name?: string | null
  format?: string | null
  description: string | null
  sortorder: number
  starttime: string
  day_id: number
}

export type AdminTeam = {
  id: number
  name: string
  short_name: string
  very_short_name: string
  division_id: number | null
  venue_id: number
  season_id: number
  status_id: number
  advantage?: number
  fee_paid?: number
  new_team?: number
  top_team?: number
  line_groupid_team?: string | null
  logo?: string | null
}

export type AdminVenue = {
  id: number
  name: string
  short_name: string
  logo?: string | null
}

function asArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  if (res && typeof res === 'object' && Array.isArray((res as any).data)) {
    return (res as any).data as T[]
  }
  return []
}

export function useAdminLeague() {
  const network = useNetwork()
  const networkRef = React.useRef(network)
  networkRef.current = network

  const listSeasons = React.useCallback(async (): Promise<{
    data: AdminSeason[]
    error?: string
  }> => {
    const res = await networkRef.current.Get('/seasons')
    if (res?.status === 'ok' || Array.isArray(res?.data)) {
      return {data: (res.data as AdminSeason[]) ?? []}
    }
    if (Array.isArray(res)) return {data: res as AdminSeason[]}
    return {data: [], error: res?.error || 'failed'}
  }, [])

  const getCurrentSeason = React.useCallback(async (): Promise<{
    data: any
    error?: string
  }> => {
    const res = await networkRef.current.Get('/season')
    if (res && (res.id != null || res.season != null || res.status === 'ok')) {
      return {data: res}
    }
    return {data: null, error: res?.error || 'failed'}
  }, [])

  const createSeason = React.useCallback(
    async (payload: {
      name: string
      identifier?: number
    }): Promise<{status: string; error?: string; [k: string]: any}> => {
      const res = await networkRef.current.Post(
        '/admin/season/create-with-migration',
        payload,
      )
      if (res?.status === 'ok') return {...res, status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const activateSeason = React.useCallback(
    async (id: number): Promise<{status: string; error?: string}> => {
      const res = await networkRef.current.Get(`/admin/season/activate/${id}`)
      if (res?.status === 'ok') return {status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const undoSeason = React.useCallback(
    async (
      seasonIdentifier: number,
    ): Promise<{status: string; error?: string; [k: string]: any}> => {
      const res = await networkRef.current.Post('/admin/season/undo', {
        seasonIdentifier,
      })
      if (res?.status === 'ok') return {...res, status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const listGameTypes = React.useCallback(async (): Promise<{
    data: AdminGameType[]
    error?: string
  }> => {
    const res = await networkRef.current.Get('/admin/game-types')
    if (res?.status === 'ok') {
      return {data: (res.data as AdminGameType[]) ?? []}
    }
    return {data: [], error: res?.error || 'failed'}
  }, [])

  const saveGameType = React.useCallback(
    async (
      payload: Record<string, unknown>,
      editingId?: number,
    ): Promise<{status: string; error?: string}> => {
      const body = editingId ? {id: editingId, ...payload} : payload
      const res = editingId
        ? await networkRef.current.Put('/admin/game-types', body)
        : await networkRef.current.Post('/admin/game-types', body)
      if (res?.status === 'ok') return {status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const deleteGameType = React.useCallback(
    async (id: number): Promise<{status: string; error?: string}> => {
      const res = await networkRef.current.Delete(`/admin/game-types?id=${id}`)
      if (res?.status === 'ok') return {status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const listFrameTypes = React.useCallback(
    async (gameTypeId?: number | ''): Promise<{
      data: AdminFrameType[]
      error?: string
    }> => {
      const qs =
        gameTypeId === '' || gameTypeId == null
          ? ''
          : `?game_type_id=${encodeURIComponent(String(gameTypeId))}`
      const res = await networkRef.current.Get(`/admin/frame-types${qs}`)
      if (res?.status === 'ok') {
        return {data: (res.data as AdminFrameType[]) ?? []}
      }
      return {data: [], error: res?.error || 'failed'}
    },
    [],
  )

  const saveFrameType = React.useCallback(
    async (
      payload: Record<string, unknown>,
      editingId?: number,
    ): Promise<{status: string; error?: string}> => {
      const body = editingId ? {id: editingId, ...payload} : payload
      const res = editingId
        ? await networkRef.current.Put('/admin/frame-types', body)
        : await networkRef.current.Post('/admin/frame-types', body)
      if (res?.status === 'ok') return {status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const deleteFrameType = React.useCallback(
    async (id: number): Promise<{status: string; error?: string}> => {
      const res = await networkRef.current.Delete(`/admin/frame-types?id=${id}`)
      if (res?.status === 'ok') return {status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const listMatchFormats = React.useCallback(async (): Promise<{
    data: AdminMatchFormat[]
    error?: string
  }> => {
    const res = await networkRef.current.Get('/admin/match-formats')
    if (res?.status === 'ok') {
      return {data: (res.data as AdminMatchFormat[]) ?? []}
    }
    return {data: [], error: res?.error || 'failed'}
  }, [])

  const listLeagueGameTypes = React.useCallback(async (): Promise<{
    data: AdminLeagueGameTypeOption[]
    error?: string
  }> => {
    const res = await networkRef.current.Get('/league-game-types')
    const data = asArray<AdminLeagueGameTypeOption>(res)
    if (data.length || Array.isArray(res)) return {data}
    return {data: [], error: (res as any)?.error || 'failed'}
  }, [])

  const saveMatchFormat = React.useCallback(
    async (
      payload: Record<string, unknown>,
      editingId?: number,
    ): Promise<{status: string; error?: string}> => {
      const body = editingId ? {id: editingId, ...payload} : payload
      const res = editingId
        ? await networkRef.current.Put('/admin/match-formats', body)
        : await networkRef.current.Post('/admin/match-formats', body)
      if (res?.status === 'ok') return {status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const deleteMatchFormat = React.useCallback(
    async (id: number): Promise<{status: string; error?: string}> => {
      const res = await networkRef.current.Delete(
        `/admin/match-formats?id=${id}`,
      )
      if (res?.status === 'ok') return {status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const listDivisions = React.useCallback(
    async (
      seasonId: number,
    ): Promise<{data: AdminDivision[]; error?: string}> => {
      const res = await networkRef.current.Get(
        `/admin/divisions?season=${seasonId}`,
      )
      if (Array.isArray(res)) return {data: res as AdminDivision[]}
      if (res?.status === 'error') {
        return {data: [], error: res.error || 'failed'}
      }
      return {data: asArray<AdminDivision>(res)}
    },
    [],
  )

  const saveDivision = React.useCallback(
    async (
      division: Record<string, unknown>,
      editingId?: number,
    ): Promise<{status: string; error?: string}> => {
      const res = editingId
        ? await networkRef.current.Put('/admin/divisions', {
            id: editingId,
            division,
          })
        : await networkRef.current.Post('/admin/divisions', {division})
      if (res?.status === 'ok') return {status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const deleteDivision = React.useCallback(
    async (id: number): Promise<{status: string; error?: string}> => {
      const res = await networkRef.current.Delete(`/admin/divisions?id=${id}`)
      if (res?.status === 'ok') return {status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const listTeams = React.useCallback(
    async (seasonId: number): Promise<{data: AdminTeam[]; error?: string}> => {
      const res = await networkRef.current.Get(`/admin/teams/${seasonId}`)
      if (Array.isArray(res)) return {data: res as AdminTeam[]}
      if (res?.status === 'error') {
        return {data: [], error: res.error || 'failed'}
      }
      return {data: asArray<AdminTeam>(res)}
    },
    [],
  )

  const listVenues = React.useCallback(async (): Promise<{
    data: AdminVenue[]
    error?: string
  }> => {
    const res = await networkRef.current.Get('/admin/venues')
    if (Array.isArray(res)) return {data: res as AdminVenue[]}
    if (res?.status === 'error') {
      return {data: [], error: res.error || 'failed'}
    }
    return {data: asArray<AdminVenue>(res)}
  }, [])

  const saveTeam = React.useCallback(
    async (
      team: Record<string, unknown>,
      editingId?: number,
    ): Promise<{status: string; error?: string}> => {
      const res = editingId
        ? await networkRef.current.Put('/admin/teams', {id: editingId, team})
        : await networkRef.current.Post('/admin/teams', {team})
      if (res?.status === 'ok') return {status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const deleteTeam = React.useCallback(
    async (id: number): Promise<{status: string; error?: string}> => {
      const res = await networkRef.current.Delete(`/admin/teams?id=${id}`)
      if (res?.status === 'ok') return {status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const patchTeamStatus = React.useCallback(
    async (
      id: number,
      status_id: number,
    ): Promise<{status: string; error?: string}> => {
      const res = await networkRef.current.Patch('/admin/teams', {
        id,
        status_id,
      })
      if (res?.status === 'ok') return {status: 'ok'}
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  return {
    listSeasons,
    getCurrentSeason,
    createSeason,
    activateSeason,
    undoSeason,
    listGameTypes,
    saveGameType,
    deleteGameType,
    listFrameTypes,
    saveFrameType,
    deleteFrameType,
    listMatchFormats,
    listLeagueGameTypes,
    saveMatchFormat,
    deleteMatchFormat,
    listDivisions,
    saveDivision,
    deleteDivision,
    listTeams,
    listVenues,
    saveTeam,
    deleteTeam,
    patchTeamStatus,
  }
}
