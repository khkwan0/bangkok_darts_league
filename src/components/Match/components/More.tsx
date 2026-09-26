import {ThemedText as Text} from '@/components/ThemedText'
import Row from '@/components/Row'
import {Pressable} from 'react-native'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {router} from 'expo-router'
import {useMatchContext} from '@/context/MatchContext'

export default function More({matchId}: {matchId: number}) {
  return (
    <Pressable
      className="items-center justify-center p-4 my-2 mx-4 bg-violet-300 dark:bg-violet-500 rounded-lg"
      onPress={() =>
        router.push({
          pathname: '/Match/History',
          params: {params: JSON.stringify({match_id: matchId})},
        })
      }>
      <Row className="items-center" style={{gap: 10}}>
        <MCI name="dots-triangle" size={20} />
        <Text type="subtitle">more</Text>
      </Row>
    </Pressable>
  )
}
