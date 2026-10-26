import type {FrameType, LegRow, PlayerLegStat} from '@/components/Match/types'
import {seriesWinsNeeded} from '@/lib/matchFormat'

function emptyLeg(winner: 'home' | 'away' | null = null): LegRow {
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

function sumCloses(stats: PlayerLegStat[] | undefined): number {
  return (stats ?? []).reduce((n, s) => n + Number(s?.closes ?? 0), 0)
}

function normalizeLeg(leg: LegRow | undefined | null): LegRow | null {
  if (!leg || typeof leg !== 'object') return null
  const winner =
    leg.winner === 'home' || leg.winner === 'away' ? leg.winner : null
  return {
    winner,
    homePlayerStats: cloneStats(leg.homePlayerStats),
    awayPlayerStats: cloneStats(leg.awayPlayerStats),
  }
}

function legHasStats(leg: LegRow): boolean {
  const sum = (stats?: PlayerLegStat[]) =>
    (stats ?? []).reduce(
      (n, s) =>
        n +
        Number(s?.tons ?? 0) +
        Number(s?.heavyTons ?? 0) +
        Number(s?.closes ?? 0),
      0,
    )
  return sum(leg.homePlayerStats) + sum(leg.awayPlayerStats) > 0
}

/**
 * Series games (Race to N / BoN) always keep at least N open leg rows so tons /
 * 180s / closes can be tallied before any leg is won.
 *
 * Leg winners come from closes (>0) or Win — not from inventing winners off
 * homeScore/awayScore. Close > 0 on one side marks that side; both 0 leaves
 * any Win-assigned winner intact (server clears on close edits).
 */
export function hydrateFrameLegs(frame: FrameType): FrameType {
  const games = Math.max(1, Math.trunc(Number(frame.games ?? 1)))
  const seriesMode = String(frame.seriesMode ?? '')
  const isRaceTo = seriesMode === 'race_to'
  const isBestOf = seriesMode === 'best_of'
  const isSeries = games > 1 || isRaceTo || isBestOf
  if (!isSeries) {
    return {...frame, legs: Array.isArray(frame.legs) ? frame.legs : []}
  }

  const seriesLength = Math.max(games, 1)
  const existing = (Array.isArray(frame.legs) ? frame.legs : [])
    .map(normalizeLeg)
    .filter((l): l is LegRow => l != null)

  const next = existing.map(leg => {
    const homeCloses = sumCloses(leg.homePlayerStats)
    const awayCloses = sumCloses(leg.awayPlayerStats)
    let winner = leg.winner
    if (homeCloses > 0 && awayCloses <= 0) winner = 'home'
    else if (awayCloses > 0 && homeCloses <= 0) winner = 'away'
    // both 0: keep Win-assigned winner (or null) from server
    return {
      winner,
      homePlayerStats: cloneStats(leg.homePlayerStats),
      awayPlayerStats: cloneStats(leg.awayPlayerStats),
    }
  })

  const decided = next.filter(l => l.winner != null).length
  const target = Math.max(seriesLength, decided, next.length)
  while (next.length < target) next.push(emptyLeg(null))

  const need = seriesWinsNeeded(
    isRaceTo ? 'race_to' : isBestOf ? 'best_of' : 'best_of',
    seriesLength,
  )
  const homeHave = next.filter(l => l.winner === 'home').length
  const awayHave = next.filter(l => l.winner === 'away').length
  if (
    homeHave < need &&
    awayHave < need &&
    !next.some(l => l.winner == null)
  ) {
    next.push(emptyLeg(null))
  }

  if (
    !next.some(legHasStats) &&
    (Number(frame.homeTons ?? 0) > 0 ||
      Number(frame.awayTons ?? 0) > 0 ||
      Number(frame.homeHeavyTons ?? 0) > 0 ||
      Number(frame.awayHeavyTons ?? 0) > 0 ||
      Number(frame.homeCloses ?? 0) > 0 ||
      Number(frame.awayCloses ?? 0) > 0)
  ) {
    next[0] = {
      ...next[0],
      homePlayerStats: cloneStats(frame.homePlayerStats),
      awayPlayerStats: cloneStats(frame.awayPlayerStats),
    }
  }

  return {...frame, legs: next}
}
