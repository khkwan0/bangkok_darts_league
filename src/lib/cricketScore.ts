/** Standard cricket numbers. Bull is 25. There is no triple bull. */
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
  if (value === 25 && multiplier === 3) {
    return {nextMarks: ownMarks, points: 0, kind: 'invalid'}
  }
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
