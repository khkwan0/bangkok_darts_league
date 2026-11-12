export type LiveCardScore = {
  home: number
  away: number
  /** Post-finalize: show the numbers, not the LIVE label. */
  final?: boolean
}

/** Scores from the upcoming-matches payload. Missing or junk fields stay hidden. */
export function readLiveCardScores(
  match:
    | {
        live_home_score?: unknown
        live_away_score?: unknown
        live_score_final?: unknown
      }
    | null
    | undefined,
): LiveCardScore | null {
  if (!match || typeof match !== 'object') return null
  const home = asScore(match.live_home_score)
  const away = asScore(match.live_away_score)
  if (home == null || away == null) return null
  const score: LiveCardScore = {home, away}
  if (match.live_score_final === true) score.final = true
  return score
}

/**
 * Socket event from room livescores:cards.
 * clear → null score; final → keep numbers, drop LIVE.
 */
export function parseLiveCardScoreEvent(payload: unknown): {
  matchId: number
  score: LiveCardScore | null
} | null {
  if (!payload || typeof payload !== 'object') return null
  const row = payload as {
    matchId?: unknown
    home?: unknown
    away?: unknown
    clear?: unknown
    final?: unknown
  }
  const matchId = asScore(row.matchId)
  if (matchId == null || matchId <= 0) return null
  if (row.clear === true) return {matchId, score: null}
  const home = asScore(row.home)
  const away = asScore(row.away)
  if (home == null || away == null) return null
  const score: LiveCardScore = {home, away}
  if (row.final === true) score.final = true
  return {matchId, score}
}

/** Prefer a socket push; fall back to API-seeded live_* fields. */
export function resolveCardLiveScore(
  socketScore: LiveCardScore | null | undefined,
  match: Parameters<typeof readLiveCardScores>[0],
): LiveCardScore | null {
  if (socketScore === undefined) return readLiveCardScores(match)
  return socketScore
}

/** LIVE label only while the match is still in progress. */
export function cardScoreShowsLive(score: LiveCardScore | null): boolean {
  return !!(score && !score.final)
}

function asScore(value: unknown): number | null {
  if (typeof value === 'boolean' || value == null) return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.trunc(n)
}
