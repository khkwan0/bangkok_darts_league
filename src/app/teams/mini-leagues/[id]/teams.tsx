import {MiniLeagueTeamsPanel} from '@/components/mini-leagues/MiniLeagueTeamsPanel'
import {useLocalSearchParams} from 'expo-router'
import React from 'react'

export default function MiniLeagueTeamsScreen() {
  const {id} = useLocalSearchParams<{id: string}>()
  const miniId = Number(id)
  if (!miniId) return null
  return <MiniLeagueTeamsPanel miniLeagueId={miniId} />
}
