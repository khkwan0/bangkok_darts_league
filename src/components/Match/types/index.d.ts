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
  homeScore: number
  awayScore: number
  type?: string
  frameIdx?: number
  frameIndex?: number
  goldenBreak?: boolean
}

export interface FrameProps {
  item: FrameType
  index: number
  refreshing: boolean
}
