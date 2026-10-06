import {useNetwork} from '@/hooks/useNetwork'
import {useStatsScope} from '@/context/StatsScopeContext'

export const useTeams = () => {
  const {Get, Post, Patch} = useNetwork()
  const {scope} = useStatsScope()

  const GetPlayers = async (
    teamid = -1,
    activeOnly = false,
    matchId = null,
  ) => {
    try {
      if (teamid && Number.isInteger(teamid) && teamid >= 0) {
        let url =
          '/playersteam/players?teamid=' +
          teamid +
          '&active_only=' +
          activeOnly
        if (matchId != null && Number(matchId) > 0) {
          url += '&matchid=' + Number(matchId)
        }
        const players = await Get(url)
        return players
      } else {
        return []
      }
    } catch (e) {
      console.log(e)
      return []
    }
  }

  const AddExistingPlayerToTeam = async (teamId, playerId) => {
    try {
      if (
        typeof teamId !== 'undefined' &&
        teamId &&
        typeof playerId !== 'undefined' &&
        playerId
      ) {
        const res = await Post('/team/player', {
          teamId: teamId,
          playerId: playerId,
        })
        return res
      } else {
        return {status: 'error', error: 'invalid_paramters'}
      }
    } catch (e) {
      console.log(e)
      return {status: 'error', error: 'server_error'}
    }
  }

  const GetTeamInternalStats = async teamId => {
    try {
      if (teamId) {
        const res = await Get(
          '/stats/team/players/internal/' + teamId + '?scope=' + scope,
        )
        return res
      } else {
        return {status: 'error', error: 'invalid_paramters'}
      }
    } catch (e) {
      console.log(e)
      return {status: 'error', error: 'server_error'}
    }
  }

  const GetTeamInfo = async teamId => {
    try {
      if (teamId) {
        const res = await Get('/team/' + teamId)
        return {status: 'ok', data: res}
      } else {
        return {status: 'error', error: 'invalid_paramters'}
      }
    } catch (e) {
      return {status: 'error', error: 'server_error'}
    }
  }

  const UpdateTeamNames = async (
    teamId,
    {name, short_name, very_short_name = ''},
  ) => {
    try {
      if (!teamId) {
        return {status: 'error', error: 'invalid_paramters'}
      }
      return await Patch(`/team/${teamId}/names`, {
        name,
        short_name,
        very_short_name,
      })
    } catch (e) {
      console.log(e)
      return {status: 'error', error: 'server_error'}
    }
  }

  const GetTeamStats = async teamId => {
    try {
      if (teamId) {
        const res = await Get('/stats/team/' + teamId)
        return res
      } else {
        return {status: 'error', error: 'invalid_paramters'}
      }
    } catch (e) {
      console.log(e)
      return {status: 'error', error: 'server_error'}
    }
  }

  return {
    GetPlayers,
    AddExistingPlayerToTeam,
    GetTeamInternalStats,
    GetTeamInfo,
    UpdateTeamNames,
    GetTeamStats,
  }
}
