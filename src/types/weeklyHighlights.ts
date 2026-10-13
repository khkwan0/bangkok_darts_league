export type WeeklyHighlightPlayer = {
  playerId: number
  nickname: string
  pic: string | null
  team: {id: number; name: string; shortName: string | null} | null
  played: number
  won: number
  lost: number
  winPct: number
}

export type WeeklySpotlight = {
  id: string
  label: string
  player: WeeklyHighlightPlayer
  value: number
  detail: string
}

export type HighlightGameTypeOption = {
  code: string
  label: string
}

export type HighlightDivisionOption = {
  id: number
  name: string
}

export type HighlightTeamOption = {
  id: number
  name: string
  shortName: string | null
  divisionId: number | null
}

export type WeeklyHighlights = {
  weekStart: string
  weekEnd: string
  /** Alias of weekStart (override key). */
  matchDate: string
  seasonId: number
  leagueId: number
  sport: string
  gameType: string
  gameTypes: HighlightGameTypeOption[]
  divisionId: number | null
  teamId: number | null
  divisions: HighlightDivisionOption[]
  teams: HighlightTeamOption[]
  playerOfTheWeek: WeeklyHighlightPlayer & {
    source: 'auto' | 'override'
    note: string | null
  }
  spotlights: WeeklySpotlight[]
  autoPlayerId: number
  candidates?: WeeklyHighlightPlayer[]
}
