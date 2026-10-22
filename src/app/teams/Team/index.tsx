import TeamMembers from '@/components/Teams/Team'
import {useLocalSearchParams} from 'expo-router'

export default function Team() {
  const {params} = useLocalSearchParams()
  const parsed = JSON.parse(params as string)
  const teamId = parsed.teamId
  const seasonId =
    parsed.seasonId != null ? Number(parsed.seasonId) : undefined
  return <TeamMembers teamId={teamId} seasonId={seasonId} />
}
