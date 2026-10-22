import {AdaptiveSplit} from '@/components/layout/AdaptiveSplit'
import {useScoresheetPad} from '@/context/ScoresheetPadContext'
import React from 'react'
import ScoresheetPadPane from './ScoresheetPadPane'

/**
 * Full-width frames until a number pad is open; then split so the pad
 * sits in the trailing pane (Duo / regular width only).
 */
export function ScoresheetLayout({
  framesList,
}: {
  framesList: React.ReactNode
}) {
  const pad = useScoresheetPad()
  const showPadColumn = Boolean(pad?.useSidePad && pad.session != null)

  if (!showPadColumn) {
    return <>{framesList}</>
  }

  return (
    <AdaptiveSplit
      split
      keepEmptyDetail={false}
      list={framesList}
      detail={<ScoresheetPadPane />}
      listWidth={480}
    />
  )
}
