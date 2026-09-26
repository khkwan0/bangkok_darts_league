import {useNavigation, useLocalSearchParams} from 'expo-router'
import {useEffect} from 'react'
import SingleTeamStats from '@/components/Statistics/SingleTeamStatistics'

export default function TeamStatsScreen() {
  const navigation = useNavigation()
  const {teamIdParams} = useLocalSearchParams()
  const {teamId, teamName} = JSON.parse(teamIdParams as string)

  useEffect(() => {
    navigation.setOptions({
      title: `${teamName}`,
    })
  }, [])

  return <SingleTeamStats teamId={teamId} />
}
