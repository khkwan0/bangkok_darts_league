import {useNetwork} from '@/hooks/useNetwork'

const seasonQuery = seasonId => (seasonId != null ? '&season=' + seasonId : '')

export const useSeason = () => {
  const {Get} = useNetwork()

  const GetDoublesStats = async (playerId, seasonId = null) => {
    try {
      const stats = await Get(
        '/stats/doubles?playerid=' + playerId + seasonQuery(seasonId),
      )
      return stats
    } catch (e) {
      console.log(e)
      return {}
    }
  }

  const GetMatchPerformance = async (playerId, seasonId = null) => {
    try {
      const stats = await Get(
        '/stats/match?playerid=' + playerId + seasonQuery(seasonId),
      )
      return stats
    } catch (e) {
      console.log(e)
      return []
    }
  }

  const GetMatchStats = async matchId => {
    try {
      const stats = await Get('/match/stats/' + matchId)
      return stats
    } catch (e) {
      console.log(e)
      return []
    }
  }

  const GetMatches = async (options = []) => {
    try {
      const query = options.join('&')
      const matches = await Get('/matches?' + query)
      return matches
    } catch (e) {
      console.log(e)
      return []
    }
  }

  const GetMatchesBySeason = async season => {
    try {
      const matches = await Get('/season/matches?season=' + season)
      return matches
    } catch (e) {
      console.log(e)
      return []
    }
  }

  const GetPlayerStats = async (playerId, seasonId = null) => {
    try {
      const stats = await Get(
        '/stats?playerid=' + playerId + seasonQuery(seasonId),
      )
      return stats
    } catch (e) {
      console.log(e)
      return {}
    }
  }

  const GetTeams = async () => {
    try {
      const teams = await Get('/teams')
      return teams
    } catch (e) {
      console.log(e)
      return []
    }
  }

  const GetGameTypes = async () => {
    try {
      const gameTypes = await Get('/game/types')
      return gameTypes
    } catch (e) {
      console.log(e)
      return []
    }
  }

  const GetCompletedMatchesBySeason = async season => {
    try {
      const res = await Get('/v2/matches/completed/season/' + season)
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e)
    }
  }

  return {
    GetDoublesStats,
    GetMatchPerformance,
    GetMatchStats,
    GetMatches,
    GetCompletedMatchesBySeason,
    GetMatchesBySeason,
    GetPlayerStats,
    GetTeams,
    GetGameTypes,
  }
}
