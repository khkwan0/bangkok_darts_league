import React from 'react'
import Player from '@/app/Settings/Player'
import {useLocalSearchParams} from 'expo-router'

const _Player = () => {
  const {playerId} = useLocalSearchParams()
  return <Player playerId={playerId} />
}

export default _Player
