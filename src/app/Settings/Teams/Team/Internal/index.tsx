import TeamInternal from '@/components/Statistics/TeamInternal'
import {useLocalSearchParams} from 'expo-router'

export default function TeamInternalScreen() {
  const {params} = useLocalSearchParams()
  const {teamId, teamName} = JSON.parse(params as string)

  return <TeamInternal teamId={teamId} teamName={teamName} />
}
