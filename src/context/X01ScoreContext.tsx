import type {ScoresheetScoringMode, X01Side} from '@/lib/x01Score'
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

/** Live X01 totals mirrored onto the scoresheet game card. */
export type X01BoardSnapshot = {
  mode: ScoresheetScoringMode
  start: number
  home: number
  away: number
  active: X01Side
  legIndex: number
  done: boolean
}

type X01ScoreContextValue = {
  open: (frameIndex: number) => void
  boards: Record<number, X01BoardSnapshot>
  publishBoard: (frameIndex: number, board: X01BoardSnapshot) => void
}

const X01ScoreContext = createContext<X01ScoreContextValue | null>(null)

export function X01ScoreProvider({
  onOpen,
  children,
}: {
  onOpen: (frameIndex: number) => void
  children: React.ReactNode
}) {
  const [boards, setBoards] = useState<Record<number, X01BoardSnapshot>>({})

  const publishBoard = useCallback(
    (frameIndex: number, board: X01BoardSnapshot) => {
      setBoards(prev => {
        const cur = prev[frameIndex]
        if (
          cur &&
          cur.mode === board.mode &&
          cur.start === board.start &&
          cur.home === board.home &&
          cur.away === board.away &&
          cur.active === board.active &&
          cur.legIndex === board.legIndex &&
          cur.done === board.done
        ) {
          return prev
        }
        return {...prev, [frameIndex]: board}
      })
    },
    [],
  )

  const value = useMemo(
    () => ({open: onOpen, boards, publishBoard}),
    [onOpen, boards, publishBoard],
  )

  return (
    <X01ScoreContext.Provider value={value}>{children}</X01ScoreContext.Provider>
  )
}

export function useX01Score(): X01ScoreContextValue | null {
  return useContext(X01ScoreContext)
}

export function useOpenX01Score(): ((frameIndex: number) => void) | null {
  return useContext(X01ScoreContext)?.open ?? null
}

export function useX01BoardSnapshot(
  frameIndex: number,
): X01BoardSnapshot | null {
  return useContext(X01ScoreContext)?.boards[frameIndex] ?? null
}
