import React from 'react'
import {TeamStats, useLeague} from '@/hooks'
import {useLeagueSeasonSelection} from '@/hooks/useLeagueSeasonSelection'
import {MiniSeasonChips} from '@/components/mini-leagues/MiniSeasonChips'
import Button from '@/components/Button'
import {ActivityIndicator, Pressable, ScrollView, View} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as Card} from '@/components/ThemedView'
import {useTranslation} from 'react-i18next'
import Row from '@/components/Row'
import {t} from 'i18next'
import {useRouter, useNavigation, usePathname} from 'expo-router'

const TeamStanding = ({data, idx}) => {
  const [showMore, setShowMore] = React.useState(false)
  const {t} = useTranslation()
  const router = useRouter()
  const currentPath = usePathname()

  function HandleMatchPress(matchId: number) {
    router.push({
      pathname: currentPath + '/Match',
      params: {params: JSON.stringify({matchId: matchId})},
    })
  }

  function HandleInternalStats() {
    router.push({
      pathname: currentPath + '/Internal',
      params: {
        params: JSON.stringify({teamId: data.teamId, teamName: data.name}),
      },
    })
  }

  return (
    <>
      <Pressable onPress={() => setShowMore(s => !s)} className="py-2">
        <Card className="flex-row p-4 rounded-lg">
          <View style={{flex: 1}}>
            <Text>{idx + 1}</Text>
          </View>
          <View style={{flex: 3}}>
            <View className="rounded-md mr-5">
              <Text type="link" className="text-lg font-medium">
                {data.name}
              </Text>
            </View>
          </View>
          <View style={{flex: 1}}>
            <Text className="text-center font-bold">{data.points}</Text>
          </View>
          <View style={{flex: 1}}>
            <Text className="text-center">
              {data.won}:{data.lost}
            </Text>
          </View>
          <View style={{flex: 1}}>
            <Text className="text-center">{data.frames}</Text>
          </View>
        </Card>
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
                <Row className="px-4 py-2">
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
        {showMore && (
          <Pressable
            onPress={() => HandleInternalStats()}
            className="mx-4 my-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <Text className="text-center" type="link">
              {t('internal_stats')}
            </Text>
          </Pressable>
        )}
      </View>
    </>
  )
}

const TeamStatisticsHeader = () => {
  const {t} = useTranslation()
  return (
    <View className="flex-row px-4 py-2 border-b border-gray-200 dark:border-gray-700">
      <View style={{flex: 1}}>
        <Text className="text-left font-medium">{t('rank')}</Text>
      </View>
      <View style={{flex: 3}}>
        <Text className="text-left font-medium">{t('team')}</Text>
      </View>
      <View style={{flex: 1}}>
        <Text className="text-center font-medium">{t('points')}</Text>
      </View>
      <View style={{flex: 1}}>
        <Text className="text-center font-medium">W/L</Text>
      </View>
      <View style={{flex: 1}}>
        <Text className="text-center font-medium">{t('frame')}</Text>
      </View>
    </View>
  )
}
const TeamStatistics = () => {
  const league = useLeague()
  const [stats, setStats] = React.useState<TeamStats>({})
  const [isLoading, setIsLoading] = React.useState(false)
  const navigation = useNavigation()
  const {t} = useTranslation()
  const {seasons, seasonId, setSeasonId, pastSeasonId} =
    useLeagueSeasonSelection()

  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: t('statistics'),
      headerBackTitle: t('back'),
    })
  }, [])

  React.useEffect(() => {
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
  }, [pastSeasonId])

  async function GetTeamStats() {
    try {
      const res = await league.GetTeamStats(pastSeasonId)
      return res
    } catch (e) {
      console.log(e)
      return []
    }
  }

  const seasonChips = (
    <MiniSeasonChips
      seasons={seasons}
      seasonId={seasonId}
      onSelect={setSeasonId}
    />
  )

  if (isLoading) {
    return (
      <View style={{flex: 1, paddingHorizontal: 16, paddingTop: 12}}>
        {seasonChips}
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    )
  } else {
    return (
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
        {seasonChips}
        <View className="my-4">
          <Text type="subtitle" className="text-xl font-bold">
            {t('eight_ball')}
          </Text>
        </View>
        <Card className="mb-6 rounded-lg overflow-hidden">
          <TeamStatisticsHeader />
          {typeof stats.eightBall !== 'undefined' &&
            stats.eightBall.map((item, index) => (
              <TeamStanding key={'8b' + index} data={item} idx={index} />
            ))}
        </Card>
        <View className="my-4">
          <Text type="subtitle" className="text-xl font-bold">
            {t('nine_ball')}
          </Text>
        </View>
        <Card className="mb-6 rounded-lg overflow-hidden">
          <TeamStatisticsHeader />
          {typeof stats.nineBall !== 'undefined' &&
            stats.nineBall.map((item, index) => (
              <TeamStanding key={'9b' + index} data={item} idx={index} />
            ))}
        </Card>
      </ScrollView>
    )
  }
}

export default TeamStatistics
