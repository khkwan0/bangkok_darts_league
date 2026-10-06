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
