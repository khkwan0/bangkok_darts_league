import type {FrameType, LegRow, PlayerLegStat} from '@/components/Match/types'

function emptyLeg(winner: 'home' | 'away'): LegRow {
  return {winner, homePlayerStats: [], awayPlayerStats: []}
}

function cloneStats(stats: PlayerLegStat[] | undefined): PlayerLegStat[] {
  if (!Array.isArray(stats)) return []
  return stats.map(s => ({
    tons: Number(s?.tons ?? 0),
    heavyTons: Number(s?.heavyTons ?? 0),
    closes: Number(s?.closes ?? 0),
  }))
}

/**
 * Series games (BoN / race-to) keep one `legs` row per completed leg.
 * Older live state may only have homeScore/awayScore — synthesize rows so the UI
 * can show per-leg tons/180s/closes.
 */
export function hydrateFrameLegs(frame: FrameType): FrameType {
  const games = Math.max(1, Math.trunc(Number(frame.games ?? 1)))
  if (games <= 1) {
    return {...frame, legs: Array.isArray(frame.legs) ? frame.legs : []}
  }
  const homeScore = Math.max(0, Math.trunc(Number(frame.homeScore ?? 0)))
  const awayScore = Math.max(0, Math.trunc(Number(frame.awayScore ?? 0)))
  const expected = homeScore + awayScore
  const existing = Array.isArray(frame.legs) ? frame.legs : []
  if (existing.length === expected) return frame

  const next: LegRow[] = []
  let homeLeft = homeScore
  let awayLeft = awayScore
  for (const leg of existing) {
    if (leg?.winner === 'home' && homeLeft > 0) {
      next.push({
        winner: 'home',
        homePlayerStats: cloneStats(leg.homePlayerStats),
        awayPlayerStats: cloneStats(leg.awayPlayerStats),
      })
      homeLeft--
    } else if (leg?.winner === 'away' && awayLeft > 0) {
      next.push({
        winner: 'away',
        homePlayerStats: cloneStats(leg.homePlayerStats),
        awayPlayerStats: cloneStats(leg.awayPlayerStats),
      })
      awayLeft--
    }
  }
  while (homeLeft-- > 0) next.push(emptyLeg('home'))
  while (awayLeft-- > 0) next.push(emptyLeg('away'))

  const hadPerLeg =
    existing.some(l => {
      const sum = (stats?: PlayerLegStat[]) =>
        (stats ?? []).reduce(
          (n, s) => n + Number(s?.tons ?? 0) + Number(s?.heavyTons ?? 0) + Number(s?.closes ?? 0),
          0,
        )
      return sum(l?.homePlayerStats) + sum(l?.awayPlayerStats) > 0
    })
  if (!hadPerLeg && next.length > 0) {
    next[0] = {
      ...next[0],
      homePlayerStats: cloneStats(frame.homePlayerStats),
      awayPlayerStats: cloneStats(frame.awayPlayerStats),
    }
  }

  return {...frame, legs: next}
}
