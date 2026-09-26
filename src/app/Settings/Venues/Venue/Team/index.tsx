import TeamMembers from '@/components/Teams/Team'
import {useLocalSearchParams} from 'expo-router'

export default function Team() {
  const {params} = useLocalSearchParams()
  const teamId = JSON.parse(params as string).teamId
  return <TeamMembers teamId={teamId} />
}
