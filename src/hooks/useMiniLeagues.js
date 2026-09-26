import {useNetwork} from '@/hooks/useNetwork'

export const useMiniLeagues = () => {
  const {Get, Post, Patch, Delete} = useNetwork()

  const list = async () => Get('/mini-leagues')
  const listActive = async () => Get('/mini-leagues?active=1')
  const get = async id => Get(`/mini-leagues/${id}`)
  const create = async name => Post('/mini-leagues', {name})
  const update = async (id, payload) => Patch(`/mini-leagues/${id}`, payload)

  const listMembers = async id => Get(`/mini-leagues/${id}/members`)
  const inviteMembers = async (id, playerIds) =>
    Post(`/mini-leagues/${id}/members`, {player_ids: playerIds})
  const respondInvite = async (miniLeagueId, action) =>
    Post('/mini-leagues/invite', {mini_league_id: miniLeagueId, action})

  const listAdmins = async id => Get(`/mini-leagues/${id}/admins`)
  const addAdmin = async (id, playerId) =>
    Post(`/mini-leagues/${id}/admins`, {player_id: playerId})
  const removeAdmin = async (id, playerId) =>
    Delete(`/mini-leagues/${id}/admins`, {player_id: playerId})

  const browseCanonical = async (id, kind, extra = {}) => {
    const params = new URLSearchParams({kind, ...extra})
    return Get(`/mini-leagues/${id}/canonical?${params.toString()}`)
  }

  const copy = async (id, payload) => Post(`/mini-leagues/${id}/copy`, payload)

  const listTeams = async id => Get(`/mini-leagues/${id}/teams`)
  const createTeam = async (id, payload) =>
    Post(`/mini-leagues/${id}/teams`, payload)
  const listTeamRoster = async (id, teamId) =>
    Get(`/mini-leagues/${id}/teams/${teamId}`)
  const addTeamPlayer = async (id, teamId, playerId) =>
    Post(`/mini-leagues/${id}/teams/${teamId}`, {player_id: playerId})
  const removeTeamPlayer = async (id, teamId, playerId) =>
    Delete(`/mini-leagues/${id}/teams/${teamId}`, {player_id: playerId})
  const listMatchFormats = async id => Get(`/mini-leagues/${id}/match-formats`)
  const createMatchFormat = async (id, payload) =>
    Post(`/mini-leagues/${id}/match-formats`, payload)
  const listMatches = async (id, opts) => {
    const params = new URLSearchParams()
    if (opts?.season_id) params.set('season_id', String(opts.season_id))
    const qs = params.toString()
    return Get(`/mini-leagues/${id}/matches${qs ? `?${qs}` : ''}`)
  }
  const createMatch = async (id, payload) =>
    Post(`/mini-leagues/${id}/matches`, payload)

  const standings = async (id, opts) => {
    const params = new URLSearchParams()
    if (opts?.season_id) params.set('season_id', String(opts.season_id))
    const qs = params.toString()
    return Get(`/mini-leagues/${id}/standings${qs ? `?${qs}` : ''}`)
  }
  const playerStats = async (id, opts) => {
    const params = new URLSearchParams()
    if (opts?.season_id) params.set('season_id', String(opts.season_id))
    const qs = params.toString()
    return Get(`/mini-leagues/${id}/player-stats${qs ? `?${qs}` : ''}`)
  }

  const listSeasons = async id => Get(`/mini-leagues/${id}/seasons`)
  const createSeason = async (id, payload) =>
    Post(`/mini-leagues/${id}/seasons`, payload)
  const updateSeason = async (id, payload) =>
    Patch(`/mini-leagues/${id}/seasons`, payload)

  return {
    list,
    listActive,
    get,
    create,
    update,
    listMembers,
    inviteMembers,
    respondInvite,
    listAdmins,
    addAdmin,
    removeAdmin,
    browseCanonical,
    copy,
    listTeams,
    createTeam,
    listTeamRoster,
    addTeamPlayer,
    removeTeamPlayer,
    listMatchFormats,
    createMatchFormat,
    listMatches,
    createMatch,
    standings,
    playerStats,
    listSeasons,
    createSeason,
    updateSeason,
  }
}
