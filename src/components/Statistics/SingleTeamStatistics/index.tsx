import {FlatList, View} from 'react-native'
import {useTeams} from '@/hooks'
import {useCallback, useEffect, useState} from 'react'
import StatsCard from './StatsCard'
import {ThemedText as Text} from '@/components/ThemedText'
import {useTranslation} from 'react-i18next'

export interface TeamStat {
  home_team_id: number
  home_frames: number
  away_team_id: number
  away_frames: number
  date: string
}
export default function SingleTeamStats({teamId}: {teamId: number}) {
  const {GetTeamStats} = useTeams()
  const [teamStats, setTeamStats] = useState([])
  const {t} = useTranslation()

  useEffect(() => {
    async function fetchTeamStats() {
      try {
        const res = await GetTeamStats(teamId)
        setTeamStats(res.data)
      } catch (error) {
        console.error('Error fetching team stats:', error)
      }
    }
    fetchTeamStats()
  }, [])

  const header = useCallback(() => {
    let wins = 0
    let losses = 0
    let ties = 0
    teamStats.forEach((stat: TeamStat) => {
      if (stat.home_team_id === teamId) {
        if (stat.home_frames > stat.away_frames) {
          wins++
        } else if (stat.home_frames < stat.away_frames) {
          losses++
        } else {
          ties++
        }
      } else if (stat.away_team_id === teamId) {
        if (stat.away_frames > stat.home_frames) {
          wins++
        } else if (stat.away_frames < stat.home_frames) {
          losses++
        } else {
          ties++
        }
      }
    })
    return (
      <>
        <View className="flex-row justify-between m-4 px-10">
          <Text type="title" className="text-center flex-1">
            {t('wins')}
          </Text>
          <Text type="title" className="text-center flex-1">
            {t('losses')}
          </Text>
          <Text type="title" className="text-center flex-1">
            {t('ties')}
          </Text>
        </View>
        <View className="flex-row justify-between mx-4 px-10">
          <Text type="title" className="text-center flex-1">
            {wins.toString()}
          </Text>
          <Text type="title" className="text-center flex-1">
            {losses.toString()}
          </Text>
          <Text type="title" className="text-center flex-1">
            {ties.toString()}
          </Text>
        </View>
      </>
    )
  }, [teamStats])

  return (
    <FlatList
      ListHeaderComponent={header}
      data={teamStats}
      renderItem={({item}) => <StatsCard stat={item} />}
    />
  )
}
