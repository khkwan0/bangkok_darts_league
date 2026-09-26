import {useLocalSearchParams} from 'expo-router'
import Match from '@/components/Completed/CompletedMatchDetails'

export default function MatchPerformance() {
  const {params} = useLocalSearchParams()
  const {matchId} = JSON.parse(params as string)

  return <Match matchId={matchId} />
}
