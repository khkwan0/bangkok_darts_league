import {CompetitionModeBanner} from '@/components/navigation/CompetitionModeBanner'
import {useLeagueContext} from '@/context/LeagueContext'
import {isCanonicalCompetition} from '@/types/competition'
import {NativeTabs} from 'expo-router/native-tabs'
import React from 'react'
import {View} from 'react-native'

/**
 * Competition banner above the native tab bar (Duo side rail / bottom bar).
 * State lives outside via LeagueContext — BottomAccessory mounts two instances.
 */
export function CompetitionBottomAccessory() {
  const {state} = useLeagueContext()
  const placement = NativeTabs.BottomAccessory.usePlacement()

  if (isCanonicalCompetition(state.competition)) {
    return null
  }

  if (placement === 'inline') {
    return (
      <View style={{maxWidth: 220}}>
        <CompetitionModeBanner />
      </View>
    )
  }

  return <CompetitionModeBanner />
}
