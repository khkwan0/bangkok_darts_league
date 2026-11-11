import React, {createContext, useContext} from 'react'

const X01ScoreContext = createContext<((frameIndex: number) => void) | null>(
  null,
)

export function X01ScoreProvider({
  onOpen,
  children,
}: {
  onOpen: (frameIndex: number) => void
  children: React.ReactNode
}) {
  return (
    <X01ScoreContext.Provider value={onOpen}>
      {children}
    </X01ScoreContext.Provider>
  )
}

export function useOpenX01Score(): ((frameIndex: number) => void) | null {
  return useContext(X01ScoreContext)
}
