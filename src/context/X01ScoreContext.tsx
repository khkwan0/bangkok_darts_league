import type {
  ScoreThrowSync,
  ScoresheetScoringMode,
  X01Side,
} from '@/lib/x01Score'
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
  /** Score games: marks per number (15–20, 25), 0–3 each. */
  cricket?: X01CricketMarks | null
  rev?: number
  homeThrower?: number
  awayThrower?: number
  dartsThrown?: number
  throws?: ScoreThrowSync[]
}

/** What was pressed on the score screen; the server logs it in match history. */
export type X01Audit = {
  action: 'dart' | 'miss' | 'undo' | 'side' | 'thrower' | 'reset'
  side: X01Side
  throwerId?: number
  label?: string
  points?: number
  dart?: number
  legIndex?: number
}

export type X01CricketMarks = {
  home: Record<string, number>
  away: Record<string, number>
}

function sameMarks(
  a: X01CricketMarks | null | undefined,
  b: X01CricketMarks | null | undefined,
): boolean {
  if (!a || !b) return !a && !b
  return JSON.stringify(a) === JSON.stringify(b)
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
          cur.done === board.done &&
          cur.rev === board.rev &&
          cur.homeThrower === board.homeThrower &&
          cur.awayThrower === board.awayThrower &&
          sameMarks(cur.cricket, board.cricket)
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
