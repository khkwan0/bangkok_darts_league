import React from 'react'
import {ThemedText as Text} from '@/components/ThemedText'
import {Image, FlatList, View, Pressable} from 'react-native'
import Row from '@/components/Row'
import {useTeams} from '@/hooks'
import config from '@/config'
import {useLocalSearchParams} from 'expo-router'
import {useNavigation} from 'expo-router'
import {useRouter} from 'expo-router'

const StatsHeader = ({setSortOption, sortOption}: {setSortOption: (option: string) => void, sortOption: string}) => {
  return (
    <View className="flex-row items-center mb-8">
      <View style={{flex: 1}}>
        <Text className="font-medium">rank</Text>
      </View>
      <View style={{flex: 1}} />
      <View style={{flex: 2}}>
        <Text className="font-medium">nickname</Text>
      </View>
      <View style={{flex: 1}}>
        <Pressable onPress={() => setSortOption('played')}>
          <Text type="link" style={{fontWeight: sortOption === 'played' ? 'bold' : 'normal'}}>played</Text>
        </Pressable>
      </View>
      <View style={{flex: 1}}>
        <Pressable onPress={() => setSortOption('won')}>  
          <Text type="link" style={{fontWeight: sortOption === 'won' ? 'bold' : 'normal'}}>won</Text>
        </Pressable>
      </View>
      <View style={{flex: 1}}>
        <Pressable onPress={() => setSortOption('points')}>
          <Text type="link" style={{fontWeight: sortOption === 'points' ? 'bold' : 'normal'}}>points</Text>
        </Pressable>
      </View>
      <View style={{flex: 1}}>
        <Pressable onPress={() => setSortOption('perc')}>
          <Text type="link" style={{fontWeight: sortOption === 'perc' ? 'bold' : 'normal'}}>%</Text>
        </Pressable>
      </View>
    </View>
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
        <Text>{(props.index + 1).toString()}</Text>
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
        <Text>{props.item.perc.toString()}</Text>
      </View>
    </Pressable>
  )
}
export default function TeamInternal({teamId, teamName}: {teamId: number, teamName: string}) {
  const teams = useTeams()
  const [stats, setStats] = React.useState([])
  const [sortOption, setSortOption] = React.useState('points')
  const navigation = useNavigation()

  async function GetTeamInternalStats() {
    try {
      const res = await teams.GetTeamInternalStats(teamId)
      const data = res.data.map((item: any) => ({
        ...item,
        perc: ((item.points / item.played) * 100).toFixed(2),
      }))
      const _stats = data.sort((a: any, b: any) => b[sortOption] - a[sortOption])
      setStats(_stats)
    } catch (e) {
      console.log(e)
    }
  }

  React.useEffect(() => {
    if (teamId) {
      GetTeamInternalStats()
    }
  }, [sortOption])

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
      ListHeaderComponent={<StatsHeader setSortOption={setSortOption} sortOption={sortOption} />}
      renderItem={({item, index}) => <Stat item={item} index={index} />}
    />
  )
}