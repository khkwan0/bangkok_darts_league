import {useLocalSearchParams} from 'expo-router'
import PlayerDetails from '@/components/PlayerDetails'

export default function TeamPlayer() {
  const {params} = useLocalSearchParams()
  const playerId = JSON.parse(params as string).playerId
  return <PlayerDetails playerId={playerId} />
}
