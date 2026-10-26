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

/** Points awarded per completed leg/row. Always ≥ 1. */
export function resolveValuePerLeg(
  source: {valuePerLeg?: unknown; value_per_leg?: unknown} | null | undefined,
): number {
  if (!source || typeof source !== 'object') return 1
  const raw = source.valuePerLeg ?? source.value_per_leg
  const n = Math.trunc(Number(raw))
  return Number.isFinite(n) && n >= 1 ? n : 1
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
  /** Match-score weight of each completed row in this section. Default 1. */
  valuePerLeg?: number
  trackTons?: boolean
  trackHeavyTons?: boolean
  trackCloses?: boolean
  trackBoardScore?: boolean
  /** Legacy: any of tons / heavy / closes. */
  trackStats?: boolean
  /** From game type: show per-leg tallies (tons / 180s / checkout). */
  showClose?: boolean
  /** From game type: show numeric-keypad board score. */
  showScore?: boolean
  /** From game type: show Win button. */
  showWin?: boolean
}

export type ScoreSheetStatFlags = {
  trackTons: boolean
  trackHeavyTons: boolean
  trackCloses: boolean
  trackBoardScore: boolean
}

export function anyPlayerStatFlags(flags: ScoreSheetStatFlags): boolean {
  return flags.trackTons || flags.trackHeavyTons || flags.trackCloses
}

/** Resolve granular scoresheet toggles (legacy trackStats expands to tons/180s/closes). */
export function resolveScoreSheetStatFlags(
  raw:
    | Partial<FormatSubsection>
    | Partial<ScoreSheetStatFlags>
    | {
        trackStats?: boolean
        track_stats?: boolean | string | number
        trackTons?: boolean
        track_tons?: boolean | string | number
        trackHeavyTons?: boolean
        track_heavy_tons?: boolean | string | number
        trackCloses?: boolean
        track_closes?: boolean | string | number
        trackBoardScore?: boolean
        track_board_score?: boolean | string | number
      }
    | null
    | undefined,
): ScoreSheetStatFlags {
  const o = (raw ?? {}) as Record<string, unknown>
  const legacy =
    o.trackStats != null
      ? Boolean(o.trackStats)
      : o.track_stats != null
        ? Boolean(o.track_stats)
        : undefined
  const read = (camel: string, snake: string): boolean | undefined => {
    if (o[camel] != null) return Boolean(o[camel])
    if (o[snake] != null) return Boolean(o[snake])
    return undefined
  }
  const trackTons = read('trackTons', 'track_tons')
  const trackHeavyTons = read('trackHeavyTons', 'track_heavy_tons')
  const trackCloses = read('trackCloses', 'track_closes')
  const trackBoardScore = read('trackBoardScore', 'track_board_score')
  const hasGranular =
    trackTons != null ||
    trackHeavyTons != null ||
    trackCloses != null ||
    trackBoardScore != null
  if (hasGranular) {
    return {
      trackTons: trackTons ?? false,
      trackHeavyTons: trackHeavyTons ?? false,
      trackCloses: trackCloses ?? false,
      trackBoardScore: trackBoardScore ?? false,
    }
  }
  if (legacy != null) {
    return {
      trackTons: legacy,
      trackHeavyTons: legacy,
      trackCloses: legacy,
      trackBoardScore: false,
    }
  }
  return {
    trackTons: false,
    trackHeavyTons: false,
    trackCloses: false,
    trackBoardScore: false,
  }
}

export type FrameTypeMeta = {
  short_name?: string
  no_players?: number | string
  max_players?: number | string
  default_games?: number | string
  default_series_mode?: string
  track_stats?: boolean | string | number
  track_tons?: boolean | string | number
  track_heavy_tons?: boolean | string | number
  track_closes?: boolean | string | number
  track_board_score?: boolean | string | number
  show_close?: boolean | string | number
  show_score?: boolean | string | number
  show_win?: boolean | string | number
}

export type GameTypeScoresheetFlags = {
  showClose: boolean
  showScore: boolean
  showWin: boolean
}

/** Map game_types.code → Close / Score / Win scoresheet flags. */
export function buildGameTypeFlagsByCode(
  gameTypes: Array<{
    code?: string
    show_close?: boolean | string | number
    show_score?: boolean | string | number
    show_win?: boolean | string | number
  }> | null | undefined,
): Record<string, GameTypeScoresheetFlags> {
  const map: Record<string, GameTypeScoresheetFlags> = {}
  if (!Array.isArray(gameTypes)) return map
  for (const gt of gameTypes) {
    const key = String(gt?.code ?? '').trim()
    if (!key) continue
    map[key] = {
      showClose: Boolean(gt.show_close),
      showScore: Boolean(gt.show_score),
      showWin: Boolean(gt.show_win),
    }
  }
  return map
}

function readOptionalBool(
  obj: Record<string, unknown>,
  camel: string,
  snake: string,
): boolean | undefined {
  if (obj[camel] != null) return Boolean(obj[camel])
  if (obj[snake] != null) return Boolean(obj[snake])
  return undefined
}

/** Resolve Close/Score/Win: section → game type by code → frame-type parent flags. */
export function resolveScoresheetControlFlags(
  section: Partial<FormatSubsection> | Record<string, unknown> | null | undefined,
  typeMeta?: Partial<GameTypeScoresheetFlags> & {
    show_close?: boolean | string | number
    show_score?: boolean | string | number
    show_win?: boolean | string | number
  },
  gameTypeFlags?: GameTypeScoresheetFlags | null,
): GameTypeScoresheetFlags {
  const o = (section ?? {}) as Record<string, unknown>
  const fromSectionClose = readOptionalBool(o, 'showClose', 'show_close')
  const fromSectionScore = readOptionalBool(o, 'showScore', 'show_score')
  const fromSectionWin = readOptionalBool(o, 'showWin', 'show_win')
  return {
    showClose:
      fromSectionClose ??
      gameTypeFlags?.showClose ??
      Boolean(typeMeta?.showClose ?? typeMeta?.show_close),
    showScore:
      fromSectionScore ??
      gameTypeFlags?.showScore ??
      Boolean(typeMeta?.showScore ?? typeMeta?.show_score),
    showWin:
      fromSectionWin ??
      gameTypeFlags?.showWin ??
      Boolean(typeMeta?.showWin ?? typeMeta?.show_win),
  }
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
    trackTons: boolean
    trackHeavyTons: boolean
    trackCloses: boolean
    trackBoardScore: boolean
    showClose: boolean
    showScore: boolean
    showWin: boolean
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
      trackTons: boolean
      trackHeavyTons: boolean
      trackCloses: boolean
      trackBoardScore: boolean
      showClose: boolean
      showScore: boolean
      showWin: boolean
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
    const flags = resolveScoreSheetStatFlags(ft)
    map[key] = {
      minPlayers,
      maxPlayers,
      games,
      seriesMode,
      trackTons: flags.trackTons,
      trackHeavyTons: flags.trackHeavyTons,
      trackCloses: flags.trackCloses,
      trackBoardScore: flags.trackBoardScore,
      trackStats: anyPlayerStatFlags(flags),
      showClose: Boolean(ft.show_close),
      showScore: Boolean(ft.show_score),
      showWin: Boolean(ft.show_win),
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
    const root = obj as Record<string, unknown>
    // Legacy: briefly stored valuePerLeg on the format root.
    const legacyRootValue = resolveValuePerLeg(root)
    const subsections = root.subsections
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
        const hasStatKey =
          section.trackTons != null ||
          section.track_tons != null ||
          section.trackHeavyTons != null ||
          section.track_heavy_tons != null ||
          section.trackCloses != null ||
          section.track_closes != null ||
          section.trackBoardScore != null ||
          section.track_board_score != null ||
          section.trackStats != null ||
          section.track_stats != null
        const flags = hasStatKey
          ? resolveScoreSheetStatFlags(section)
          : undefined
        const showClose = readOptionalBool(section, 'showClose', 'show_close')
        const showScore = readOptionalBool(section, 'showScore', 'show_score')
        const showWin = readOptionalBool(section, 'showWin', 'show_win')
        return {
          frames: Number(section.frames) || 0,
          type,
          label: labelRaw || undefined,
          mfpp: Number(section.mfpp) || 1,
          valuePerLeg: resolveValuePerLeg(
            section.valuePerLeg != null || section.value_per_leg != null
              ? section
              : {valuePerLeg: legacyRootValue},
          ),
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
          ...(flags
            ? {
                trackTons: flags.trackTons,
                trackHeavyTons: flags.trackHeavyTons,
                trackCloses: flags.trackCloses,
                trackBoardScore: flags.trackBoardScore,
                trackStats: anyPlayerStatFlags(flags),
              }
            : {}),
          ...(showClose != null ? {showClose} : {}),
          ...(showScore != null ? {showScore} : {}),
          ...(showWin != null ? {showWin} : {}),
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
  /** Team id that throws first dart in this game. */
  firstDart?: number
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
  _firstBreak?: number | null,
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

  const missingFirstDart: number[] = []
  for (const frame of playable) {
    const dartTeamId = Number(frame.firstDart ?? 0)
    if (
      !dartTeamId ||
      (dartTeamId !== homeTeamId && dartTeamId !== awayTeamId)
    ) {
      missingFirstDart.push(Number(frame.frameNumber))
    }
  }
  if (missingFirstDart.length > 0) {
    return {
      key: 'finalize_missing_first_dart',
      params: {games: missingFirstDart[0], games: missingFirstDart.join(', ')},
    }
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

