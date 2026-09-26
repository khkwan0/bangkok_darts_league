import { ThemedText as Text } from '@/components/ThemedText'
import { ThemedView as View } from '@/components/ThemedView'
import { useMatchContext } from '@/context/MatchContext'
import { useMatch } from '@/hooks'
import { useNavigation } from "expo-router/react-navigation"
import { useLocalSearchParams } from 'expo-router'
import {formatBangkokFromMillis} from '@/lib/bangkokTime'
import React from 'react'
import { FlatList } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
  const [refreshing, setRefreshing] = React.useState(false)
  const {state}: any = useMatchContext()

  React.useEffect(() => {
    navigation.setOptions({title: 'History'})
  })

  React.useEffect(() => {
    fetchMatch()
  }, [])

  async function fetchMatch() {
    try {
      setRefreshing(true)
      const res = await match.GetMatchInfo(state.matchInfo.match_id)
      const _history = res?.data?.history ?? []
      const _historySorted = _history.sort((a: HistoryItem, b: HistoryItem) => {
        if (a?.timestamp && b?.timestamp) {
          return b.timestamp - a.timestamp
        } else {
          return 0
        }
      })
      setHistory(_historySorted)
    } catch (error) {
      console.error('Error fetching match by ID:', error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <FlatList
      contentContainerStyle={{paddingBottom: insets.bottom}}
      data={history}
      refreshing={refreshing}
      onRefresh={() => fetchMatch()}
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
