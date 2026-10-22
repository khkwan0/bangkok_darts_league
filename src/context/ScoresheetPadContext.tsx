import React, {createContext, useCallback, useContext, useMemo, useState} from 'react'

export type ScoresheetPadSession = {
  title: string
  value: number
  max: number
  accent: string
  onCancel: () => void
  onConfirm: (value: number) => void
}

type ScoresheetPadContextValue = {
  /** When true, StatNumberPad renders into the side pane instead of a modal. */
  useSidePad: boolean
  session: ScoresheetPadSession | null
  openPad: (session: ScoresheetPadSession) => void
  closePad: () => void
}

const ScoresheetPadContext = createContext<ScoresheetPadContextValue | null>(
  null,
)

export function ScoresheetPadProvider({
  useSidePad,
  children,
}: {
  useSidePad: boolean
  children: React.ReactNode
}) {
  const [session, setSession] = useState<ScoresheetPadSession | null>(null)

  const openPad = useCallback((next: ScoresheetPadSession) => {
    setSession(next)
  }, [])

  const closePad = useCallback(() => {
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({useSidePad, session, openPad, closePad}),
    [useSidePad, session, openPad, closePad],
  )

  return (
    <ScoresheetPadContext.Provider value={value}>
      {children}
    </ScoresheetPadContext.Provider>
  )
}

export function useScoresheetPad(): ScoresheetPadContextValue | null {
  return useContext(ScoresheetPadContext)
}
