/**
 * Minimal match-format helpers for mobile scoresheet finalize rules.
 * Mirrors bkkleague_backend/web/src/lib/match-format-json.ts race/best-of logic.
 */

export type MatchPlayMode = 'full_play' | 'race_to' | 'best_of'

export type DivisionFormatLite = {
  mode?: MatchPlayMode
  target?: number
  frames?: number
}

export function parseMatchFormat(raw: unknown): DivisionFormatLite | null {
  try {
    let parsed: unknown = raw
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (!trimmed || trimmed === '[]' || trimmed === 'null') return null
      parsed = JSON.parse(trimmed)
    }
    const obj = Array.isArray(parsed) ? parsed[0] : parsed
    if (!obj || typeof obj !== 'object') return null
    const record = obj as Record<string, unknown>
    const modeRaw = String(record.mode ?? 'full_play').trim()
    const mode: MatchPlayMode =
      modeRaw === 'race_to' || modeRaw === 'best_of' || modeRaw === 'full_play'
        ? modeRaw
        : 'full_play'
    const target =
      record.target != null ? Number(record.target) : undefined
    const frames =
      record.frames != null ? Number(record.frames) : undefined
    return {
      mode,
      target: Number.isFinite(target) && (target as number) > 0 ? target : undefined,
      frames: Number.isFinite(frames) ? frames : undefined,
    }
  } catch {
    return null
  }
}

export type FormatSubsection = {
  frames: number
  type: string
  mfpp: number
}

/**
 * Normalize match format from API (string JSON, array, or already-parsed object)
 * into the subsection list used to build the scoresheet.
 */
export function resolveFormatSubsections(raw: unknown): FormatSubsection[] {
  try {
    let parsed: unknown = raw
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (!trimmed || trimmed === '[]' || trimmed === 'null') return []
      parsed = JSON.parse(trimmed)
    }
    const obj = Array.isArray(parsed) ? parsed[0] : parsed
    if (!obj || typeof obj !== 'object') return []
    const subsections = (obj as {subsections?: unknown}).subsections
    if (!Array.isArray(subsections)) return []
    return subsections
      .filter(item => item && typeof item === 'object')
      .map(item => {
        const section = item as Record<string, unknown>
        return {
          frames: Number(section.frames) || 0,
          type: String(section.type ?? ''),
          mfpp: Number(section.mfpp) || 1,
        }
      })
      .filter(section => section.frames > 0)
  } catch {
    return []
  }
}

/** True if race/best-of should end given current frame wins. */
export function isMatchCompleteByMode(
  format: DivisionFormatLite | null | undefined,
  homeWins: number,
  awayWins: number,
): boolean {
  if (!format) return false
  const mode = format.mode ?? 'full_play'
  if (mode === 'race_to') {
    const target = format.target ?? 0
    return target > 0 && (homeWins >= target || awayWins >= target)
  }
  if (mode === 'best_of') {
    const bestOf = format.target ?? format.frames ?? 0
    const need = Math.ceil(bestOf / 2)
    return need > 0 && (homeWins >= need || awayWins >= need)
  }
  return false
}

export function frameHasRequiredPlayers(frame: {
  type?: string
  winner?: number
  homePlayerIds?: number[]
  awayPlayerIds?: number[]
}): boolean {
  if (!frame.winner || frame.winner <= 0) return false
  const type = typeof frame.type === 'string' ? frame.type : ''
  const home = Array.isArray(frame.homePlayerIds) ? frame.homePlayerIds : []
  const away = Array.isArray(frame.awayPlayerIds) ? frame.awayPlayerIds : []
  if (type.endsWith('s')) {
    return home.length === 1 && away.length === 1
  }
  if (type.endsWith('d')) {
    return home.length === 2 && away.length === 2
  }
  // Unknown frame type: require a winner and at least one player per side
  return home.length >= 1 && away.length >= 1
}
