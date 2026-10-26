import type {FrameType, PlayerLegStat} from '@/components/Match/types'

export type FrameGate = 'section' | 'locked' | 'active' | 'complete'

function isPlayable(frame: FrameType | undefined | null): boolean {
  return frame != null && Number(frame.frameNumber) !== -1
}

export function isFrameComplete(frame: FrameType | undefined | null): boolean {
  return Number(frame?.winner ?? 0) > 0
}

/** First unfinished playable frame whose prior playable frames are all complete. */
export function findActiveFrameIndex(
  frames: FrameType[] | undefined | null,
): number {
  const list = frames ?? []
  for (let i = 0; i < list.length; i++) {
    if (!isPlayable(list[i])) continue
    if (isFrameComplete(list[i])) continue
    let blocked = false
    for (let j = 0; j < i; j++) {
      if (!isPlayable(list[j])) continue
      if (!isFrameComplete(list[j])) {
        blocked = true
        break
      }
    }
    if (!blocked) return i
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
  const active = findActiveFrameIndex(frames)
  if (active === index) return 'active'
  return 'locked'
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
