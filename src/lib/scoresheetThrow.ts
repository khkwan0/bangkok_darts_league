import type {FrameType, LegRow, PlayerLegStat} from '@/components/Match/types'
import {seriesWinsNeeded} from '@/lib/matchFormat'
import {loadX01Board, x01StorageKey} from '@/lib/x01Score'

const TON_MIN = 100
const VISIT_MAX = 180

type ThrowInput = {
  side: 'home' | 'away'
  legIndex: number
  points: number
  bust: boolean
  closed: boolean
  board?: boolean
  playerIdx?: number
  undo?: boolean
}

function emptyStat(): PlayerLegStat {
  return {tons: 0, heavyTons: 0, closes: 0}
}

function cloneStats(stats: PlayerLegStat[] | undefined): PlayerLegStat[] {
  return (stats ?? []).map(stat => ({
    tons: Math.max(0, Math.trunc(Number(stat?.tons) || 0)),
    heavyTons: Math.max(0, Math.trunc(Number(stat?.heavyTons) || 0)),
    closes: Math.max(0, Math.trunc(Number(stat?.closes) || 0)),
  }))
}

function sumStats(stats: PlayerLegStat[]): PlayerLegStat {
  return stats.reduce(
    (sum, stat) => ({
      tons: sum.tons + stat.tons,
      heavyTons: sum.heavyTons + stat.heavyTons,
      closes: sum.closes + stat.closes,
    }),
    emptyStat(),
  )
}

function isSeries(frame: FrameType): boolean {
  const games = Math.max(1, Math.trunc(Number(frame.games ?? 1)))
  const mode = String(frame.seriesMode ?? '')
  return games > 1 || mode === 'race_to' || mode === 'best_of'
}

function aggregateSide(
  legs: LegRow[],
  side: 'home' | 'away',
): PlayerLegStat[] {
  const key = side === 'home' ? 'homePlayerStats' : 'awayPlayerStats'
  const slots = legs.reduce(
    (count, leg) => Math.max(count, leg[key]?.length ?? 0),
    0,
  )
  const out: PlayerLegStat[] = []
  for (let slot = 0; slot < slots; slot++) {
    const sum = emptyStat()
    for (const leg of legs) {
      const stat = leg[key]?.[slot]
      if (!stat) continue
      sum.tons += stat.tons
      sum.heavyTons += stat.heavyTons
      sum.closes += stat.closes
    }
    out.push(sum)
  }
  return out
}

/**
 * Apply one x01 visit onto the scoresheet frame immediately.
 * Mirrors the server visit tally: 100–179 is a ton, 180 is only a 180,
 * and a checkout adds its score to closes.
 */
export function applyScoresheetThrow(
  frame: FrameType,
  visit: ThrowInput,
  teams: {homeTeamId: number; awayTeamId: number},
): FrameType {
  const points = Math.trunc(Number(visit.points) || 0)
  if (points <= 0 || points > VISIT_MAX) return frame
  const side = visit.side === 'away' ? 'away' : 'home'
  const legIndex = Math.max(0, Math.trunc(Number(visit.legIndex) || 0))
  const playerIdx = Math.max(0, Math.trunc(Number(visit.playerIdx) || 0))
  const undo = Boolean(visit.undo)
  const sign = undo ? -1 : 1
  const bust = Boolean(visit.bust)
  const oneEighty = !bust && points === VISIT_MAX
  const ton = !bust && points >= TON_MIN && points < VISIT_MAX
  const close = !bust && Boolean(visit.closed)

  const legs: LegRow[] = (Array.isArray(frame.legs) ? frame.legs : []).map(
    leg => ({
      winner: leg?.winner === 'home' || leg?.winner === 'away' ? leg.winner : null,
      homePlayerStats: cloneStats(leg?.homePlayerStats),
      awayPlayerStats: cloneStats(leg?.awayPlayerStats),
    }),
  )
  while (legs.length <= legIndex) {
    legs.push({winner: null, homePlayerStats: [], awayPlayerStats: []})
  }
  const legsHadStats = legs.some(leg => {
    const total = (stats: PlayerLegStat[]) =>
      stats.reduce(
        (sum, stat) => sum + stat.tons + stat.heavyTons + stat.closes,
        0,
      )
    return total(leg.homePlayerStats) + total(leg.awayPlayerStats) > 0
  })
  if (!legsHadStats) {
    legs[0] = {
      ...legs[0],
      homePlayerStats: cloneStats(frame.homePlayerStats),
      awayPlayerStats: cloneStats(frame.awayPlayerStats),
    }
  }

  const statKey = side === 'home' ? 'homePlayerStats' : 'awayPlayerStats'
  const slots = legs[legIndex][statKey]
  while (slots.length <= playerIdx) slots.push(emptyStat())
  const slot = slots[playerIdx]
  if (oneEighty) {
    slot.heavyTons = Math.max(0, slot.heavyTons + sign)
  } else if (ton) {
    slot.tons = Math.max(0, slot.tons + sign)
  }
  if (close) slot.closes = Math.max(0, slot.closes + sign * points)

  if (close) {
    const homeCloses = sumStats(legs[legIndex].homePlayerStats).closes
    const awayCloses = sumStats(legs[legIndex].awayPlayerStats).closes
    legs[legIndex] = {
      ...legs[legIndex],
      winner:
        homeCloses > 0 && awayCloses <= 0
          ? 'home'
          : awayCloses > 0 && homeCloses <= 0
            ? 'away'
            : null,
    }
  }

  const homePlayerStats = aggregateSide(legs, 'home')
  const awayPlayerStats = aggregateSide(legs, 'away')
  const home = sumStats(homePlayerStats)
  const away = sumStats(awayPlayerStats)

  let homeScore = Math.max(0, Math.trunc(Number(frame.homeScore) || 0))
  let awayScore = Math.max(0, Math.trunc(Number(frame.awayScore) || 0))
  let winner = Math.max(0, Math.trunc(Number(frame.winner) || 0))
  if (close) {
    if (isSeries(frame)) {
      homeScore = legs.filter(leg => leg.winner === 'home').length
      awayScore = legs.filter(leg => leg.winner === 'away').length
      const games = Math.max(1, Math.trunc(Number(frame.games ?? 1)))
      const mode = String(frame.seriesMode ?? '')
      const need = seriesWinsNeeded(
        mode === 'race_to' ? 'race_to' : 'best_of',
        games,
      )
      if (homeScore >= need && teams.homeTeamId > 0) winner = teams.homeTeamId
      else if (awayScore >= need && teams.awayTeamId > 0) winner = teams.awayTeamId
      else winner = 0
    } else if (home.closes > 0 && away.closes <= 0 && teams.homeTeamId > 0) {
      winner = teams.homeTeamId
      homeScore = 1
      awayScore = 0
    } else if (away.closes > 0 && home.closes <= 0 && teams.awayTeamId > 0) {
      winner = teams.awayTeamId
      homeScore = 0
      awayScore = 1
    } else if (home.closes <= 0 && away.closes <= 0) {
      winner = 0
      homeScore = 0
      awayScore = 0
    }
  }

  const visits = Array.isArray(frame.visits) ? [...frame.visits] : []
  const stored = {
    side,
    legIndex,
    points,
    bust,
    ton,
    oneEighty,
    close,
    board: !bust && Boolean(visit.board),
    playerIdx,
  }
  if (!undo) {
    visits.push(stored)
  } else {
    for (let i = visits.length - 1; i >= 0; i--) {
      const row = visits[i]
      if (
        row?.side === side &&
        Number(row.legIndex ?? 0) === legIndex &&
        Number(row.points) === points &&
        Boolean(row.bust) === bust &&
        Boolean(row.close) === close &&
        Number(row.playerIdx ?? 0) === playerIdx
      ) {
        visits.splice(i, 1)
        break
      }
    }
  }

  let homeBoardScore = Math.max(0, Math.trunc(Number(frame.homeBoardScore) || 0))
  let awayBoardScore = Math.max(0, Math.trunc(Number(frame.awayBoardScore) || 0))
  if (!bust && visit.board) {
    if (side === 'home') homeBoardScore = Math.max(0, homeBoardScore + sign * points)
    else awayBoardScore = Math.max(0, awayBoardScore + sign * points)
  }

  return {
    ...frame,
    legs,
    homePlayerStats,
    awayPlayerStats,
    homeTons: home.tons,
    awayTons: away.tons,
    homeHeavyTons: home.heavyTons,
    awayHeavyTons: away.heavyTons,
    homeCloses: home.closes,
    awayCloses: away.closes,
    homeScore,
    awayScore,
    winner,
    homeBoardScore,
    awayBoardScore,
    visits,
  }
}

type SavedThrow = {
  side?: string
  legIndex?: number
  points?: number
  bust?: boolean
  closed?: boolean
  close?: boolean
  playerIdx?: number
}

/** Visits remembered on the local x01 board, used when the scoresheet reloads. */
export function throwVisitsFromUndo(
  undoStack: Array<{visit?: SavedThrow | null}> | null | undefined,
): NonNullable<FrameType['visits']> {
  if (!Array.isArray(undoStack)) return []
  const out: NonNullable<FrameType['visits']> = []
  for (const entry of undoStack) {
    const visit = entry?.visit
    if (!visit) continue
    const points = Math.trunc(Number(visit.points) || 0)
    if (points <= 0 || points > VISIT_MAX) continue
    const side = visit.side === 'away' ? 'away' : 'home'
    const bust = Boolean(visit.bust)
    out.push({
      side,
      legIndex: Math.max(0, Math.trunc(Number(visit.legIndex) || 0)),
      points,
      bust,
      ton: !bust && points >= TON_MIN && points < VISIT_MAX,
      oneEighty: !bust && points === VISIT_MAX,
      close: !bust && Boolean(visit.closed ?? visit.close),
      board: false,
      playerIdx: Math.max(0, Math.trunc(Number(visit.playerIdx) || 0)),
    })
  }
  return out
}

function tallyKey(side: 'home' | 'away', legIndex: number, playerIdx: number) {
  return `${side}:${legIndex}:${playerIdx}`
}

function deriveThrowTallies(visits: FrameType['visits'] | undefined) {
  const totals = new Map<string, PlayerLegStat>()
  for (const visit of visits ?? []) {
    if (!visit || visit.bust) continue
    const points = Math.trunc(Number(visit.points) || 0)
    if (points <= 0 || points > VISIT_MAX) continue
    const side = visit.side === 'away' ? 'away' : 'home'
    const legIndex = Math.max(0, Math.trunc(Number(visit.legIndex) || 0))
    const playerIdx = Math.max(0, Math.trunc(Number(visit.playerIdx) || 0))
    const key = tallyKey(side, legIndex, playerIdx)
    const slot = totals.get(key) ?? emptyStat()
    if (points === VISIT_MAX) slot.heavyTons += 1
    else if (points >= TON_MIN) slot.tons += 1
    if (visit.close) slot.closes += points
    totals.set(key, slot)
  }
  return totals
}

function maxTally(a: PlayerLegStat, b: PlayerLegStat): PlayerLegStat {
  return {
    tons: Math.max(a.tons, b.tons),
    heavyTons: Math.max(a.heavyTons, b.heavyTons),
    closes: Math.max(a.closes, b.closes),
  }
}

/**
 * Keep tons, 180s, and closes that were entered on the scoring screen.
 * Saved throws win when the reloaded frame lost those player totals.
 */
export function reconcileFrameThrowTallies(
  frame: FrameType,
  extraVisits?: FrameType['visits'],
): FrameType {
  if (frame.type === 'section') return frame
  const fromFrame = deriveThrowTallies(frame.visits)
  const fromExtra = deriveThrowTallies(extraVisits)
  if (fromFrame.size === 0 && fromExtra.size === 0) return frame
  const desired = new Map<string, PlayerLegStat>()
  for (const [key, slot] of fromFrame) desired.set(key, {...slot})
  for (const [key, slot] of fromExtra) {
    desired.set(key, maxTally(desired.get(key) ?? emptyStat(), slot))
  }

  const legs: LegRow[] = (Array.isArray(frame.legs) ? frame.legs : []).map(
    leg => ({
      winner: leg?.winner === 'home' || leg?.winner === 'away' ? leg.winner : null,
      homePlayerStats: cloneStats(leg?.homePlayerStats),
      awayPlayerStats: cloneStats(leg?.awayPlayerStats),
    }),
  )
  let changed = false
  for (const [key, want] of desired) {
    const [side, legRaw, playerRaw] = key.split(':')
    const legIndex = Number(legRaw)
    const playerIdx = Number(playerRaw)
    while (legs.length <= legIndex) {
      legs.push({winner: null, homePlayerStats: [], awayPlayerStats: []})
      changed = true
    }
    const statKey = side === 'away' ? 'awayPlayerStats' : 'homePlayerStats'
    const slots = legs[legIndex][statKey]
    while (slots.length <= playerIdx) {
      slots.push(emptyStat())
      changed = true
    }
    const slot = slots[playerIdx]
    const next = maxTally(slot, want)
    if (
      next.tons !== slot.tons ||
      next.heavyTons !== slot.heavyTons ||
      next.closes !== slot.closes
    ) {
      slots[playerIdx] = next
      changed = true
    }
  }
  if (!changed) return frame

  for (const leg of legs) {
    const homeCloses = sumStats(leg.homePlayerStats).closes
    const awayCloses = sumStats(leg.awayPlayerStats).closes
    if (homeCloses > 0 && awayCloses <= 0) leg.winner = 'home'
    else if (awayCloses > 0 && homeCloses <= 0) leg.winner = 'away'
  }
  const homePlayerStats = aggregateSide(legs, 'home')
  const awayPlayerStats = aggregateSide(legs, 'away')
  const home = sumStats(homePlayerStats)
  const away = sumStats(awayPlayerStats)
  const homeScore = legs.filter(leg => leg.winner === 'home').length
  const awayScore = legs.filter(leg => leg.winner === 'away').length
  return {
    ...frame,
    legs,
    homePlayerStats,
    awayPlayerStats,
    homeTons: home.tons,
    awayTons: away.tons,
    homeHeavyTons: home.heavyTons,
    awayHeavyTons: away.heavyTons,
    homeCloses: home.closes,
    awayCloses: away.closes,
    homeScore: Math.max(Number(frame.homeScore ?? 0) || 0, homeScore),
    awayScore: Math.max(Number(frame.awayScore ?? 0) || 0, awayScore),
  }
}

/** Put saved scoring throws back onto the frames after the scoresheet reloads. */
export async function restoreThrowTallies(
  frames: FrameType[],
  matchId: number,
): Promise<FrameType[]> {
  if (!matchId || frames.length === 0) return frames
  let changed = false
  const next = await Promise.all(
    frames.map(async (frame, index) => {
      if (!frame || frame.type === 'section' || frame.frameNumber === -1) {
        return frame
      }
      const [closeBoard, scoreBoard] = await Promise.all([
        loadX01Board(x01StorageKey(matchId, index, 'close')),
        loadX01Board(x01StorageKey(matchId, index, 'score')),
      ])
      const extra = [
        ...throwVisitsFromUndo(closeBoard?.undoStack),
        ...throwVisitsFromUndo(scoreBoard?.undoStack),
      ]
      if (extra.length === 0) return frame
      const restored = reconcileFrameThrowTallies(frame, extra)
      if (restored !== frame) changed = true
      return restored
    }),
  )
  return changed ? next : frames
}
