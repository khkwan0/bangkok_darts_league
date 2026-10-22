import {useLayoutMode, type LayoutMode} from '@/hooks/useLayoutMode'
import {useHingePose, type HingePose} from '@/hooks/useHingePose'
import React, {createContext, useContext} from 'react'

type LayoutModeContextValue = {
  layoutMode: LayoutMode
  isRegular: boolean
  hingePose: HingePose
}

const LayoutModeContext = createContext<LayoutModeContextValue | null>(null)

export function LayoutModeProvider({children}: {children: React.ReactNode}) {
  const layoutMode = useLayoutMode()
  const hingePose = useHingePose()

  return (
    <LayoutModeContext.Provider
      value={{
        layoutMode,
        isRegular: layoutMode === 'regular',
        hingePose,
      }}>
      {children}
    </LayoutModeContext.Provider>
  )
}

export function useLayoutModeContext(): LayoutModeContextValue {
  const ctx = useContext(LayoutModeContext)
  if (ctx == null) {
    throw new Error('useLayoutModeContext must be used within LayoutModeProvider')
  }
  return ctx
}
