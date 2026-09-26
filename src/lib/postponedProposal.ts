import {
  formatBangkokDateHuge,
  formatBangkokDateTime,
} from '@/lib/bangkokTime'

export type PostponedProposalData = {
  isHome: boolean
  newDate: string | null
  teamId: number | null
  timestamp: string
  userId: number
}

type TeamNameMatchInfo = {
  date?: string
  original_date?: string
  home_team_id: number
  away_team_id: number
  home_team_short_name?: string
  away_team_short_name?: string
  postponed_proposal?: unknown
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function normalizeTeamId(teamId: unknown): number | null {
  if (typeof teamId === 'number' && Number.isFinite(teamId)) return teamId
  if (typeof teamId === 'string' && teamId.trim() !== '') {
    const n = Number(teamId)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function unwrapRecord(raw: unknown): Record<string, unknown> | null {
  let parsed = parseJsonValue(raw)
  parsed = parseJsonValue(parsed)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null
  }
  return parsed as Record<string, unknown>
}

function extractProposedData(
  record: Record<string, unknown>,
): Record<string, unknown> | null {
  let proposedData =
    record.proposedData ?? record.proposed_data ?? record.ProposedData

  proposedData = parseJsonValue(proposedData)

  if (
    proposedData != null &&
    typeof proposedData === 'object' &&
    !Array.isArray(proposedData)
  ) {
    return proposedData as Record<string, unknown>
  }

  if (
    'teamId' in record ||
    'isHome' in record ||
    'newDate' in record ||
    'new_date' in record
  ) {
    return record
  }

  return null
}

function parseIsHome(value: unknown): boolean | null {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true
  }
  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false
  }
  return null
}

function normalizeProposedData(
  proposedData: Record<string, unknown>,
): PostponedProposalData | null {
  const teamId = normalizeTeamId(proposedData.teamId ?? proposedData.team_id)
  const isHomeParsed = parseIsHome(
    proposedData.isHome ?? proposedData.is_home,
  )

  if (teamId == null && isHomeParsed === null) {
    return null
  }

  const rawNewDate = proposedData.newDate ?? proposedData.new_date
  let newDate: string | null = null
  if (rawNewDate === null || rawNewDate === 'null') {
    newDate = null
  } else if (typeof rawNewDate === 'string' && rawNewDate.trim() !== '') {
    newDate = rawNewDate
  }

  return {
    isHome: isHomeParsed ?? false,
    newDate,
    teamId,
    timestamp:
      typeof proposedData.timestamp === 'string' ? proposedData.timestamp : '',
    userId:
      typeof proposedData.userId === 'number'
        ? proposedData.userId
        : typeof proposedData.user_id === 'number'
          ? proposedData.user_id
          : 0,
  }
}

/** Parse postponed_proposal from API (object, nested proposedData, or JSON string). */
export function parsePostponedProposal(
  raw: unknown,
): PostponedProposalData | null {
  if (raw == null) return null

  const record = unwrapRecord(raw)
  if (!record) return null

  const proposedData = extractProposedData(record)
  if (!proposedData) return null

  return normalizeProposedData(proposedData)
}

export function isPostponedDateLabel(date?: string): boolean {
  if (!date) return false
  const normalized = date.trim().toLowerCase()
  return normalized === 'postponed' || normalized.includes('postponed')
}

export function getMatchDisplayDate(matchInfo: {
  date: string
  original_date?: string
}): string {
  if (isPostponedDateLabel(matchInfo.date) && matchInfo.original_date) {
    return matchInfo.original_date
  }
  return matchInfo.date
}

export function isIndefinitePostponement(
  proposal: PostponedProposalData | null,
): boolean {
  return proposal !== null && proposal.newDate === null
}

/** True when postponed_proposal has valid proposedData with newDate null. */
export function hasValidIndefiniteProposedDate(raw: unknown): boolean {
  return isIndefinitePostponement(parsePostponedProposal(raw))
}

/** Whether action UI should offer "Propose New Date" for an indefinite proposal. */
export function shouldShowIndefiniteProposeNewDate(
  raw: unknown,
  matchDate?: string,
): boolean {
  if (hasValidIndefiniteProposedDate(raw)) return true
  if (isPostponedDateLabel(matchDate)) return true
  return false
}

export function getProposingTeamShortName(
  matchInfo: TeamNameMatchInfo,
  proposal: PostponedProposalData,
): string {
  if (
    proposal.teamId != null &&
    proposal.teamId === matchInfo.home_team_id
  ) {
    return matchInfo.home_team_short_name ?? ''
  }
  if (
    proposal.teamId != null &&
    proposal.teamId === matchInfo.away_team_id
  ) {
    return matchInfo.away_team_short_name ?? ''
  }
  return proposal.isHome
    ? (matchInfo.home_team_short_name ?? '')
    : (matchInfo.away_team_short_name ?? '')
}

/** Indefinite postponement from proposal data and/or match date label. */
export function resolveIndefinitePostponement(
  matchInfo: TeamNameMatchInfo,
): {proposingTeamName: string} | null {
  const proposal = parsePostponedProposal(matchInfo.postponed_proposal)
  if (isIndefinitePostponement(proposal)) {
    return {
      proposingTeamName: getProposingTeamShortName(matchInfo, proposal!),
    }
  }

  if (
    isPostponedDateLabel(matchInfo.date) &&
    matchInfo.postponed_proposal != null
  ) {
    const looseProposal = parsePostponedProposal(matchInfo.postponed_proposal)
    if (looseProposal) {
      return {
        proposingTeamName: getProposingTeamShortName(matchInfo, looseProposal),
      }
    }
    return {proposingTeamName: ''}
  }

  return null
}

export function formatMatchDate(date: string): string {
  return formatBangkokDateHuge(date)
}

/** Format proposed reschedule date/time (Asia/Bangkok). */
export function formatProposedDate(isoDate: string): string {
  return formatBangkokDateTime(isoDate)
}

/** Human-readable value for a parsed postponed proposal (date or indefinite). */
export function formatPostponedProposalDisplay(
  proposal: PostponedProposalData,
  labels: {indefinite: string; noDate: string},
): string {
  if (isIndefinitePostponement(proposal)) return labels.indefinite
  if (proposal.newDate) return formatBangkokDateTime(proposal.newDate)
  return labels.noDate
}

export function formatProposalTimestamp(timestamp: string): string | null {
  if (!timestamp) return null
  return formatBangkokDateTime(timestamp)
}
