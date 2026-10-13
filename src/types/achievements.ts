export type AchievementKind = 'badge' | 'trophy'
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export type LocalizedText = {
  en: string
  th: string
}

export type AchievementItem = {
  code: string
  sport: 'pool' | 'darts' | 'shared'
  kind: AchievementKind
  tier: AchievementTier
  icon: string
  name: LocalizedText
  description: LocalizedText
  silly: boolean
  awardedAt?: string
  meta?: Record<string, unknown> | null
}

export type PlayerAchievements = {
  playerId: number
  leagueId: number
  sport: 'pool' | 'darts'
  unlocked: AchievementItem[]
  locked: AchievementItem[]
  counts: {
    badges: number
    trophies: number
    total: number
    available: number
  }
}
