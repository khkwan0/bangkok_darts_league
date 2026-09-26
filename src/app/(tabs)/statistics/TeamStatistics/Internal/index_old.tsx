import React from 'react'
import {ThemedText as Text} from '@/components/ThemedText'
import {Image, FlatList, View, Pressable} from 'react-native'
import Row from '@/components/Row'
import {useTeams} from '@/hooks'
import config from '@/config'
import {useLocalSearchParams} from 'expo-router'
import {useNavigation} from 'expo-router'
import {useRouter} from 'expo-router'

const StatsHeader = ({
  setSortOption,
}: {
  setSortOption: (option: string) => void
}) => {
  return (
    <Row alignItems="center">
      <View style={{flex: 1}}>
        <Text className="font-medium">rank</Text>
      </View>
      <View style={{flex: 1}} />
      <View style={{flex: 2}}>
        <Text className="font-medium">nickname</Text>
      </View>
      <View style={{flex: 1}}>
        <Text className="font-medium">played</Text>
      </View>
      <View style={{flex: 1}}>
        <Text className="text-center">won</Text>
      </View>
      <Pressable onPress={() => setSortOption('points')} style={{flex: 1}}>
        <Text className="text-center">points</Text>
      </Pressable>
      <Pressable onPress={() => setSortOption('perc')} style={{flex: 1}}>
        <Text className="text-center">%</Text>
      </Pressable>
    </Row>
  )
}

type PlayerStat = {
  player_id: number
  nickname: string
  profile_picture: string
  played: number
  won: number
  points: number
  perc: number
}

interface StatProps {
  index: number
  item: PlayerStat
}

function Stat(props: StatProps) {
  const router = useRouter()

  function HandlePlayerPress(playerId: number) {
    router.push({
      pathname: './Player',
      params: {params: JSON.stringify({playerId})},
    })
  }

  return (
    <Pressable
      className="flex-row items-center py-2"
      onPress={() => HandlePlayerPress(props.item.player_id)}>
      <View style={{flex: 1}}>
        <Text>{props.index + 1}</Text>
      </View>
      <View style={{flex: 1}}>
        {props.item.profile_picture && (
          <View>
            <Image
              source={{uri: config.profileUrl + props.item.profile_picture}}
              width={30}
              height={30}
              resizeMode="contain"
              style={{borderRadius: 50}}
            />
          </View>
        )}
      </View>
      <View style={{flex: 2}}>
        <Text>{props.item.nickname}</Text>
      </View>
      <View style={{flex: 1}}>
        <Text>{props.item.played.toString()}</Text>
      </View>
      <View style={{flex: 1}}>
        <Text>{props.item.won.toString()}</Text>
      </View>
      <View style={{flex: 1}}>
        <Text>{props.item.points.toString()}</Text>
      </View>
      <View style={{flex: 1}}>
        <Text className="text-center">{props.item.perc.toFixed(2)}</Text>
      </View>
    </Pressable>
  )
}
const TeamInternal = () => {
  const {params} = useLocalSearchParams()
  const {teamId, teamName} = JSON.parse(params as string)
  const teams = useTeams()
  const [stats, setStats] = React.useState([])
  const [sortOption, setSortOption] = React.useState('perc')
  const navigation = useNavigation()

  async function GetTeamInternalStats() {
    try {
      const res = await teams.GetTeamInternalStats(teamId)
      const _stats = res.data.map((player: PlayerStat) => ({
        ...player,
        perc: (player.won / player.played) * 100,
      }))
      if (sortOption === 'perc') {
        _stats.sort((a: PlayerStat, b: PlayerStat) => b.perc - a.perc)
      } else if (sortOption === 'points') {
        _stats.sort((a: PlayerStat, b: PlayerStat) => b.points - a.points)
      } else if (sortOption === 'played') {
        _stats.sort((a: PlayerStat, b: PlayerStat) => b.played - a.played)
      }
      setStats(_stats)
    } catch (e) {
      console.log(e)
    }
  }

  React.useEffect(() => {
    const _stats = [...stats]
    if (sortOption === 'perc') {
      _stats.sort((a: PlayerStat, b: PlayerStat) => b.perc - a.perc)
    } else if (sortOption === 'points') {
      _stats.sort((a: PlayerStat, b: PlayerStat) => b.points - a.points)
    } else if (sortOption === 'played') {
      _stats.sort((a: PlayerStat, b: PlayerStat) => b.played - a.played)
    }
    setStats(_stats)
  }, [sortOption])

  React.useEffect(() => {
    if (teamId) {
      GetTeamInternalStats()
    }
  }, [])

  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: teamName,
    })
  }, [navigation, teamName])

  return (
    <FlatList
      style={{
        paddingHorizontal: 20,
        paddingTop: 20,
      }}
      data={stats}
      ListHeaderComponent={<StatsHeader setSortOption={setSortOption} />}
      renderItem={({item, index}) => <Stat item={item} index={index} />}
    />
  )
}

export default TeamInternal
