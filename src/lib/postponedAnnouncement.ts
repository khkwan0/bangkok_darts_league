export type PostponedAnnouncementKind = 'league' | 'cup'

export type PostponedAnnouncementMatch = {
  id: number
  home_team_id?: number | null
  away_team_id?: number | null
  home_team_name: string
  away_team_name: string
  home_team_short_name?: string | null
  away_team_short_name?: string | null
  game_type?: string | null
  game_type_code?: string | null
  postponed_by?: number | null
  postponed_by_team_name?: string | null
  postponed_by_team_short_name?: string | null
  postponed_proposal?: unknown
}

type ProposalShape = {
  teamId?: number | string
  isHome?: boolean
  _initiator?: {
    teamId?: number | string
    isHome?: boolean
  }
  proposedData?: {
    teamId?: number | string
  }
}

function asProposal(raw: unknown): ProposalShape | null {
  if (!raw || typeof raw !== 'object') return null
  return raw as ProposalShape
}

function positiveId(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Prefer short name, then strip trailing 8B/9B/10B style suffixes. */
export function displayTeamName(
  name: string | null | undefined,
  shortName?: string | null,
): string {
  const raw = (shortName?.trim() || name?.trim() || '').trim()
  if (!raw) return 'TBD'
  return raw.replace(/\s+(8B|9B|10B)$/i, '').trim() || raw
}

export function gameTypeHeading(
  match: PostponedAnnouncementMatch,
): string {
  const code = String(match.game_type_code || match.game_type || '')
    .trim()
    .toLowerCase()
  if (code === '8b' || code === '8-ball' || code === '8 ball') return '8 Ball'
  if (code === '9b' || code === '9-ball' || code === '9 ball') return '9 Ball'
  if (code === '10b' || code === '10-ball' || code === '10 ball') return '10 Ball'
  if (code === 'mix') return 'Mixed (8 & 9 Ball)'

  const label = String(match.game_type || '').trim()
  if (!label) return 'Other'
  if (/^8[-\s]?ball$/i.test(label)) return '8 Ball'
  if (/^9[-\s]?ball$/i.test(label)) return '9 Ball'
  if (/^10[-\s]?ball$/i.test(label)) return '10 Ball'
  return label
}

function gameTypeSortKey(heading: string): number {
  if (heading === '8 Ball') return 1
  if (heading === '9 Ball') return 2
  if (heading === '10 Ball') return 3
  if (heading.startsWith('Mixed')) return 4
  return 50
}

export function initiatorTeamId(
  match: PostponedAnnouncementMatch,
): number | null {
  const proposal = asProposal(match.postponed_proposal)
  const fromProposal =
    positiveId(proposal?.teamId) ??
    positiveId(proposal?.proposedData?.teamId) ??
    positiveId(proposal?._initiator?.teamId)
  if (fromProposal) return fromProposal

  if (proposal?._initiator?.isHome === true || proposal?.isHome === true) {
    return positiveId(match.home_team_id)
  }
  if (proposal?._initiator?.isHome === false || proposal?.isHome === false) {
    return positiveId(match.away_team_id)
  }

  const byName =
    match.postponed_by_team_short_name?.trim() ||
    match.postponed_by_team_name?.trim() ||
    ''
  if (byName) {
    const home = displayTeamName(
      match.home_team_name,
      match.home_team_short_name,
    )
    const away = displayTeamName(
      match.away_team_name,
      match.away_team_short_name,
    )
    const by = displayTeamName(byName)
    if (
      byName === match.home_team_name ||
      byName === match.home_team_short_name ||
      by === home
    ) {
      return positiveId(match.home_team_id)
    }
    if (
      byName === match.away_team_name ||
      byName === match.away_team_short_name ||
      by === away
    ) {
      return positiveId(match.away_team_id)
    }
  }

  return null
}

function markIfInitiator(name: string, isInitiator: boolean): string {
  return isInitiator ? `*${name}*` : name
}

export function formatMatchLine(match: PostponedAnnouncementMatch): string {
  const home = displayTeamName(
    match.home_team_name,
    match.home_team_short_name,
  )
  const away = displayTeamName(
    match.away_team_name,
    match.away_team_short_name,
  )
  const initiatorId = initiatorTeamId(match)
  const homeId = positiveId(match.home_team_id)
  const awayId = positiveId(match.away_team_id)
  const homeMarked = markIfInitiator(
    home,
    initiatorId != null && homeId != null && initiatorId === homeId,
  )
  const awayMarked = markIfInitiator(
    away,
    initiatorId != null && awayId != null && initiatorId === awayId,
  )
  return `${homeMarked} vs ${awayMarked}`
}

function introFor(kind: PostponedAnnouncementKind): string {
  if (kind === 'cup') {
    return [
      '*Postponed Cup Matches*',
      '',
      'If you are highlighted in bold below then you have postponed a cup fixture. If you postpone another cup fixture while the below fixture is outstanding, the below fixture will be automatically forfeited. If you play the fixture below then your team will be removed from this list and you will have the 1 postponement allowance back.',
      '',
      'Please try to avoid a forfeit at all costs.',
    ].join('\n')
  }

  return [
    '*Postponed League Matches*',
    '',
    'If you are highlighted in bold below then you have postponed a league fixture. If you postpone another league fixture while the below fixture is outstanding, the below fixture will be automatically forfeited. If you play the fixture below then your team will be removed from this list and you will have the 1 postponement allowance back.',
    '',
    'Please try to avoid a forfeit at all costs.',
  ].join('\n')
}

export function buildPostponedAnnouncement(
  matches: PostponedAnnouncementMatch[],
  kind: PostponedAnnouncementKind,
): string {
  const groups = new Map<string, PostponedAnnouncementMatch[]>()
  for (const match of matches) {
    const heading = gameTypeHeading(match)
    const list = groups.get(heading) ?? []
    list.push(match)
    groups.set(heading, list)
  }

  const headings = [...groups.keys()].sort((a, b) => {
    const byKnown = gameTypeSortKey(a) - gameTypeSortKey(b)
    if (byKnown !== 0) return byKnown
    return a.localeCompare(b)
  })

  const sections: string[] = [introFor(kind)]

  if (headings.length === 0) {
    sections.push('', '_No postponed matches._')
    return sections.join('\n')
  }

  for (const heading of headings) {
    const lines = (groups.get(heading) ?? []).map(formatMatchLine)
    sections.push('', `*${heading}*`, ...lines)
  }

  return sections.join('\n')
}
