import React from 'react'
import MatchScreen from '@/app/Settings/MatchScreen'
import {useLocalSearchParams} from 'expo-router'

const PlayerMatchScreen = () => {
  const {matchId} = useLocalSearchParams()
  return <MatchScreen matchId={matchId} />
}

export default PlayerMatchScreen
