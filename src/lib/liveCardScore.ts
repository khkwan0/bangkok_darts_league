/** Scores from the upcoming-matches payload. Missing or junk fields stay hidden. */
export function readLiveCardScores(
  match:
    | {
        live_home_score?: unknown
        live_away_score?: unknown
      }
    | null
    | undefined,
): {home: number; away: number} | null {
  if (!match || typeof match !== 'object') return null
  const home = asScore(match.live_home_score)
  const away = asScore(match.live_away_score)
  if (home == null || away == null) return null
  return {home, away}
}

function asScore(value: unknown): number | null {
  if (typeof value === 'boolean' || value == null) return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.trunc(n)
}
