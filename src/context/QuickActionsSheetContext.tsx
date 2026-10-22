import {
  TabActionSheet,
  type QuickActionsSheetHandle,
} from '@/components/navigation/TabActionSheet'
import React, {createContext, useCallback, useContext, useRef} from 'react'

type QuickActionsSheetContextValue = {
  openQuickActions: () => void
}

const QuickActionsSheetContext =
  createContext<QuickActionsSheetContextValue | null>(null)

export function QuickActionsSheetProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const sheetRef = useRef<QuickActionsSheetHandle>(null)

  const openQuickActions = useCallback(() => {
    sheetRef.current?.present()
  }, [])

  return (
    <QuickActionsSheetContext.Provider value={{openQuickActions}}>
      {children}
      <TabActionSheet ref={sheetRef} />
    </QuickActionsSheetContext.Provider>
  )
}

export function useQuickActionsSheet(): QuickActionsSheetContextValue {
  const ctx = useContext(QuickActionsSheetContext)
  if (ctx == null) {
    throw new Error(
      'useQuickActionsSheet must be used within QuickActionsSheetProvider',
    )
  }
  return ctx
}
