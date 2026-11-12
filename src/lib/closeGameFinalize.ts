/**
 * Checkout check for finalize. Matches the server replay in
 * bkkleague_backend/web/src/lib/darts-throws.ts: a visit that lands on 0
 * closes the leg, and a visit past 0 is a bust.
 */

const START_SCORES = [1001, 901, 701, 501, 301, 101] as const
const THROW_SCORE_MAX = 180

type CloseVisit = {
  side?: string
  points?: number
}

export type CloseFrameLike = {
  frameNumber?: number
  type?: string
  label?: string
  frameType?: string
  showClose?: boolean | number | string
  showScore?: boolean | number | string
  games?: number
  seriesMode?: string
  homeScore?: number
  awayScore?: number
  winner?: number
  visits?: CloseVisit[]
}

function parseStart(gameType: string): number | null {
  for (const score of START_SCORES) {
    if (gameType.includes(String(score))) return score
  }
  return null
}

function flagOn(value: boolean | number | string | undefined): boolean | null {
  if (value == null) return null
  if (value === true || value === 1 || value === '1' || value === 'true') return true
  if (value === false || value === 0 || value === '0' || value === 'false') return false
  return null
}

function isCloseFrame(frame: CloseFrameLike): boolean {
  if (frame.type === 'section' || Number(frame.frameNumber) === -1) return false
  const showClose = flagOn(frame.showClose)
  if (showClose === true) return true
  if (showClose === false) return false
  if (flagOn(frame.showScore) === true) return false
  const name = [frame.label, frame.frameType, frame.type].filter(Boolean).join(' ')
  return parseStart(name) != null
}

function frameWasStarted(frame: CloseFrameLike): boolean {
  if (Number(frame.winner) > 0) return true
  if (Number(frame.homeScore) > 0 || Number(frame.awayScore) > 0) return true
  return Array.isArray(frame.visits) && frame.visits.length > 0
}

function replay(frame: CloseFrameLike): {
  closesHome: number
  closesAway: number
  open: boolean
} | null {
  const name = [frame.label, frame.frameType, frame.type].filter(Boolean).join(' ')
  const start = parseStart(name)
  if (start == null) return null
  let home = start
  let away = start
  let open = false
  let closesHome = 0
  let closesAway = 0
  for (const visit of frame.visits ?? []) {
    const side = visit?.side === 'home' || visit?.side === 'away' ? visit.side : null
    if (!side) continue
    const score = Math.trunc(Number(visit.points) || 0)
    if (score <= 0 || score > THROW_SCORE_MAX) continue
    const remaining = side === 'home' ? home : away
    const next = remaining - score
    open = true
    if (next < 0) continue
    if (next === 0) {
      if (side === 'home') closesHome += 1
      else closesAway += 1
      home = start
      away = start
      open = false
      continue
    }
    if (side === 'home') home = next
    else away = next
  }
  return {closesHome, closesAway, open}
}

function closeFrameIssue(frame: CloseFrameLike): 'not_closed' | 'legs_incomplete' | null {
  if (!isCloseFrame(frame)) return null
  const played = replay(frame)
  if (!played) return 'not_closed'
  if (played.open) return 'not_closed'
  const sheetHome = Math.max(0, Math.trunc(Number(frame.homeScore) || 0))
  const sheetAway = Math.max(0, Math.trunc(Number(frame.awayScore) || 0))
  if (sheetHome !== played.closesHome || sheetAway !== played.closesAway) return 'not_closed'
  const games = Math.max(1, Math.trunc(Number(frame.games) || 1))
  const need = String(frame.seriesMode ?? '') === 'race_to' ? games : Math.ceil(games / 2)
  const homeWon = played.closesHome >= need && played.closesHome > played.closesAway
  const awayWon = played.closesAway >= need && played.closesAway > played.closesHome
  if (homeWon || awayWon) return null
  if (played.closesHome + played.closesAway === 0) return 'not_closed'
  return 'legs_incomplete'
}

function matchPlayMode(formatRaw: unknown): string {
  try {
    let parsed: unknown = formatRaw
    if (typeof parsed === 'string') {
      const trimmed = parsed.trim()
      if (!trimmed) return 'full_play'
      parsed = JSON.parse(trimmed)
    }
    const obj = Array.isArray(parsed) ? parsed[0] : parsed
    const mode = String((obj as {mode?: unknown} | null)?.mode ?? 'full_play')
    return mode === 'race_to' || mode === 'best_of' ? mode : 'full_play'
  } catch {
    return 'full_play'
  }
}

export function closeGamesBlockReason(
  frames: CloseFrameLike[],
  formatRaw: unknown,
): {key: 'finalize_close_not_closed' | 'finalize_close_legs_incomplete'; games: string} | null {
  const mustFinishAll = matchPlayMode(formatRaw) === 'full_play'
  const notClosed: number[] = []
  const incomplete: number[] = []
  for (const frame of frames) {
    const frameNumber = Number(frame?.frameNumber)
    if (!Number.isFinite(frameNumber) || frameNumber <= 0) continue
    if (!isCloseFrame(frame)) continue
    if (!mustFinishAll && !frameWasStarted(frame)) continue
    const issue = closeFrameIssue(frame)
    if (issue === 'not_closed') notClosed.push(frameNumber)
    else if (issue === 'legs_incomplete') incomplete.push(frameNumber)
  }
  if (notClosed.length > 0) {
    return {key: 'finalize_close_not_closed', games: notClosed.join(', ')}
  }
  if (incomplete.length > 0) {
    return {key: 'finalize_close_legs_incomplete', games: incomplete.join(', ')}
  }
  return null
}
