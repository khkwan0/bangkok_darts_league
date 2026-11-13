import {isLeagueAdmin, type AdminUserLike} from '@/lib/isLeagueAdmin'

type AccessUser =
  | (NonNullable<AdminUserLike> & {
      id?: number
      teams?: {id: number; team_role_id: number}[]
    })
  | null
  | undefined

/** Match rosters keyed by team id, then player id (MatchContext `state.teams`). */
type MatchRosters = Record<string | number, Record<string | number, unknown>> | null | undefined

function onTeam(user: AccessUser, teamId: number, rosters: MatchRosters): boolean {
  if (!user?.id || !teamId) return false
  if (user.teams?.some(team => Number(team.id) === teamId)) return true
  const roster = rosters?.[teamId]
  return roster != null && Object.prototype.hasOwnProperty.call(roster, String(user.id))
}

/** Players on either team, league admins and super admins. */
export function canEditScoresheet(
  user: AccessUser,
  homeTeamId: number,
  awayTeamId: number,
  rosters: MatchRosters,
): boolean {
  if (isLeagueAdmin(user)) return true
  return onTeam(user, homeTeamId, rosters) || onTeam(user, awayTeamId, rosters)
}

/** That team's captain (2) or assistant (1), or a league/super admin. */
export function canFinalizeForTeam(user: AccessUser, teamId: number): boolean {
  if (isLeagueAdmin(user)) return true
  const role = user?.teams?.find(team => Number(team.id) === Number(teamId))?.team_role_id
  return role === 1 || role === 2
}
