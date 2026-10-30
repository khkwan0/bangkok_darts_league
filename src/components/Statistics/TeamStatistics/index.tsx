import React from 'react'
import {useLeague} from '@/hooks'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import {useNavigation, useRouter} from 'expo-router'
import {ActivityIndicator, Pressable, ScrollView} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useTranslation} from 'react-i18next'
import Row from '@/components/Row'

const TeamStanding = ({data, idx}) => {
  const [showMore, setShowMore] = React.useState(false)
  const router = useRouter()
  const {t} = useTranslation()

  function HandleMatchPress(matchId) {
    router.push({
      pathname: '/Statistics/MatchScreen',
      params: {matchId: matchId},
    })
  }

  return (
    <>
      <Pressable onPress={() => setShowMore(s => !s)} className="py-2">
        <Row alignItems="center">
          <View style={{flex: 1}}>
            <Text>{idx + 1}</Text>
          </View>
          <View style={{flex: 3}}>
            <View className="rounded-md mr-5">
              <Text type="link">{data.name}</Text>
            </View>
          </View>
          <View style={{flex: 1}}>
            <Text>{data.points}</Text>
          </View>
          <View style={{flex: 1}}>
            <Text>
              {data.won}:{data.lost}
            </Text>
          </View>
          <View style={{flex: 1}}>
            <Text>{data.frames}</Text>
          </View>
        </Row>
      </Pressable>
      <View>
        {showMore &&
          data.matches.map((match, matchIdx) => {
            const result =
              match.home_team === data.name
                ? match.home_frames > match.away_frames
                  ? 'W'
                  : match.home_frames < match.away_frames
                    ? 'L'
                    : 'T'
                : match.home_frames < match.away_frames
                  ? 'W'
                  : match.home_frames > match.away_frames
                    ? 'L'
                    : 'T'
            const vsTeam =
              match.home_team === data.name ? match.away_team : match.home_team
            const homeAway =
              match.home_team === data.name ? t('home') : t('away')
            return (
              <Pressable
                key={matchIdx}
                onPress={() => HandleMatchPress(match.match_id)}>
                <Row>
                  <View style={{flex: 2}}>
                    <Text
                      type="link"
                      className="text-lg">{`vs ${vsTeam} (${homeAway})`}</Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text className="font-bold">{result}</Text>
                  </View>
                </Row>
              </Pressable>
            )
          })}
      </View>
    </>
  )
}

const TeamStatisticsHeader = () => {
  const {t} = useTranslation()
  return (
    <Row alignItems="center">
      <View style={{flex: 1}}>
        <Text type="subtitle">{t('rank')}</Text>
      </View>
      <View style={{flex: 3}}>
        <Text type="subtitle">{t('team')}</Text>
      </View>
      <View style={{flex: 1}}>
        <Text type="subtitle">{t('points')}</Text>
      </View>
      <View style={{flex: 1}}>
        <Text type="subtitle">W/L</Text>
      </View>
      <View style={{flex: 1}}>
        <Text type="subtitle">{t('frames')}</Text>
      </View>
    </Row>
  )
}

function teamRowsFromStats(stats: any): any[] {
  if (!stats || typeof stats !== 'object') return []
  if (Array.isArray(stats.teams)) return stats.teams
  if (Array.isArray(stats.eightBall) || Array.isArray(stats.nineBall)) {
    return [...(stats.eightBall || []), ...(stats.nineBall || [])]
  }
  if (Array.isArray(stats)) return stats
  return []
}

export default function TeamStatistics() {
  const league = useLeague()
  const [stats, setStats] = React.useState<any>({})
  const [isLoading, setIsLoading] = React.useState(false)
  const navigation = useNavigation()
  const {t} = useTranslation()
  const listContentStyle = useTabListContentContainerStyle({
    flexGrow: 1,
    paddingHorizontal: 20,
  })

  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: t('team_statistics'),
      headerBackTitle: t('back'),
    })
    ;(async () => {
      try {
        setIsLoading(true)
        const res = await GetTeamStats()
        setStats(res)
      } catch (e) {
        console.log(e)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  async function GetTeamStats() {
    try {
      const res = await league.GetTeamStats()
      return res
    } catch (e) {
      console.log(e)
      return {}
    }
  }

  const teams = teamRowsFromStats(stats)

  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={listContentStyle}>
      <View className="my-4">
        <Text type="subtitle">{t('stats_scope_league')}</Text>
      </View>
      <TeamStatisticsHeader />
      {teams.map((item, index) => (
        <TeamStanding
          key={String(item.teamId ?? item.name ?? index)}
          data={item}
          idx={index}
        />
      ))}
    </ScrollView>
  )
}
