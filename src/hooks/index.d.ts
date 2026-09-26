import type { DivisionData } from '@/types'

export interface Country {
  id: number
  name_en: string
  name_th: string
  iso_3166_1_alpha_2_code: string
  emoji: string
}

export interface TeamStats {
  id: number
  name: string
  points: number
  wins: number
  losses: number
  eightBall: []
  nineBall: []
}

export interface League {
  getMatchById(matchId: number): Promise<{status: string; data: Match}>
  GetSeason(): Promise<{status: string; data: string}>
  GetStandings(seasonId?: number | null): Promise<DivisionData[]>
  GetTeams(): Promise<Team[]>
  GetCompletedMatchesByTeamId(
    teams: {id: number}[],
  ): Promise<{data: CompletedMatchType[]}>
  GrantPrivilege(
    playerId: number,
    teamId: number,
    level: number,
  ): Promise<{status: string}>
  RevokePrivileges(playerId: number, teamId: number): Promise<{status: string}>
  SaveNewPlayer(
    nickname: string,
    firstName: string,
    lastName: string,
    email: string,
  ): Promise<{status: string; data?: {playerId: number}; msg?: string}>
  GetUniquePlayers(): Promise<{data: Player[]}>
  AddPlayerToTeam(playerId: number, teamId: number): Promise<{status: string}>
  GetCountries(): Promise<{status: string; data: Country[]}>
  GetTeamStats(seasonId?: number | null): Promise<TeamStats>
  GetVenues(): Promise<Venue[]>
  RemovePlayerFromTeam(
    playerId: number,
    teamId: number,
  ): Promise<{status: string}>
  GetLiveScores(
    miniLeagueId?: number | null,
  ): Promise<{status: string; data: Match[]}>
}

export interface Match {
  GetMatchMetadata(matchId: number): Promise<MatchMetadata>
  AcceptRescheduleProposal(
    matchId: number,
    teamId: number,
  ): Promise<{status: string} | null>
  ConfirmMatch(matchId: number, teamId: number): Promise<{status: string}>
  UnconfirmMatch(matchId: number, teamId: number): Promise<{status: string}>
  GetMatchDetails(matchId: number): Promise<MatchDetails>
}

export interface Teams {
  GetTeams(): Promise<Team[]>
  GetTeam(teamId: number): Promise<Team>
  GetTeamPlayers(teamId: number): Promise<Player[]>
  GetTeamMatches(teamId: number): Promise<Match[]>
  GetPlayers(
    teamid?: number,
    activeOnly?: boolean,
    matchId?: number | null,
  ): Promise<{data: any[]}>
  AddExistingPlayerToTeam(
    teamId: number,
    playerId: number,
  ): Promise<{status: string}>
  GetTeamStats(teamId: number): Promise<TeamStats>
  GetTeamInternalStats(teamId: number): Promise<TeamStats>
  GetTeamInfo(teamId: number): Promise<{status: string; data?: any}>
}

export interface Account {
  GetUnreadMessageCount(): Promise<number>
  CheckVersion(): Promise<boolean>
  GetAccount(): Promise<{status: string; data: Account}>
  GetAccountUsername(): Promise<{status: string; data: string}>
  UpdateAccount(account: Account): Promise<{status: string}>
  SetFirstName(firstName: string): Promise<{status: string}>
  SetLastName(lastName: string): Promise<{status: string}>
  SetNickName(nickname: string): Promise<{status: string}>
  SetNationality(nationality: number): Promise<{status: string; data: Country}>
  SetEmail(email: string): Promise<{status: string}>
  SetPassword(password: string): Promise<{status: string}>
  SetProfilePicture(
    profilePicture: string,
  ): Promise<{status: string; data: string}>
  SaveAvatar(profilePicture: string): Promise<{status: string; data: string}>
  FetchUser(): Promise<{status: string; data: Account}>
}

export function useLeague(): League
export function useTeams(): Teams
export function usePlayers(): Player[]
export function useMatch(): Match
export function useLeague(): League
export function useTeams(): Team[]
export function usePlayers(): Player[]
export function useMatches(): Match[]
export function useAccount(): Account
