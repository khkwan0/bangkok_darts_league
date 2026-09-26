import {useLocalSearchParams} from 'expo-router'
import TeamInternal from '@/components/Statistics/TeamInternal'

export default function TeamInternalScreen() {
  const {params} = useLocalSearchParams()
  const {teamId, teamName} = JSON.parse(params as string)

  return <TeamInternal teamId={teamId} teamName={teamName} />
}
