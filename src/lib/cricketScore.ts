/** Standard cricket numbers. Bull is 25. A triple bull counts as a double bull. */
export const CRICKET_TARGETS = [
  {id: '20', value: 20, label: '20'},
  {id: '19', value: 19, label: '19'},
  {id: '18', value: 18, label: '18'},
  {id: '17', value: 17, label: '17'},
  {id: '16', value: 16, label: '16'},
  {id: '15', value: 15, label: '15'},
  {id: '25', value: 25, label: 'Bull'},
] as const

export type CricketTargetId = (typeof CRICKET_TARGETS)[number]['id']
export type CricketMultiplier = 1 | 2 | 3
export type CricketMarks = Record<CricketTargetId, number>

export const CRICKET_MARKS_TO_CLOSE = 3
export const CRICKET_DARTS_PER_TURN = 3

export type CricketBoard = {
  home: CricketMarks
  away: CricketMarks
  /** Darts already thrown in the current turn (0–2). The third dart switches sides. */
  dartsThrown: number
  multiplier: CricketMultiplier
}

export type CricketHitKind = 'points' | 'closed' | 'marks' | 'none' | 'invalid'

const TARGET_IDS = CRICKET_TARGETS.map(target => target.id)

export function emptyCricketMarks(): CricketMarks {
  return {20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0}
}

export function emptyCricketBoard(): CricketBoard {
  return {
    home: emptyCricketMarks(),
    away: emptyCricketMarks(),
    dartsThrown: 0,
    multiplier: 1,
  }
}

export function cloneCricketBoard(board: CricketBoard): CricketBoard {
  return {
    home: {...board.home},
    away: {...board.away},
    dartsThrown: board.dartsThrown,
    multiplier: board.multiplier,
  }
}

export function cricketTarget(id: CricketTargetId) {
  return CRICKET_TARGETS.find(target => target.id === id) ?? CRICKET_TARGETS[0]
}

/**
 * One dart at a cricket number.
 * Marks beyond the third score only when this side has closed it and the
 * other side has not.
 */
export function scoreCricketHit(
  ownMarks: number,
  opponentMarks: number,
  multiplier: CricketMultiplier,
  value: number,
): {nextMarks: number; points: number; kind: CricketHitKind} {
  const hits = value === 25 ? Math.min(2, multiplier) : multiplier
  const before = Math.min(
    CRICKET_MARKS_TO_CLOSE,
    Math.max(0, Math.trunc(ownMarks)),
  )
  const opponentClosed = opponentMarks >= CRICKET_MARKS_TO_CLOSE
  const needed = Math.max(0, CRICKET_MARKS_TO_CLOSE - before)
  const scoringHits = Math.max(0, hits - needed)
  const points = opponentClosed ? 0 : scoringHits * value
  const nextMarks = Math.min(CRICKET_MARKS_TO_CLOSE, before + hits)
  let kind: CricketHitKind = 'none'
  if (points > 0) kind = 'points'
  else if (before < CRICKET_MARKS_TO_CLOSE && nextMarks >= CRICKET_MARKS_TO_CLOSE)
    kind = 'closed'
  else if (nextMarks > before) kind = 'marks'
  return {nextMarks, points, kind}
}

/** True once this side has closed 15–20 and bull. */
export function cricketAllClosed(marks: CricketMarks): boolean {
  return TARGET_IDS.every(id => marks[id] >= CRICKET_MARKS_TO_CLOSE)
}

/**
 * Cricket win: every number closed and level with or ahead of the other side.
 * Only the side that just threw can win on that dart.
 */
export function cricketWinner(
  board: CricketBoard,
  totals: {home: number; away: number},
  thrower: 'home' | 'away',
): 'home' | 'away' | null {
  const other = thrower === 'home' ? 'away' : 'home'
  if (!cricketAllClosed(board[thrower])) return null
  return totals[thrower] >= totals[other] ? thrower : null
}

export type ScoreThrowRecord = {
  active?: string
  label?: string | null
  sector?: number | null
  multiplier?: number | null
  boardDelta?: {side?: string; points?: number} | null
}

function dartFromLabel(
  text: string,
): {sector: number; multiplier: CricketMultiplier} | null {
  if (!text) return null
  if (text === '0') return {sector: 0, multiplier: 1}
  const marked = text.match(/^([SDT])(\d+)$/i)
  if (marked) {
    const sector = Number(marked[2])
    const multiplier: CricketMultiplier =
      marked[1].toUpperCase() === 'T' ? 3 : marked[1].toUpperCase() === 'D' ? 2 : 1
    if (sector === 25) return {sector: 25, multiplier: multiplier === 3 ? 2 : multiplier}
    if (sector >= 15 && sector <= 20) return {sector, multiplier}
  }
  const plain = text.match(/^(\d+)$/)
  if (plain) {
    const sector = Number(plain[1])
    if (sector === 25 || (sector >= 15 && sector <= 20)) return {sector, multiplier: 1}
  }
  if (/^d/i.test(text)) return {sector: 25, multiplier: 2}
  return {sector: 25, multiplier: 1}
}

function dartFromRecord(
  entry: ScoreThrowRecord,
): {sector: number; multiplier: CricketMultiplier} | null {
  if (entry.sector != null && Number.isFinite(Number(entry.sector))) {
    const sector = Math.trunc(Number(entry.sector))
    const raw = Math.trunc(Number(entry.multiplier) || 1)
    const multiplier: CricketMultiplier = raw === 2 || raw === 3 ? raw : 1
    return {sector, multiplier: sector === 25 && multiplier === 3 ? 2 : multiplier}
  }
  return dartFromLabel(String(entry.label ?? '').trim())
}

export type CricketSides = {home: CricketMarks; away: CricketMarks}

/** Marks and points after one recorded score-game dart. */
export function applyScoreThrow(
  marks: CricketSides,
  entry: ScoreThrowRecord,
): {marks: CricketSides; side: 'home' | 'away'; points: number} {
  const side = entry.active === 'away' ? 'away' : 'home'
  const dart = dartFromRecord(entry)
  if (!dart || dart.sector === 0) return {marks, side, points: 0}
  const id = String(dart.sector) as CricketTargetId
  if (!TARGET_IDS.includes(id)) return {marks, side, points: 0}
  const other = side === 'home' ? 'away' : 'home'
  const hit = scoreCricketHit(marks[side][id], marks[other][id], dart.multiplier, dart.sector)
  return {
    marks: {...marks, [side]: {...marks[side], [id]: hit.nextMarks}},
    side,
    points: hit.points,
  }
}

/** Team totals for a score game, replayed from the throws in order. */
export function pointsFromScoreThrows(
  entries: ScoreThrowRecord[] | null | undefined,
): {home: number; away: number} {
  let marks: CricketSides = {home: emptyCricketMarks(), away: emptyCricketMarks()}
  let home = 0
  let away = 0
  let deltaHome = 0
  let deltaAway = 0
  for (const entry of entries ?? []) {
    const delta = Math.max(0, Math.trunc(Number(entry.boardDelta?.points) || 0))
    if (delta > 0) {
      if (entry.boardDelta?.side === 'away') deltaAway += delta
      else deltaHome += delta
    }
    const hit = applyScoreThrow(marks, entry)
    marks = hit.marks
    if (hit.side === 'home') home += hit.points
    else away += hit.points
  }
  return {home: Math.max(home, deltaHome), away: Math.max(away, deltaAway)}
}

function parseMarks(raw: unknown): CricketMarks | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const marks = emptyCricketMarks()
  for (const id of TARGET_IDS) {
    const n = Math.trunc(Number(row[id] ?? 0))
    if (!Number.isFinite(n) || n < 0) return null
    marks[id] = Math.min(CRICKET_MARKS_TO_CLOSE, n)
  }
  return marks
}

export function parseCricketBoard(raw: unknown): CricketBoard | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as CricketBoard
  const home = parseMarks(row.home)
  const away = parseMarks(row.away)
  if (!home || !away) return null
  const multiplier = Math.trunc(Number(row.multiplier))
  const dartsThrown = Math.trunc(Number(row.dartsThrown))
  if (multiplier !== 1 && multiplier !== 2 && multiplier !== 3) return null
  if (!Number.isFinite(dartsThrown) || dartsThrown < 0) return null
  return {
    home,
    away,
    multiplier,
    dartsThrown: Math.min(CRICKET_DARTS_PER_TURN - 1, dartsThrown),
  }
}
