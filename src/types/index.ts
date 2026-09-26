export interface Match {
  home: boolean
  vs: string
  pts: number
  frames: number
}

export interface Team {
  name: string
  played: number
  points: number
  frames: number
  matches: Match[]
}

export interface DivisionData {
  division: string
  teams: Team[]
}
