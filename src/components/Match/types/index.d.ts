export type MatchInfoDataType = {
  home_team_short_name?: string
  away_team_short_name?: string
  format: string
  home_team_id: number
  away_team_id: number
  name: string
  location?: string
  phone?: string
  latitude?: number
  longitude?: number
  logo?: string
  match_id: number
  date: string
  original_date?: string
  /** >0 for cup / tournament fixtures (no division). */
  tournament_id?: number
  division_name?: string | null
  /** Cup bracket round (1-based) when tournament_id > 0. */
  round?: number | null
  /** Stage label e.g. "Gold Cup" from tournament_stages. */
  stage_label?: string | null
  stage_key?: string | null
  /** Cup game type label from game_types (e.g. "501"). */
  game_type_label?: string | null
  home_confirmed: number
  away_confirmed: number
  team_role_id: number
  player_team_id: number
  home_logo?: string
  away_logo?: string
  homeStats?: {
    rank?: number
    won?: number
    lost?: number
    tied?: number
  }
  awayStats?: {
    rank?: number
    won?: number
    lost?: number
    tied?: number
  }
  postponed_proposal?:
    | string
    | {
        matchId?: number
        proposedData?: {
          isHome: boolean
          newDate: string | null
          teamId: number
          timestamp: string
          userId: number
        }
        isHome?: boolean
        newDate?: string | null
        teamId?: number
        timestamp?: string
        userId?: number
      }
    | null
  initialFrames?: FrameType[]
}

export interface MatchInfoType {
  matchInfo: MatchInfoDataType
}

export type FrameType = {
  frameNumber: number
  section: number
  mfpp: number
  winner: number
  homePlayerIds: number[]
  awayPlayerIds: number[]
  /** Games won inside BoN series (paper "Legs" for the row). */
  homeScore: number
  awayScore: number
  type?: string
  /** Display name from match format section (e.g. "501 Doubles"). */
  label?: string
  /** Min players per side */
  noPlayers?: number
  minPlayers?: number
  maxPlayers?: number
  /** Match-score weight for this row. Default 1. */
  valuePerLeg?: number
  /** Series parameter: BoN length or Race-to M target */
  games?: number
  /** best_of | race_to when games > 1 */
  seriesMode?: 'best_of' | 'race_to'
  trackTons?: boolean
  trackHeavyTons?: boolean
  trackCloses?: boolean
  trackBoardScore?: boolean
  /** Legacy: any of tons / heavy / closes. */
  trackStats?: boolean
  /** Game-type Close: show per-leg tallies. */
  showClose?: boolean
  /** Game-type Score: show keypad board score. */
  showScore?: boolean
  /** Game-type Win: show Win button. */
  showWin?: boolean
  homeTons?: number
  awayTons?: number
  homeHeavyTons?: number
  awayHeavyTons?: number
  homeCloses?: number
  awayCloses?: number
  /**
   * Per-slot tons/closes (aligned with homePlayerIds).
   * For series (games > 1) these are aggregates of `legs`.
   */
  homePlayerStats?: PlayerLegStat[]
  /**
   * Per-slot tons/closes (aligned with awayPlayerIds).
   * For series (games > 1) these are aggregates of `legs`.
   */
  awayPlayerStats?: PlayerLegStat[]
  /**
   * Per-leg tons/180s/closes.
   * Race to N: always N rows (open rows allowed before a winner is set).
   * Best of N: grows with completed legs (homeScore + awayScore).
   */
  legs?: LegRow[]
  homeBoardScore?: number
  awayBoardScore?: number
  /** Team id that throws first dart in this game (darts only). */
  firstDart?: number
  frameIdx?: number
  frameIndex?: number
  goldenBreak?: boolean
}

export type PlayerLegStat = {
  tons: number
  heavyTons: number
  closes: number
}

/** One leg inside a series game. `winner` is null until that leg is decided. */
export type LegRow = {
  winner: 'home' | 'away' | null
  homePlayerStats: PlayerLegStat[]
  awayPlayerStats: PlayerLegStat[]
}

export interface FrameProps {
  item: FrameType
  index: number
  refreshing: boolean
  statsView?: import('@/lib/scoresheetStatsView').ScoresheetStatsView
}
