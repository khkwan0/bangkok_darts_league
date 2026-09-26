import {
  CANONICAL_COMPETITION,
  type Competition,
} from '@/types/competition'

type MiniLeagueRow = {
  id: number
  name: string
  member_status?: string | null
  created_by?: number | null
  /** Active league the user may switch to without being a member. */
  browsable?: boolean
}

/**
 * Keep mini mode when the user is an active member, created the league,
 * or chose it from the other-leagues list. Pending invites and unknown
 * ids fall back to canonical.
 */
export function validateCompetition(
  competition: Competition,
  miniLeagues: MiniLeagueRow[] | null | undefined,
  userId?: number | null,
): Competition {
  if (competition.type !== 'mini') {
    if (competition.type === 'tournament') return CANONICAL_COMPETITION
    return CANONICAL_COMPETITION
  }
  const found = (miniLeagues || []).find(m => Number(m.id) === competition.id)
  if (!found || found.member_status === 'pending') {
    return CANONICAL_COMPETITION
  }
  const createdByUser =
    userId != null &&
    found.created_by != null &&
    Number(found.created_by) === Number(userId)
  if (found.member_status === 'active' || createdByUser || found.browsable) {
    return {
      type: 'mini',
      id: Number(found.id),
      name: found.name || competition.name,
    }
  }
  return CANONICAL_COMPETITION
}
