import {useNetwork} from '@/hooks/useNetwork'
import {useLeagueContext} from '@/context/LeagueContext'
import {isMiniCompetition} from '@/types/competition'

export const useLeague = () => {
  const {Get, Post} = useNetwork()
  const {state} = useLeagueContext()

  const AddNewSeason = async (name = '', shortName = '', description = '') => {
    try {
      if (name) {
        const res = await Post('/admin/season/new', {
          name,
          shortName,
          description,
        })
        return res
      } else {
        return {status: 'error', error: 'invalid_parameters'}
      }
    } catch (e) {
      console.log(e)
      throw new Error(e.message)
    }
  }
  const GetSeason = async () => {
    try {
      const season = await Get('/season')
      return season.season
    } catch (e) {
      console.log('no season')
    }
  }

  const GetSeasonV2 = async () => {
    try {
      const season = await Get('/v2/season')
      return season
    } catch (e) {
      console.log('no season')
    }
  }

  const GetSeasons = async () => {
    try {
      const seasons = await Get('/seasons')
      return seasons
    } catch (e) {
      console.log(e)
    }
  }

  const GetPlayerInfo = async (playerId = 0) => {
    try {
      const playerInfo = await Get('/player/' + playerId)
      return playerInfo
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const GetPlayerStats = async (
    seasonId = null,
    minimumGames = 1,
    gameType = '',
    gameVariety = 'all',
  ) => {
    try {
      let query = `minimum=${minimumGames}`
      if (gameType) {
        query += `&gameType=${gameType}`
      }
      let singlesOnly = false
      let doublesOnly = false
      if (gameVariety === 'singles') {
        singlesOnly = true
      } else if (gameVariety === 'doubles') {
        doublesOnly = true
      }
      if (singlesOnly) {
        query += '&singles=1'
      } else if (doublesOnly) {
        query += '&doubles=1'
      }
      const stats = await Get('/stats/players/' + seasonId + '?' + query)
      return stats
    } catch (e) {
      console.log(e)
      return []
    }
  }

  const GetPlayerName = async (playerId = 0) => {
    try {
      const playerName = await Get('/player/name/' + playerId)
      return playerName
    } catch (e) {
      console.log(e)
      return []
    }
  }

  const GetPlayerStatsInfo = async (playerId = 0) => {
    try {
      const miniId = isMiniCompetition(state.competition)
        ? state.competition.id
        : null
      const qs =
        miniId != null && Number(miniId) > 0
          ? `?mini_league_id=${Number(miniId)}`
          : ''
      const playerInfo = await Get('/player/stats/info/' + playerId + qs)
      return playerInfo
    } catch (e) {
      console.log(e)
      return []
    }
  }

  const GetPlayers = async (activeOnly = false) => {
    try {
      const res = await Get('/players?active_only=' + activeOnly)
      return res
    } catch (e) {
      return []
    }
  }

  const GetUniquePlayers = async () => {
    try {
      const res = await Get('/players/unique')
      return res
    } catch (e) {
      return []
    }
  }

  const GetStandings = async (seasonId = null) => {
    try {
      const res = await Get('/league/standings/' + seasonId)
      return res
    } catch (e) {
      console.log(e)
      return []
    }
  }

  const GetPlayerStatsByDivision = async (seasonId = 'null') => {
    try {
      const res = await Get(
        '/league/season/' + seasonId + '/division/player/stats',
      )
      return res
    } catch (e) {
      console.log(e)
      return []
    }
  }

  const SaveNewPlayer = async (
    nickName = '',
    firstName = '',
    lastName = '',
    email = '',
    teamId = 0,
  ) => {
    try {
      const res = Post('/player', {
        nickName,
        firstName,
        lastName,
        email,
        teamId,
      })
      return res
    } catch (e) {
      console.log(e)
      return {status: 'err', msg: 'Save error'}
    }
  }

  const GetVenues = async () => {
    try {
      const res = await Get('/venues')
      return res
    } catch (e) {
      return []
    }
  }

  const GetTeamStats = async (seasonId = null) => {
    try {
      const res = await Get('/stats/teams/' + seasonId)
      return res
    } catch (e) {
      return []
    }
  }

  const GetTeams = async () => {
    try {
      const res = await Get('/teams')
      return res
    } catch (e) {
      return []
    }
  }

  const GetTeamsBySeason = async season => {
    try {
      const res = await Get('/teams/' + season)
      return res
    } catch (e) {
      return []
    }
  }

  const GetAdminTeamsBySeason = async season => {
    try {
      if (season) {
        const res = await Get('/admin/teams/' + season)
        return res
      }
    } catch (e) {
      return []
    }
  }

  const GetDivisionsBySeason = async season => {
    try {
      const res = await Get('/divisions/' + season)
      return res
    } catch (e) {
      return []
    }
  }

  const GetTeamInfo = async teamId => {
    try {
      const res = await Get('/team/' + teamId)
      return res
    } catch (e) {
      console.log(e)
      return {}
    }
  }

  const Migrate = async (oldSeason = '', newSeason = '') => {
    try {
      const res = await Post('/admin/migrate', {
        oldSeason: parseInt(oldSeason, 10),
        newSeason: parseInt(newSeason, 10),
      })
      return res
    } catch (e) {
      console.log(e)
      return {status: 'error', error: e.message}
    }
  }

  const ActivateSeason = async seasonId => {
    try {
      const res = await Get('/admin/season/activate/' + seasonId)
      return res
    } catch (e) {
      console.log(e)
      return {status: 'error', error: e.message}
    }
  }

  const SetTeamDivision = async (teamId, divisionId) => {
    try {
      const res = await Post('/admin/team/division', {teamId, divisionId})
      return res
    } catch (e) {
      console.log(e)
      return {status: 'error', error: e.message}
    }
  }

  const GetTeamDivisionsBySeason = async seasonId => {
    try {
      const res = await Get('/team/division/' + seasonId)
      return res
    } catch (e) {
      console.log(e)
      return {status: 'error', error: e.message}
    }
  }

  const SaveVenue = async venue => {
    try {
      const res = await Post('/v2/venue', {venue})
      return res
    } catch (e) {
      console.log(e)
      return {status: 'error', error: e.message}
    }
  }

  const GetAllVenues = async () => {
    try {
      const res = await Get('/venues/all')
      return res
    } catch (e) {
      console.log(e)
      return {status: 'error', error: e.message}
    }
  }

  const SaveNewTeam = async (name, venue) => {
    try {
      const res = await Post('/admin/team', {name, venue})
      return res
    } catch (e) {
      console.log(e)
      return {status: 'error', error: e.message}
    }
  }

  const SaveNewTeamV2 = async (
    name,
    venue,
    shortName = '',
    veryShortName = '',
  ) => {
    try {
      const res = await Post('/team', {
        teamName: name,
        venueId: venue,
        shortName: shortName,
        veryShortName: veryShortName,
      })
      return res
    } catch (e) {
      console.log(e)
    }
  }

  const AddPlayerToTeam = async (playerId, teamId) => {
    try {
      const res = await Post('/team/player', {playerId, teamId})
      return res
    } catch (e) {
      console.log(e)
      return {status: 'error', error: 'network_error'}
    }
  }

  const RevokePrivileges = async (playerId, teamId) => {
    try {
      const res = await Post('/player/privilege/revoke', {playerId, teamId})
      return res
    } catch (e) {
      console.log(e)
      return {status: 'error', error: 'network_error'}
    }
  }

  const GrantPrivilege = async (playerId, teamId, level) => {
    try {
      const res = await Post('/player/privilege/grant', {
        playerId,
        teamId,
        level,
      })
      return res
    } catch (e) {
      console.log(e)
      return {status: 'error', error: 'network_error'}
    }
  }

  const RemovePlayerFromTeam = async (playerId, teamId) => {
    try {
      const res = await Post('/team/player/remove', {
        playerId,
        teamId,
      })
      return res
    } catch (e) {
      console.log(e)
      return {status: 'error', error: 'network_error'}
    }
  }

  const GetPostponed = async () => {
    try {
      const res = await Get('/matches/postponed')
      return res
    } catch (e) {
      console.log(e)
      return {status: 'error', error: 'network_error'}
    }
  }

  const MergePlayer = async (currentId, toMergeId) => {
    try {
      const res = await Get('/admin/users/merge/' + currentId + '/' + toMergeId)
      return res
    } catch (e) {
      console.log(e)
      return {status: 'error', error: 'network_error'}
    }
  }

  const GetActiveMergeRequestCount = async () => {
    try {
      const res = await Get('/users/mergerequest/count')
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const GetMergeRequests = async () => {
    try {
      const res = await Get('/admin/mergerequests')
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const GetMyMergeRequests = async () => {
    try {
      const res = await Get('/mymergerequests')
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const AcceptMergeRequest = async requestId => {
    try {
      const res = await Get('/admin/mergerequest/accept/' + requestId)
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const DenyMergeRequest = async requestId => {
    try {
      const res = await Get('/admin/mergerequest/deny/' + requestId)
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const GetMatchesBySeason = async seasonId => {
    try {
      const res = await Get('/matches/season/' + seasonId)
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const GetLiveScores = async (miniLeagueId = null) => {
    try {
      const query =
        miniLeagueId != null && Number(miniLeagueId) > 0
          ? `/scores/live?mini_league_id=${Number(miniLeagueId)}`
          : '/scores/live'
      const res = await Get(query)
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const GetMatchById = async matchId => {
    try {
      const res = await Get('/match/info/full/' + matchId)
      return res
    } catch (e) {
      console.log(e)
      return null
    }
  }

  const SetPlayerAttribute = async (playerId, key, value) => {
    try {
      const res = await Post('/admin/player/attribute', {
        playerId,
        key,
        value,
      })
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const GetAllPlayers = async () => {
    try {
      const res = await Get('/players/all')
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const GetRawPlayerInfo = async playerId => {
    try {
      const res = await Get('/player/raw/' + playerId)
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const GetGameTypes = async () => {
    try {
      const res = await Get('/gametypes')
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const GetRules = async () => {
    try {
      const res = await Get('/rules')
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const GetBranding = async () => {
    try {
      const res = await Get('/branding')
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const GetCompletedMatchesByTeamId = async teams => {
    try {
      const res = await Post('/matches/completed', {teams})
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  const GetCountries = async () => {
    try {
      const res = await Get('/countries')
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  return {
    AcceptMergeRequest,
    ActivateSeason,
    AddPlayerToTeam,
    AddNewSeason,
    DenyMergeRequest,
    GetActiveMergeRequestCount,
    GetAdminTeamsBySeason,
    GetAllVenues,
    GetAllPlayers,
    GetCountries,
    GetCompletedMatchesByTeamId,
    GetDivisionsBySeason,
    GetGameTypes,
    GetLiveScores,
    GetMatchById,
    GetMatchesBySeason,
    GetMergeRequests,
    GetMyMergeRequests,
    GetPlayerName,
    GetPlayerInfo,
    GetPlayerStats,
    GetPlayerStatsByDivision,
    GetPlayerStatsInfo,
    GetPlayers,
    GetPostponed,
    GetRawPlayerInfo,
    GetRules,
    GetBranding,
    GetSeason,
    GetSeasonV2,
    GetStandings,
    GetSeasons,
    GetTeams,
    GetTeamsBySeason,
    GetTeamDivisionsBySeason,
    GetTeamInfo,
    GetTeamStats,
    GetUniquePlayers,
    GetVenues,
    GrantPrivilege,
    MergePlayer,
    RevokePrivileges,
    RemovePlayerFromTeam,
    SaveNewPlayer,
    SaveNewTeam,
    SaveNewTeamV2,
    SaveVenue,
    SetPlayerAttribute,
    SetTeamDivision,
    Migrate,
  }
}
