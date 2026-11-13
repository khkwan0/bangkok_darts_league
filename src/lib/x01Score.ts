import AsyncStorage from '@react-native-async-storage/async-storage'
import type {FrameType} from '@/components/Match/types'
import type {CricketBoard, CricketMultiplier, CricketSides} from '@/lib/cricketScore'
import {
  applyScoreThrow,
  emptyCricketMarks,
  parseCricketBoard,
  pointsFromScoreThrows,
} from '@/lib/cricketScore'
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
  homeThrower: number
  awayThrower: number
  /** Set when that visit recorded a checkout. */
  close: {
    side: X01Side
    points: number
    legIndex: number
    playerIdx: number
  } | null
  /** Set when that visit was added to a Score-type total. */
  boardDelta: {side: X01Side; points: number; playerIdx?: number} | null
  /** Cricket marks before this visit, when the board was tracking hits. */
  cricket?: CricketBoard | null
  /** Dart shown in the score-game history, such as T20 or 0. */
  label?: string | null
  /** Number hit: 0 miss, 15–20, or 25 bull. */
  sector?: number | null
  /** 1 single, 2 double, 3 triple. A triple bull is stored as 2. */
  multiplier?: number | null
  /** Throw written to match Redis, so undo can reverse the same visit. */
  visit?: {
    side: X01Side
    legIndex: number
    points: number
    bust: boolean
    closed: boolean
    board: boolean
    playerIdx: number
  } | null
}

export type X01Board = {
  start: number
  legIndex: number
  home: number
  away: number
  active: X01Side
  done: boolean
  /** Next thrower slot for home (entry order); modulo roster length when shown. */
  homeThrower: number
  /** Next thrower slot for away (entry order); modulo roster length when shown. */
  awayThrower: number
  /** Prior board snapshots; newest last. Supports multi-step undo. */
  undoStack: X01Undo[]
  /** Present on Score games when hits are being tracked. */
  cricket?: CricketBoard | null
  /** Shared-change counter; a device only takes remote boards with a higher one. */
  rev?: number
}

/** One Score-game dart as shared between devices. */
export type ScoreThrowSync = {
  side: X01Side
  sector: number | null
  multiplier: number | null
  label: string | null
  points: number
  homeThrower: number
  awayThrower: number
  dartsThrown: number
}

export function scoreThrowsForSync(board: X01Board): ScoreThrowSync[] {
  return board.undoStack.map(entry => ({
    side: entry.active,
    sector: entry.sector ?? null,
    multiplier: entry.multiplier ?? null,
    label: entry.label ?? null,
    points: entry.boardDelta?.points ?? 0,
    homeThrower: entry.homeThrower,
    awayThrower: entry.awayThrower,
    dartsThrown: entry.cricket?.dartsThrown ?? 0,
  }))
}

/** Rebuild a Score-game board, history included, from another device's state. */
export function scoreBoardFromSync(
  sync: {
    legIndex: number
    active: X01Side
    done: boolean
    rev?: number
    homeThrower?: number
    awayThrower?: number
    dartsThrown?: number
    throws: ScoreThrowSync[]
  },
  multiplier: CricketMultiplier,
): X01Board {
  let marks: CricketSides = {home: emptyCricketMarks(), away: emptyCricketMarks()}
  const hits = {home: 0, away: 0}
  const deltas = {home: 0, away: 0}
  const undoStack: X01Undo[] = []
  for (const dart of sync.throws) {
    const entry: X01Undo = {
      home: Math.max(hits.home, deltas.home),
      away: Math.max(hits.away, deltas.away),
      active: dart.side,
      legIndex: sync.legIndex,
      done: false,
      homeThrower: dart.homeThrower,
      awayThrower: dart.awayThrower,
      close: null,
      boardDelta: dart.points > 0 ? {side: dart.side, points: dart.points} : null,
      cricket: {
        home: {...marks.home},
        away: {...marks.away},
        dartsThrown: dart.dartsThrown,
        multiplier: 1,
      },
      sector: dart.sector,
      multiplier: dart.multiplier,
      label: dart.label,
    }
    undoStack.push(entry)
    const hit = applyScoreThrow(marks, entry)
    marks = hit.marks
    hits[hit.side] += hit.points
    deltas[dart.side] += dart.points
  }
  return {
    start: 0,
    legIndex: sync.legIndex,
    home: Math.max(hits.home, deltas.home),
    away: Math.max(hits.away, deltas.away),
    active: sync.active,
    done: sync.done,
    homeThrower: sync.homeThrower ?? 0,
    awayThrower: sync.awayThrower ?? 0,
    undoStack,
    cricket: {
      home: marks.home,
      away: marks.away,
      dartsThrown: Math.min(2, Math.max(0, Math.trunc(sync.dartsThrown ?? 0))),
      multiplier,
    },
    rev: sync.rev ?? 0,
  }
}

export function scoreTotalsFromHistory(
  undoStack: Array<{
    active?: string
    label?: string | null
    sector?: number | null
    multiplier?: number | null
    boardDelta?: {side?: string; points?: number} | null
  }> | null | undefined,
): {home: number; away: number} {
  return pointsFromScoreThrows(undoStack)
}

export function canUndoX01(
  board: Pick<X01Board, 'undoStack'> | null | undefined,
): boolean {
  return Boolean(board?.undoStack?.length)
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

export function x01RosterNames(nicknames: string[]): string[] {
  return nicknames.filter(n => String(n ?? '').trim() !== '')
}

/** Slot for the side that throws next (wraps with roster length). */
export function x01ThrowerSlot(
  board: Pick<X01Board, 'homeThrower' | 'awayThrower'>,
  side: X01Side,
  rosterLength: number,
): number {
  if (rosterLength <= 0) return 0
  const raw = side === 'home' ? board.homeThrower : board.awayThrower
  return ((Math.trunc(Number(raw) || 0) % rosterLength) + rosterLength) % rosterLength
}

/**
 * Scoresheet `playerIds` indices with a real player (thrower roster order).
 * Thrower slots index this list, not sparse `playerIds` holes.
 */
export function x01FilledPlayerSlots(
  playerIds: Array<number | null | undefined> | undefined,
): number[] {
  if (!Array.isArray(playerIds)) return []
  const out: number[] = []
  for (let i = 0; i < playerIds.length; i++) {
    if (Number(playerIds[i]) > 0) out.push(i)
  }
  return out
}

/** Scoresheet playerIdx for the active thrower on a side. */
export function x01ThrowerPlayerIdx(
  board: Pick<X01Board, 'homeThrower' | 'awayThrower'>,
  side: X01Side,
  playerIds: Array<number | null | undefined> | undefined,
): number {
  const slots = x01FilledPlayerSlots(playerIds)
  if (slots.length === 0) return 0
  return slots[x01ThrowerSlot(board, side, slots.length)] ?? 0
}

/** Who throws next for a side from the board’s thrower slot. */
export function x01ThrowerName(
  nicknames: string[],
  board: Pick<X01Board, 'homeThrower' | 'awayThrower'>,
  side: X01Side,
): string | null {
  const roster = x01RosterNames(nicknames)
  if (roster.length === 0) return null
  return roster[x01ThrowerSlot(board, side, roster.length)] ?? null
}

/** Manual pick — next auto advance continues from this person. */
export function setX01Thrower(
  board: X01Board,
  side: X01Side,
  slot: number,
  rosterLength: number,
): X01Board {
  if (rosterLength <= 0) return board
  const next =
    ((Math.trunc(Number(slot) || 0) % rosterLength) + rosterLength) %
    rosterLength
  return side === 'home'
    ? {...board, homeThrower: next}
    : {...board, awayThrower: next}
}

/** After a visit, move that side’s slot to the next roster player. */
export function advanceX01Thrower(
  board: X01Board,
  side: X01Side,
  rosterLength: number,
): X01Board {
  if (rosterLength <= 0) return board
  const cur = x01ThrowerSlot(board, side, rosterLength)
  const next = (cur + 1) % rosterLength
  return side === 'home'
    ? {...board, homeThrower: next}
    : {...board, awayThrower: next}
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
 * Subtract a visit from the remaining total (classic X01).
 * Exactly 0 closes. Going under 0 is a bust: remaining stays put.
 * (`reflected` means bust — kept for call-site compatibility.)
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
  if (next < 0) return {remaining: left, closed: false, reflected: true}
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
    homeThrower: 0,
    awayThrower: 0,
    undoStack: [],
  }
}

function isSide(value: unknown): value is X01Side {
  return value === 'home' || value === 'away'
}

function parseBoardDelta(
  value: unknown,
): {side: X01Side; points: number; playerIdx?: number} | null {
  if (!value || typeof value !== 'object') return null
  const row = value as {side?: unknown; points?: unknown; playerIdx?: unknown}
  if (!isSide(row.side) || !Number.isFinite(Number(row.points))) return null
  const playerIdx = Math.max(0, Math.trunc(Number(row.playerIdx) || 0))
  return {
    side: row.side,
    points: Math.max(0, Math.trunc(Number(row.points))),
    ...(Number.isFinite(Number(row.playerIdx)) ? {playerIdx} : {}),
  }
}

function parseVisitMark(value: unknown): X01Undo['visit'] {
  if (!value || typeof value !== 'object') return null
  const row = value as {
    side?: unknown
    legIndex?: unknown
    points?: unknown
    bust?: unknown
    closed?: unknown
    board?: unknown
    playerIdx?: unknown
  }
  if (!isSide(row.side) || !Number.isFinite(Number(row.points))) return null
  return {
    side: row.side,
    legIndex: Math.max(0, Math.trunc(Number(row.legIndex) || 0)),
    points: Math.max(0, Math.trunc(Number(row.points))),
    bust: Boolean(row.bust),
    closed: Boolean(row.closed),
    board: Boolean(row.board),
    playerIdx: Math.max(0, Math.trunc(Number(row.playerIdx) || 0)),
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
          playerIdx: Math.max(0, Math.trunc(Number(close.playerIdx) || 0)),
        }
      : null
  return {
    home: Math.max(0, Math.trunc(Number(row.home))),
    away: Math.max(0, Math.trunc(Number(row.away))),
    active: row.active,
    legIndex: Math.max(0, Math.trunc(Number(row.legIndex ?? 0))),
    done: Boolean(row.done),
    homeThrower: Math.max(0, Math.trunc(Number(row.homeThrower ?? 0))),
    awayThrower: Math.max(0, Math.trunc(Number(row.awayThrower ?? 0))),
    close: parsedClose,
    boardDelta: parseBoardDelta(row.boardDelta),
    visit: parseVisitMark(row.visit),
    label:
      typeof row.label === 'string' && row.label.trim() !== ''
        ? row.label.trim()
        : null,
    sector:
      typeof row.sector === 'number' && Number.isFinite(row.sector)
        ? Math.trunc(row.sector)
        : null,
    multiplier:
      row.multiplier === 1 || row.multiplier === 2 || row.multiplier === 3
        ? row.multiplier
        : null,
    ...('cricket' in row
      ? {cricket: parseCricketBoard(row.cricket) ?? null}
      : {}),
  }
}

function parseUndoStack(row: Record<string, unknown>): X01Undo[] {
  if (Array.isArray(row.undoStack)) {
    return row.undoStack
      .map(parseUndo)
      .filter((entry): entry is X01Undo => entry != null)
  }
  // Legacy single-snapshot boards.
  const single = parseUndo(row.undo)
  return single ? [single] : []
}

export function parseX01Board(raw: unknown): X01Board | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as X01Board & Record<string, unknown>
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
    homeThrower: Math.max(0, Math.trunc(Number(row.homeThrower ?? 0))),
    awayThrower: Math.max(0, Math.trunc(Number(row.awayThrower ?? 0))),
    undoStack: parseUndoStack(row as Record<string, unknown>),
    ...('cricket' in row
      ? {cricket: parseCricketBoard(row.cricket) ?? null}
      : {}),
    rev: Math.max(0, Math.trunc(Number(row.rev) || 0)),
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
      close: {
        side: X01Side
        points: number
        legIndex: number
        playerIdx: number
      } | null
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
  playerIdx = 0,
): X01CommitResult {
  const hit = Math.trunc(Number(points) || 0)
  if (board.done || hit <= 0 || hit > MAX_X01_VISIT) return {type: 'ignore'}
  const side = board.active
  const throwerIdx = Math.max(0, Math.trunc(Number(playerIdx) || 0))
  const current = side === 'home' ? board.home : board.away
  const applied = applyX01Visit(current, hit)
  let home = side === 'home' ? applied.remaining : board.home
  let away = side === 'away' ? applied.remaining : board.away
  const close = applied.closed
    ? {
        side,
        points: hit,
        legIndex: board.legIndex,
        playerIdx: throwerIdx,
      }
    : null
  const homeWins = legWins.home + (close?.side === 'home' ? 1 : 0)
  const awayWins = legWins.away + (close?.side === 'away' ? 1 : 0)
  const finishes =
    close != null && (homeWins >= need || awayWins >= need)
  let legIndex = board.legIndex
  let active = otherX01Side(side)
  let done = false
  let homeThrower = board.homeThrower
  let awayThrower = board.awayThrower
  if (close && !finishes) {
    home = board.start
    away = board.start
    legIndex = board.legIndex + 1
    homeThrower = 0
    awayThrower = 0
  } else if (finishes) {
    active = side
    done = true
  } else if (side === 'home') {
    homeThrower = board.homeThrower + 1
  } else {
    awayThrower = board.awayThrower + 1
  }
  const undoEntry: X01Undo = {
    home: board.home,
    away: board.away,
    active: board.active,
    legIndex: board.legIndex,
    done: board.done,
    homeThrower: board.homeThrower,
    awayThrower: board.awayThrower,
    close,
    boardDelta: null,
    ...(board.cricket !== undefined ? {cricket: board.cricket} : {}),
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
      homeThrower,
      awayThrower,
      undoStack: [...board.undoStack, undoEntry],
      ...(board.cricket !== undefined ? {cricket: board.cricket} : {}),
    },
  }
}

export function undoX01Visit(board: X01Board): {
  board: X01Board
  reverseClose: {
    side: X01Side
    points: number
    legIndex: number
    playerIdx: number
  } | null
  reverseBoard: {side: X01Side; points: number; playerIdx?: number} | null
  reverseVisit: NonNullable<X01Undo['visit']> | null
} | null {
  if (!board.undoStack.length) return null
  const top = board.undoStack[board.undoStack.length - 1]
  const rest = board.undoStack.slice(0, -1)
  return {
    reverseClose: top.close,
    reverseBoard: top.boardDelta,
    reverseVisit: top.visit ?? null,
    board: {
      start: board.start,
      home: top.home,
      away: top.away,
      active: top.active,
      legIndex: top.legIndex,
      done: top.done,
      homeThrower: top.homeThrower,
      awayThrower: top.awayThrower,
      undoStack: rest,
      ...(top.cricket !== undefined
        ? {cricket: top.cricket}
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
  const undoEntry: X01Undo = {
    home: board.home,
    away: board.away,
    active: board.active,
    legIndex: board.legIndex,
    done: board.done,
    homeThrower: board.homeThrower,
    awayThrower: board.awayThrower,
    close: null,
    boardDelta: {side, points: hit},
    ...(board.cricket !== undefined ? {cricket: board.cricket} : {}),
  }
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
      homeThrower:
        side === 'home' ? board.homeThrower + 1 : board.homeThrower,
      awayThrower:
        side === 'away' ? board.awayThrower + 1 : board.awayThrower,
      cricket: board.cricket
        ? {...board.cricket, dartsThrown: 0, home: {...board.cricket.home}, away: {...board.cricket.away}}
        : board.cricket,
      undoStack: [...board.undoStack, undoEntry],
    },
  }
}

/** Board saved earlier in this session, without waiting on storage. */
export function peekX01Board(key: string): X01Board | null {
  return memory.get(key) ?? null
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
