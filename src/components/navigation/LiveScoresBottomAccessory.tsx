import LiveScoresTicker from '@/components/upcoming/LiveScoresTicker'
import {NativeTabs} from 'expo-router/native-tabs'
import React from 'react'

/**
 * Live score crawl in NativeTabs BottomAccessory (bar phones + Duo).
 * State lives in LiveScoresProvider — accessory mounts two placement instances.
 */
export function LiveScoresBottomAccessory() {
  const placement = NativeTabs.BottomAccessory.usePlacement()
  return (
    <LiveScoresTicker
      variant={placement === 'inline' ? 'accessoryInline' : 'accessory'}
    />
  )
}
