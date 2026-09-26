import React from 'react'
import {useLeague} from '@/hooks'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import {useNavigation, useRouter} from 'expo-router'
import Button from '@/components/Button'
import {ActivityIndicator, Pressable, ScrollView} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useTranslation} from 'react-i18next'
import Row from '@/components/Row'
import {t} from 'i18next'

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
            const homeAway = match.home_team === data.name ? 'Home' : 'Away'
            return (
              <Pressable
                key={matchIdx}
                onPress={() => HandleMatchPress(match.match_id)}>
                <Row className="px-4 py-2">
                  <View style={{flex: 2}}>
                    <Text>{`vs ${vsTeam} (${homeAway})`}</Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text>{result}</Text>
                  </View>
                </Row>
              </Pressable>
            )
          })}
        {showMore && (
          <Button
            className="py-2"
            onPress={() =>
              router.push({
                pathname: '/TeamStats',
                params: {
                  teamIdParams: JSON.stringify({
                    teamId: data.teamId,
                    teamName: data.name,
                  }),
                },
              })
            }>
            {t('internal_stats')}
          </Button>
        )}
      </View>
    </>
  )
}

const TeamStatisticsHeader = () => {
  return (
    <Row alignItems="center">
      <View style={{flex: 1}}>
        <Text type="subtitle">Rank</Text>
      </View>
      <View style={{flex: 3}}>
        <Text type="subtitle">Team</Text>
      </View>
      <View style={{flex: 1}}>
        <Text type="subtitle">Pts</Text>
      </View>
      <View style={{flex: 1}}>
        <Text type="subtitle">W/L</Text>
      </View>
      <View style={{flex: 1}}>
        <Text type="subtitle">Frames</Text>
      </View>
    </Row>
  )
}

export default function TeamStatistics() {
  const league = useLeague()
  const [stats, setStats] = React.useState({})
  const [isLoading, setIsLoading] = React.useState(false)
  const navigation = useNavigation()
  const listContentStyle = useTabListContentContainerStyle({
    flexGrow: 1,
    paddingHorizontal: 20,
  })

  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: 'Team Statistics',
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
      return []
    }
  }

  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator />
      </View>
    )
  } else {
    return (
      <ScrollView contentContainerStyle={listContentStyle}>
        <View className="my-4">
          <Text type="subtitle">8-Ball</Text>
        </View>
        <TeamStatisticsHeader />
        {typeof stats.eightBall !== 'undefined' &&
          stats.eightBall.map((item, index) => (
            <TeamStanding key={'8b' + index} data={item} idx={index} />
          ))}
        <View className="my-4">
          <Text type="subtitle">9-Ball</Text>
        </View>
        <TeamStatisticsHeader />
        {typeof stats.nineBall !== 'undefined' &&
          stats.nineBall.map((item, index) => (
            <TeamStanding key={'9b' + index} data={item} idx={index} />
          ))}
      </ScrollView>
    )
  }
}
