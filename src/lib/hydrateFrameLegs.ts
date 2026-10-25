import type {FrameType, LegRow, PlayerLegStat} from '@/components/Match/types'

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

  // Race to N and BoN both use N as the series parameter — always show N lines.
  const seriesLength = Math.max(games, 1)
  const homeScore = Math.max(0, Math.trunc(Number(frame.homeScore ?? 0)))
  const awayScore = Math.max(0, Math.trunc(Number(frame.awayScore ?? 0)))
  const played = homeScore + awayScore
  const existing = (Array.isArray(frame.legs) ? frame.legs : [])
    .map(normalizeLeg)
    .filter((l): l is LegRow => l != null)

  const next = existing.map(leg => ({
    winner: leg.winner,
    homePlayerStats: cloneStats(leg.homePlayerStats),
    awayPlayerStats: cloneStats(leg.awayPlayerStats),
  }))

  // Always at least N rows; grow if more legs have been played (e.g. 2–1 in race to 2).
  const target = Math.max(seriesLength, played, next.length)
  while (next.length < target) next.push(emptyLeg(null))

  let homeHave = next.filter(l => l.winner === 'home').length
  let awayHave = next.filter(l => l.winner === 'away').length
  while (homeHave < homeScore) {
    const open = next.findIndex(l => l.winner == null)
    if (open >= 0) next[open] = {...next[open], winner: 'home'}
    else next.push(emptyLeg('home'))
    homeHave++
  }
  while (awayHave < awayScore) {
    const open = next.findIndex(l => l.winner == null)
    if (open >= 0) next[open] = {...next[open], winner: 'away'}
    else next.push(emptyLeg('away'))
    awayHave++
  }
  while (homeHave > homeScore) {
    for (let i = next.length - 1; i >= 0; i--) {
      if (next[i].winner === 'home') {
        next[i] = {...next[i], winner: null}
        homeHave--
        break
      }
    }
  }
  while (awayHave > awayScore) {
    for (let i = next.length - 1; i >= 0; i--) {
      if (next[i].winner === 'away') {
        next[i] = {...next[i], winner: null}
        awayHave--
        break
      }
    }
  }
  while (next.length < seriesLength) next.push(emptyLeg(null))

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
