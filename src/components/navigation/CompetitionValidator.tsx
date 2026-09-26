import {useLeagueContext} from '@/context/LeagueContext'
import {useMiniLeagues} from '@/hooks/useMiniLeagues'
import {validateCompetition} from '@/lib/competitionValidation'
import React from 'react'

/**
 * Re-validates persisted mini competition once the signed-in user is known.
 * Does not clear mode while auth/user is still loading — that was wiping
 * persisted mini mode on every cold start.
 */
export function CompetitionValidator() {
  const {state, setCompetition, apiUrl} = useLeagueContext()
  const api = useMiniLeagues()
  const apiRef = React.useRef(api)
  apiRef.current = api
  const userId = state.user?.id
  const competition = state.competition
  const competitionKey =
    competition.type === 'mini'
      ? `mini:${competition.id}`
      : competition.type === 'tournament'
        ? `tournament:${competition.id}`
        : 'canonical'

  React.useEffect(() => {
    let cancelled = false

    async function run() {
      // Wait for user — never treat "not loaded yet" as logged out.
      if (!userId) return
      if (competition.type !== 'mini') return

      const [res, activeRes] = await Promise.all([
        apiRef.current.list(),
        apiRef.current.listActive(),
      ])
      if (cancelled) return
      // Network/auth failure: keep persisted selection
      if (res?.status !== 'ok' || !Array.isArray(res.data)) return

      const mine = res.data as Array<{
        id: number
        name: string
        member_status?: string | null
        created_by?: number | null
      }>
      const catalogOk =
        activeRes?.status === 'ok' && Array.isArray(activeRes.data)
      const mineIds = new Set(mine.map(row => Number(row.id)))
      const browsable = catalogOk
        ? (activeRes.data as Array<{id: number; name: string}>)
            .filter(row => !mineIds.has(Number(row.id)))
            .map(row => ({
              id: Number(row.id),
              name: row.name,
              browsable: true as const,
            }))
        : []
      const next = validateCompetition(
        competition,
        [...mine, ...browsable],
        userId,
      )
      const pendingInvite = mine.some(
        row =>
          Number(row.id) === competition.id && row.member_status === 'pending',
      )
      // Catalog failed and this league is not one of theirs: keep the choice.
      // A pending invite still falls back to the main league.
      if (
        !pendingInvite &&
        !catalogOk &&
        competition.type === 'mini' &&
        next.type !== 'mini'
      ) {
        return
      }
      if (
        next.type !== competition.type ||
        (next.type === 'mini' &&
          competition.type === 'mini' &&
          (next.id !== competition.id || next.name !== competition.name))
      ) {
        await setCompetition(next)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [userId, competitionKey, setCompetition, apiUrl])

  return null
}
