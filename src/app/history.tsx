import React from 'react'
import {useNavigation} from "expo-router/react-navigation"
import {useLocalSearchParams} from 'expo-router'
import {useMatch} from '@/hooks'
import {FlatList} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {formatBangkokFromMillis} from '@/lib/bangkokTime'
import {ThemedView as View} from '@/components/ThemedView'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

type HistoryItem = {
  timestamp: number
  msg: string[]
}

function formatDate(timestamp: number) {
  return formatBangkokFromMillis(timestamp)
}

export default function History() {
  const navigation = useNavigation()
  const [history, setHistory] = React.useState<HistoryItem[]>([])
  const {params} = useLocalSearchParams()
  const match = useMatch()
  const insets = useSafeAreaInsets()

  const matchId = JSON.parse(params as string).match_id

  React.useEffect(() => {
    navigation.setOptions({title: 'History'})
  })

  React.useEffect(() => {
    async function fetchMatch() {
      try {
        const res = await match.GetMatchInfo(matchId)
        setHistory(res?.data?.history ?? [])
      } catch (error) {
        console.error('Error fetching match by ID:', error)
      }
    }
    fetchMatch()
  }, [match, matchId])

  return (
    <FlatList
      contentContainerStyle={{paddingBottom: insets.bottom}}
      data={history}
      renderItem={({item}) => {
        if (item !== null) {
          return (
            <View className="my-2 p-2">
              <Text>{formatDate(item.timestamp)}</Text>
              <Text>{item.msg}</Text>
            </View>
          )
        } else {
          return null
        }
      }}
    />
  )
}
