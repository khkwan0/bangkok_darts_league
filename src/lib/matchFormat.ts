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

export type FrameSeriesMode = 'best_of' | 'race_to'

export type FormatSubsection = {
  frames: number
  type: string
  /** Display name from format JSON (preferred over type on scoresheet). */
  label?: string
  mfpp: number
  noPlayers?: number
  games?: number
  seriesMode?: FrameSeriesMode
  minPlayers?: number
  maxPlayers?: number
  trackStats?: boolean
}

export type FrameTypeMeta = {
  short_name?: string
  no_players?: number | string
  max_players?: number | string
  default_games?: number | string
  default_series_mode?: string
  track_stats?: boolean | string | number
}

/** Map frame_types.short_name → no_players (min) for scoresheet slot counts. */
export function buildNoPlayersByType(
  frameTypes: FrameTypeMeta[] | null | undefined,
): Record<string, number> {
  const map: Record<string, number> = {}
  if (!Array.isArray(frameTypes)) return map
  for (const ft of frameTypes) {
    const key = String(ft?.short_name ?? '').trim()
    const n = Number(ft?.no_players)
    if (key && Number.isFinite(n) && n > 0) {
      map[key] = Math.trunc(n)
    }
  }
  return map
}

export function buildFrameTypeMetaByType(
  frameTypes: FrameTypeMeta[] | null | undefined,
): Record<
  string,
  {
    minPlayers: number
    maxPlayers: number
    games: number
    seriesMode?: FrameSeriesMode
    trackStats: boolean
  }
> {
  const map: Record<
    string,
    {
      minPlayers: number
      maxPlayers: number
      games: number
      seriesMode?: FrameSeriesMode
      trackStats: boolean
    }
  > = {}
  if (!Array.isArray(frameTypes)) return map
  for (const ft of frameTypes) {
    const key = String(ft?.short_name ?? '').trim()
    if (!key) continue
    const minPlayers = Math.max(1, Math.trunc(Number(ft?.no_players) || 1))
    const maxRaw = Number(ft?.max_players)
    const maxPlayers =
      Number.isFinite(maxRaw) && maxRaw >= minPlayers
        ? Math.trunc(maxRaw)
        : minPlayers
    const gamesRaw = Number(ft?.default_games)
    const games =
      Number.isFinite(gamesRaw) && gamesRaw >= 1 ? Math.trunc(gamesRaw) : 1
    const seriesMode =
      games > 1
        ? String(ft?.default_series_mode ?? '') === 'race_to'
          ? 'race_to'
          : 'best_of'
        : undefined
    map[key] = {
      minPlayers,
      maxPlayers,
      games,
      seriesMode,
      // Darts scoresheet: track tons/closes unless explicitly disabled.
      trackStats: ft?.track_stats !== false && ft?.track_stats !== 0,
    }
  }
  return map
}

export function resolveNoPlayers(
  type: string | undefined,
  noPlayersByType?: Record<string, number> | null,
  explicit?: number | null,
): number {
  if (explicit != null && Number.isFinite(Number(explicit)) && Number(explicit) > 0) {
    return Math.trunc(Number(explicit))
  }
  const key = String(type ?? '').trim()
  const fromMap = key && noPlayersByType ? noPlayersByType[key] : undefined
  if (fromMap != null && fromMap > 0) return fromMap
  return 1
}

/** Wins needed to take the row. Race-to uses M; best-of uses ceil(N/2). */
export function seriesWinsNeeded(
  seriesMode: FrameSeriesMode | string | undefined,
  games: number | undefined,
): number {
  const g = Math.max(1, Math.trunc(Number(games) || 1))
  if (String(seriesMode ?? '') === 'race_to') return g
  return Math.ceil(g / 2)
}

/** @deprecated use seriesWinsNeeded */
export function seriesNeed(games: number | undefined): number {
  return seriesWinsNeeded('best_of', games)
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
        const minRaw = section.minPlayers ?? section.min_players ?? section.no_players ?? section.noPlayers
        const maxRaw = section.maxPlayers ?? section.max_players
        const gamesRaw = section.games
        const minPlayers = Number(minRaw)
        const maxPlayers = Number(maxRaw)
        const games = Number(gamesRaw)
        const trackStats =
          section.trackStats != null
            ? Boolean(section.trackStats)
            : section.track_stats != null
              ? Boolean(section.track_stats)
              : undefined
        const seriesRaw = String(
          section.seriesMode ?? section.series_mode ?? '',
        ).trim()
        const truncatedGames =
          Number.isFinite(games) && games > 0 ? Math.trunc(games) : undefined
        const seriesMode: FrameSeriesMode | undefined =
          truncatedGames != null && truncatedGames > 1
            ? seriesRaw === 'race_to'
              ? 'race_to'
              : 'best_of'
            : undefined
        const type = String(section.type ?? '').trim()
        const labelRaw =
          section.label != null
            ? String(section.label).trim()
            : section.name != null
              ? String(section.name).trim()
              : ''
        return {
          frames: Number(section.frames) || 0,
          type,
          label: labelRaw || undefined,
          mfpp: Number(section.mfpp) || 1,
          noPlayers:
            Number.isFinite(minPlayers) && minPlayers > 0
              ? Math.trunc(minPlayers)
              : undefined,
          minPlayers:
            Number.isFinite(minPlayers) && minPlayers > 0
              ? Math.trunc(minPlayers)
              : undefined,
          maxPlayers:
            Number.isFinite(maxPlayers) && maxPlayers > 0
              ? Math.trunc(maxPlayers)
              : undefined,
          games: truncatedGames,
          seriesMode,
          trackStats,
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
  noPlayers?: number
  winner?: number
  homePlayerIds?: number[]
  awayPlayerIds?: number[]
}): boolean {
  if (!frame.winner || frame.winner <= 0) return false
  return frameHasCompleteRosters(frame)
}

function countAssignedPlayers(ids?: number[]): number {
  if (!Array.isArray(ids)) return 0
  return ids.filter(id => id != null && Number(id) > 0).length
}

/** True when each side has at least min players (and not over max when set). */
export function frameHasCompleteRosters(frame: {
  type?: string
  noPlayers?: number
  minPlayers?: number
  maxPlayers?: number
  homePlayerIds?: number[]
  awayPlayerIds?: number[]
}): boolean {
  const minNeeded = resolveNoPlayers(
    frame.type,
    null,
    frame.minPlayers ?? frame.noPlayers,
  )
  const maxAllowed =
    frame.maxPlayers != null &&
    Number.isFinite(Number(frame.maxPlayers)) &&
    Number(frame.maxPlayers) > 0
      ? Math.trunc(Number(frame.maxPlayers))
      : minNeeded
  const homeCount = countAssignedPlayers(frame.homePlayerIds)
  const awayCount = countAssignedPlayers(frame.awayPlayerIds)
  return (
    homeCount >= minNeeded &&
    awayCount >= minNeeded &&
    homeCount <= maxAllowed &&
    awayCount <= maxAllowed
  )
}

export type FinalizeBlockReason = {
  key: string
  params?: Record<string, string | number>
}

type FinalizeFrame = {
  frameNumber?: number
  type?: string
  noPlayers?: number
  winner?: number
  homePlayerIds?: number[]
  awayPlayerIds?: number[]
}

/**
 * Returns why a match cannot be finalized, or null when it can.
 * Message keys are i18n lookup strings with optional interpolation params.
 */
export function getFinalizeBlockReason(
  frames: FinalizeFrame[],
  formatRaw: unknown,
  homeTeamId: number,
  awayTeamId: number,
  firstBreak?: number | null,
): FinalizeBlockReason | null {
  const format = parseMatchFormat(formatRaw)
  const mode = format?.mode ?? 'full_play'
  const playable = frames.filter(
    frame =>
      Number(frame.frameNumber) > 0 &&
      frame.type !== 'section' &&
      Number(frame.frameNumber) !== -1,
  )

  if (playable.length === 0) {
    return {key: 'finalize_no_frames'}
  }

  const breakTeamId = Number(firstBreak ?? 0)
  if (
    !breakTeamId ||
    (breakTeamId !== homeTeamId && breakTeamId !== awayTeamId)
  ) {
    return {key: 'finalize_missing_first_break'}
  }

  const missingWinner: number[] = []
  const missingPlayers: number[] = []
  let homeWins = 0
  let awayWins = 0
  let decidedCount = 0
  let decidedValid = 0

  for (const frame of playable) {
    const frameNumber = Number(frame.frameNumber)
    const winner = Number(frame.winner ?? 0)
    const rostersOk = frameHasCompleteRosters(frame)

    if (winner <= 0) {
      missingWinner.push(frameNumber)
      continue
    }

    decidedCount++
    if (!rostersOk) {
      missingPlayers.push(frameNumber)
      continue
    }

    decidedValid++
    if (winner === homeTeamId) homeWins++
    else if (winner === awayTeamId) awayWins++
  }

  if (mode === 'race_to' || mode === 'best_of') {
    if (decidedCount === 0) {
      return {key: 'finalize_no_frames_decided'}
    }
    if (missingPlayers.length > 0) {
      return {
        key: 'finalize_missing_players',
        params: {
          frames: missingPlayers.join(', '),
          count: resolveNoPlayers(
            playable.find(f => Number(f.frameNumber) === missingPlayers[0])
              ?.type,
            null,
            playable.find(f => Number(f.frameNumber) === missingPlayers[0])
              ?.noPlayers,
          ),
        },
      }
    }
    if (homeWins === awayWins) {
      return {
        key: 'finalize_score_tied',
        params: {home: homeWins, away: awayWins},
      }
    }
    if (!isMatchCompleteByMode(format, homeWins, awayWins)) {
      if (mode === 'race_to') {
        return {
          key: 'finalize_race_incomplete',
          params: {
            home: homeWins,
            away: awayWins,
            target: format?.target ?? 0,
          },
        }
      }
      const bestOf = format?.target ?? format?.frames ?? 0
      return {
        key: 'finalize_best_of_incomplete',
        params: {
          home: homeWins,
          away: awayWins,
          need: Math.ceil(bestOf / 2),
          bestOf,
        },
      }
    }
    if (decidedValid !== decidedCount) {
      return {key: 'match_not_finalizable'}
    }
    return null
  }

  // full_play: every frame needs a winner and complete rosters
  if (missingWinner.length > 0) {
    return {
      key: 'finalize_missing_winner',
      params: {frames: missingWinner.join(', ')},
    }
  }
  if (missingPlayers.length > 0) {
    const sample = playable.find(
      f => Number(f.frameNumber) === missingPlayers[0],
    )
    return {
      key: 'finalize_missing_players',
      params: {
        frames: missingPlayers.join(', '),
        count: resolveNoPlayers(sample?.type, null, sample?.noPlayers),
      },
    }
  }
  return null
}

