import {useNetwork} from '@/hooks/useNetwork'
import {useStatsScope} from '@/context/StatsScopeContext'
import config from '@/config'
import {leagueRequestHeaders} from '@/lib/leagueRequest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {File} from 'expo-file-system'
import {manipulateAsync, SaveFormat} from 'expo-image-manipulator'

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

  const GetTeamLogoHistory = async teamId => {
    try {
      if (!teamId) {
        return {status: 'error', error: 'invalid_paramters'}
      }
      return await Get(`/team/${teamId}/logo`)
    } catch (e) {
      console.log(e)
      return {status: 'error', error: 'server_error'}
    }
  }

  const UploadTeamLogo = async (teamId, path) => {
    try {
      if (!teamId || !path) {
        return {status: 'error', error: 'invalid_paramters'}
      }
      const token = await AsyncStorage.getItem('jwt')
      if (!token) {
        return {status: 'error', error: 'unauthorized'}
      }

      let apiDomain = (config.apiUrl || '').replace(/\/$/, '')
      try {
        const saved = await AsyncStorage.getItem('api_url')
        if (saved && saved.trim()) {
          apiDomain = saved.replace(/\/$/, '')
        }
      } catch {
        // ignore
      }

      const jpeg = await manipulateAsync(path, [], {
        compress: 0.9,
        format: SaveFormat.JPEG,
      })
      const data = new FormData()
      data.append('logo', new File(jpeg.uri))

      const res = await fetch(apiDomain + `/team/${teamId}/logo/upload`, {
        method: 'POST',
        body: data,
        headers: {
          ...leagueRequestHeaders(),
          Authorization: 'Bearer ' + token,
        },
      })
      const json = await res.json().catch(() => ({
        status: 'error',
        error: 'invalid_response',
      }))
      if (!res.ok && !json?.status) {
        return {
          status: 'error',
          error: json?.error || 'request_failed',
          httpStatus: res.status,
        }
      }
      return json
    } catch (e) {
      console.log(e)
      return {
        status: 'error',
        error: e?.message || 'server_error',
      }
    }
  }

  const RestoreTeamLogo = async (teamId, filename) => {
    try {
      if (!teamId || !filename) {
        return {status: 'error', error: 'invalid_paramters'}
      }
      return await Post(`/team/${teamId}/logo/restore`, {filename})
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
    GetTeamLogoHistory,
    UploadTeamLogo,
    RestoreTeamLogo,
    GetTeamStats,
  }
}
