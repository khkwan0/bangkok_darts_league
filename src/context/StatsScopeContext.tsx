import React, {createContext, useContext, useMemo, useState} from 'react'

export type StatsScope = 'league' | 'cup' | 'both'

type StatsScopeContextValue = {
  scope: StatsScope
  setScope: (scope: StatsScope) => void
}

const StatsScopeContext = createContext<StatsScopeContextValue>({
  scope: 'league',
  setScope: () => {},
})

export function StatsScopeProvider({children}: {children: React.ReactNode}) {
  const [scope, setScope] = useState<StatsScope>('league')
  const value = useMemo(() => ({scope, setScope}), [scope])
  return (
    <StatsScopeContext.Provider value={value}>
      {children}
    </StatsScopeContext.Provider>
  )
}

export function useStatsScope() {
  return useContext(StatsScopeContext)
}

/** League = tournament_id 0; cup = tournament_id > 0; both = no filter. */
export function matchMatchesScope(
  tournamentId: number | null | undefined,
  scope: StatsScope,
): boolean {
  if (scope === 'both') return true
  const isCup = Number(tournamentId) > 0
  return scope === 'cup' ? isCup : !isCup
}

/**
 * Filter matches by league/cup scope. If no row carries tournament_id
 * (older API), skip filtering so Cup/League chips do not empty the list.
 */
export function filterMatchesByScope<T extends {tournament_id?: number | null}>(
  matches: T[],
  scope: StatsScope,
): T[] {
  if (scope === 'both') return matches
  const hasTournamentIds = matches.some(
    m => m.tournament_id !== undefined && m.tournament_id !== null,
  )
  if (!hasTournamentIds) return matches
  return matches.filter(m => matchMatchesScope(m.tournament_id, scope))
}
