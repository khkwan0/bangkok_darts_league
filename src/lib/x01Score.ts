import AsyncStorage from '@react-native-async-storage/async-storage'
import type {FrameType} from '@/components/Match/types'
import type {CricketBoard} from '@/lib/cricketScore'
import {parseCricketBoard} from '@/lib/cricketScore'
import {hydrateFrameLegs} from '@/lib/hydrateFrameLegs'
import {seriesWinsNeeded} from '@/lib/matchFormat'

/** Highest total from three darts (T20 T20 T20). */
export const MAX_X01_VISIT = 180

const START_SCORES = [1001, 901, 701, 501, 301, 101] as const

export const DEFAULT_X01_START = 501

export type X01Side = 'home' | 'away'

export type X01Undo = {
  home: number
  away: number
  active: X01Side
  legIndex: number
  done: boolean
  /** Set when that visit recorded a checkout. */
  close: {side: X01Side; points: number; legIndex: number} | null
  /** Set when that visit was added to a Score-type total. */
  boardDelta: {side: X01Side; points: number} | null
  /** Cricket marks before this visit, when the board was tracking hits. */
  cricket?: CricketBoard | null
}

export type X01Board = {
  start: number
  legIndex: number
  home: number
  away: number
  active: X01Side
  done: boolean
  undo: X01Undo | null
  /** Present on Score games when hits are being tracked. */
  cricket?: CricketBoard | null
}

const memory = new Map<string, X01Board>()

export type ScoresheetScoringMode = 'close' | 'score'

/**
 * Game-type scoresheet control. Close wins when both flags are set:
 * Close subtracts toward 0, Score counts upward.
 */
export function scoresheetScoringMode(flags: {
  showClose?: boolean
  showScore?: boolean
} | null | undefined): ScoresheetScoringMode | null {
  if (flags?.showClose) return 'close'
  if (flags?.showScore) return 'score'
  return null
}

export function x01StorageKey(
  matchId: number,
  frameIndex: number,
  mode: ScoresheetScoringMode = 'close',
): string {
  const suffix = mode === 'score' ? ':score' : ''
  return `x01-board:v1:${matchId}:${frameIndex}${suffix}`
}

/** Start total named in a format label or game code, e.g. "501 Doubles". */
export function parseX01Start(
  ...parts: (string | number | null | undefined)[]
): number | null {
  const text = parts
    .filter(part => part != null && String(part).trim() !== '')
    .join(' ')
  for (const score of START_SCORES) {
    if (text.includes(String(score))) return score
  }
  return null
}

export function otherX01Side(side: X01Side): X01Side {
  return side === 'home' ? 'away' : 'home'
}

/** Who throws first in leg 0. Unknown first dart starts with home. */
export function x01Starter(
  firstDart: number | null | undefined,
  homeTeamId: number,
  awayTeamId: number,
): X01Side {
  const dart = Number(firstDart ?? 0)
  if (dart > 0 && dart === Number(awayTeamId)) return 'away'
  if (dart > 0 && dart === Number(homeTeamId)) return 'home'
  return 'home'
}

/** Legs alternate who starts. Even legs follow the first-dart side. */
export function x01ActiveForLeg(starter: X01Side, legIndex: number): X01Side {
  const leg = Math.max(0, Math.trunc(legIndex))
  if (leg % 2 === 0) return starter
  return otherX01Side(starter)
}

export function x01WinsNeeded(frame: FrameType): number {
  const games = Math.max(1, Math.trunc(Number(frame.games ?? 1)))
  const mode = String(frame.seriesMode ?? '')
  const isSeries = games > 1 || mode === 'race_to' || mode === 'best_of'
  if (!isSeries) return 1
  return seriesWinsNeeded(mode === 'race_to' ? 'race_to' : 'best_of', games)
}

/** First leg that does not have a winner yet. Null when every leg is decided. */
export function firstOpenX01Leg(frame: FrameType): number | null {
  const legs = hydrateFrameLegs(frame).legs ?? []
  if (legs.length === 0) return 0
  const idx = legs.findIndex(leg => leg.winner == null)
  return idx >= 0 ? idx : null
}

export function x01LegWins(frame: FrameType): {home: number; away: number} {
  const legs = hydrateFrameLegs(frame).legs ?? []
  let home = 0
  let away = 0
  for (const leg of legs) {
    if (leg.winner === 'home') home += 1
    else if (leg.winner === 'away') away += 1
  }
  if (home + away === 0 && legs.length === 0) {
    home = Math.max(0, Math.trunc(Number(frame.homeScore ?? 0)))
    away = Math.max(0, Math.trunc(Number(frame.awayScore ?? 0)))
  }
  return {home, away}
}

/**
 * Subtract a visit from the remaining total.
 * Exactly 0 closes. A negative result flips to a positive remainder.
 */
export function applyX01Visit(
  remaining: number,
  scored: number,
): {remaining: number; closed: boolean; reflected: boolean} {
  const left = Math.trunc(Number(remaining) || 0)
  const hit = Math.trunc(Number(scored) || 0)
  if (hit <= 0) return {remaining: left, closed: false, reflected: false}
  const next = left - hit
  if (next === 0) return {remaining: 0, closed: true, reflected: false}
  if (next < 0) return {remaining: -next, closed: false, reflected: true}
  return {remaining: next, closed: false, reflected: false}
}

/** Keep a local board aligned with legs already won on the scoresheet. */
export function reconcileX01Board(
  board: X01Board,
  frame: FrameType,
  homeTeamId: number,
  awayTeamId: number,
): X01Board {
  const open = firstOpenX01Leg(frame)
  if (open == null) {
    if (board.done) return board
    return {...board, done: true}
  }
  if (open <= board.legIndex) return board
  const starter = x01Starter(frame.firstDart, homeTeamId, awayTeamId)
  return freshX01Board({
    start: board.start,
    legIndex: open,
    active: x01ActiveForLeg(starter, open),
  })
}

export function freshX01Board(args: {
  start: number
  legIndex: number
  active: X01Side
  done?: boolean
}): X01Board {
  const start = Math.max(1, Math.trunc(args.start))
  return {
    start,
    legIndex: Math.max(0, Math.trunc(args.legIndex)),
    home: start,
    away: start,
    active: args.active,
    done: Boolean(args.done),
    undo: null,
  }
}

function isSide(value: unknown): value is X01Side {
  return value === 'home' || value === 'away'
}

function parseBoardDelta(
  value: unknown,
): {side: X01Side; points: number} | null {
  if (!value || typeof value !== 'object') return null
  const row = value as {side?: unknown; points?: unknown}
  if (!isSide(row.side) || !Number.isFinite(Number(row.points))) return null
  return {
    side: row.side,
    points: Math.max(0, Math.trunc(Number(row.points))),
  }
}

function parseUndo(value: unknown): X01Undo | null {
  if (!value || typeof value !== 'object') return null
  const row = value as X01Undo
  if (!isSide(row.active)) return null
  if (!Number.isFinite(Number(row.home)) || !Number.isFinite(Number(row.away))) {
    return null
  }
  const close = row.close
  const parsedClose =
    close &&
    isSide(close.side) &&
    Number.isFinite(Number(close.points)) &&
    Number.isFinite(Number(close.legIndex))
      ? {
          side: close.side,
          points: Math.max(0, Math.trunc(Number(close.points))),
          legIndex: Math.max(0, Math.trunc(Number(close.legIndex))),
        }
      : null
  return {
    home: Math.max(0, Math.trunc(Number(row.home))),
    away: Math.max(0, Math.trunc(Number(row.away))),
    active: row.active,
    legIndex: Math.max(0, Math.trunc(Number(row.legIndex ?? 0))),
    done: Boolean(row.done),
    close: parsedClose,
    boardDelta: parseBoardDelta(row.boardDelta),
    ...('cricket' in row
      ? {cricket: parseCricketBoard(row.cricket) ?? null}
      : {}),
  }
}

export function parseX01Board(raw: unknown): X01Board | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as X01Board
  if (!isSide(row.active)) return null
  const start = Math.trunc(Number(row.start))
  const home = Math.trunc(Number(row.home))
  const away = Math.trunc(Number(row.away))
  const legIndex = Math.trunc(Number(row.legIndex))
  if (![start, home, away, legIndex].every(n => Number.isFinite(n))) return null
  if (start < 0) return null
  return {
    start,
    legIndex: Math.max(0, legIndex),
    home: Math.max(0, home),
    away: Math.max(0, away),
    active: row.active,
    done: Boolean(row.done),
    undo: parseUndo(row.undo),
    ...('cricket' in row
      ? {cricket: parseCricketBoard(row.cricket) ?? null}
      : {}),
  }
}

export type X01CommitResult =
  | {type: 'ignore'}
  | {
      type: 'applied'
      board: X01Board
      reflected: boolean
      closed: boolean
      /** Checkout to send. Null when the visit did not finish. */
      close: {side: X01Side; points: number; legIndex: number} | null
      nextRemaining: number
    }

/**
 * Apply one visit. `legWins` must not already include this checkout.
 * A close that reaches the legs needed freezes the board; otherwise both
 * sides restart and the turn rotates.
 */
export function commitX01Visit(
  board: X01Board,
  points: number,
  legWins: {home: number; away: number},
  need: number,
): X01CommitResult {
  const hit = Math.trunc(Number(points) || 0)
  if (board.done || hit <= 0 || hit > MAX_X01_VISIT) return {type: 'ignore'}
  const side = board.active
  const current = side === 'home' ? board.home : board.away
  const applied = applyX01Visit(current, hit)
  let home = side === 'home' ? applied.remaining : board.home
  let away = side === 'away' ? applied.remaining : board.away
  const close = applied.closed
    ? {side, points: hit, legIndex: board.legIndex}
    : null
  const homeWins = legWins.home + (close?.side === 'home' ? 1 : 0)
  const awayWins = legWins.away + (close?.side === 'away' ? 1 : 0)
  const finishes =
    close != null && (homeWins >= need || awayWins >= need)
  let legIndex = board.legIndex
  let active = otherX01Side(side)
  let done = false
  if (close && !finishes) {
    home = board.start
    away = board.start
    legIndex = board.legIndex + 1
  } else if (finishes) {
    active = side
    done = true
  }
  return {
    type: 'applied',
    reflected: applied.reflected,
    closed: applied.closed,
    close,
    nextRemaining: applied.remaining,
    board: {
      start: board.start,
      legIndex,
      home,
      away,
      active,
      done,
      undo: {
        home: board.home,
        away: board.away,
        active: board.active,
        legIndex: board.legIndex,
        done: board.done,
        close,
        boardDelta: null,
        ...(board.cricket !== undefined ? {cricket: board.cricket} : {}),
      },
      ...(board.cricket !== undefined ? {cricket: board.cricket} : {}),
    },
  }
}

export function undoX01Visit(board: X01Board): {
  board: X01Board
  reverseClose: {side: X01Side; points: number; legIndex: number} | null
  reverseBoard: {side: X01Side; points: number} | null
} | null {
  if (!board.undo) return null
  return {
    reverseClose: board.undo.close,
    reverseBoard: board.undo.boardDelta,
    board: {
      start: board.start,
      home: board.undo.home,
      away: board.undo.away,
      active: board.undo.active,
      legIndex: board.undo.legIndex,
      done: board.undo.done,
      undo: null,
      ...(board.undo.cricket !== undefined
        ? {cricket: board.undo.cricket}
        : board.cricket !== undefined
          ? {cricket: board.cricket}
          : {}),
    },
  }
}

/** Score-type visit: add the points and hand the oche to the other side. */
export function commitCountUpVisit(
  board: X01Board,
  points: number,
): X01CommitResult {
  const hit = Math.trunc(Number(points) || 0)
  if (board.done || hit <= 0 || hit > MAX_X01_VISIT) return {type: 'ignore'}
  const side = board.active
  const home = side === 'home' ? board.home + hit : board.home
  const away = side === 'away' ? board.away + hit : board.away
  const total = side === 'home' ? home : away
  return {
    type: 'applied',
    reflected: false,
    closed: false,
    close: null,
    nextRemaining: total,
    board: {
      start: board.start,
      legIndex: board.legIndex,
      home,
      away,
      active: otherX01Side(side),
      done: false,
      cricket: board.cricket
        ? {...board.cricket, dartsThrown: 0, home: {...board.cricket.home}, away: {...board.cricket.away}}
        : board.cricket,
      undo: {
        home: board.home,
        away: board.away,
        active: board.active,
        legIndex: board.legIndex,
        done: board.done,
        close: null,
        boardDelta: {side, points: hit},
        ...(board.cricket !== undefined ? {cricket: board.cricket} : {}),
      },
    },
  }
}

export async function loadX01Board(key: string): Promise<X01Board | null> {
  const cached = memory.get(key)
  if (cached) return cached
  try {
    const raw = await AsyncStorage.getItem(key)
    if (!raw) return null
    const parsed = parseX01Board(JSON.parse(raw))
    if (parsed) memory.set(key, parsed)
    return parsed
  } catch {
    return null
  }
}

export function saveX01Board(key: string, board: X01Board) {
  memory.set(key, board)
  AsyncStorage.setItem(key, JSON.stringify(board)).catch(() => {})
}
