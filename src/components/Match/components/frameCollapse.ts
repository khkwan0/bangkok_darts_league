import type {FrameType, PlayerLegStat} from '@/components/Match/types'
import {frameHasCompleteRosters, seriesWinsNeeded} from '@/lib/matchFormat'

export type FrameGate = 'section' | 'upcoming' | 'active' | 'complete'

function isPlayable(frame: FrameType | undefined | null): boolean {
  return frame != null && Number(frame.frameNumber) !== -1
}

/** Both sides have a full roster — same helper finalize / tips use. */
export function isFrameRosterReady(
  frame: FrameType | undefined | null,
): boolean {
  if (frame == null) return false
  return frameHasCompleteRosters(frame)
}

/** Race-to / BoN row is decided once either side reaches the wins needed. */
export function isSeriesScoreDecided(
  frame: FrameType | undefined | null,
): boolean {
  if (frame == null) return false
  const games = Math.max(1, Math.trunc(Number(frame.games ?? 1)))
  const seriesModeRaw = String(frame.seriesMode ?? '')
  const seriesMode =
    seriesModeRaw === 'race_to' || seriesModeRaw === 'best_of'
      ? seriesModeRaw
      : games > 1
        ? 'best_of'
        : undefined
  if (!seriesMode && games <= 1) return false
  const need = seriesWinsNeeded(seriesMode ?? 'best_of', games)
  const home = Number(frame.homeScore ?? 0)
  const away = Number(frame.awayScore ?? 0)
  return home >= need || away >= need
}

export function isFrameComplete(frame: FrameType | undefined | null): boolean {
  if (Number(frame?.winner ?? 0) > 0) return true
  // First-to-N via closes: only treat as complete (and auto-collapse) with a
  // full roster — same gate the server uses before setting winner.
  return isSeriesScoreDecided(frame) && isFrameRosterReady(frame)
}

/** First unfinished playable frame — auto-expanded on the scoresheet. */
export function findActiveFrameIndex(
  frames: FrameType[] | undefined | null,
): number {
  const list = frames ?? []
  for (let i = 0; i < list.length; i++) {
    if (!isPlayable(list[i])) continue
    if (isFrameComplete(list[i])) continue
    return i
  }
  return -1
}

export function resolveFrameGate(
  frames: FrameType[] | undefined | null,
  index: number,
): FrameGate {
  const frame = frames?.[index]
  if (!isPlayable(frame)) return 'section'
  if (isFrameComplete(frame)) return 'complete'
  if (findActiveFrameIndex(frames) === index) return 'active'
  return 'upcoming'
}

function slotCloses(stats: PlayerLegStat[] | undefined): number[] {
  return (stats ?? []).flatMap(s => {
    const c = Number(s?.closes ?? 0)
    return c > 0 ? [c] : []
  })
}

/** Non-zero checkout values for a side (per-leg when present). */
export function closeValuesForSide(
  frame: FrameType,
  side: 'home' | 'away',
): number[] {
  const legs = Array.isArray(frame.legs) ? frame.legs : []
  if (legs.length > 0) {
    const fromLegs = legs.flatMap(leg =>
      slotCloses(side === 'home' ? leg.homePlayerStats : leg.awayPlayerStats),
    )
    if (fromLegs.length > 0) return fromLegs
  }
  const total =
    side === 'home'
      ? Number(frame.homeCloses ?? 0)
      : Number(frame.awayCloses ?? 0)
  return total > 0 ? [total] : []
}

export function playerNicknames(
  teams: Record<string, Record<string, {nickname?: string}>> | undefined,
  teamId: number | undefined,
  playerIds: number[] | undefined,
): string[] {
  if (!teamId || !Array.isArray(playerIds)) return []
  const roster = teams?.[String(teamId)] ?? teams?.[teamId as unknown as string]
  return playerIds
    .filter(id => id != null && Number(id) > 0)
    .map(id => roster?.[String(id)]?.nickname ?? roster?.[id]?.nickname ?? '')
    .filter(Boolean)
}
