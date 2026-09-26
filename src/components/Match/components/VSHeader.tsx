import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import Row from '@/components/Row'
import {MatchInfoType} from '../types'
import {Pressable} from 'react-native'
import {router} from 'expo-router'
import {useMatchContext} from '@/context/MatchContext'
export default function VSHeader({matchInfo}: MatchInfoType) {

  const {state}: any = useMatchContext()
  return (
    <Row alignItems="center">
      <View style={{flex: 3}} className="items-center">
        <Pressable
          onPress={() =>
            router.push({
              pathname: '../Match/Team',
              params: {
                params: JSON.stringify({teamId: state.matchInfo.home_team_id}),
              },
            })
          }>
          <Text className="text-center" type="title">
            {state.matchInfo.home_team_short_name}
          </Text>
        </Pressable>
      </View>
      <View style={{flex: 1}}>
        <Text className="text-center">VS</Text>
      </View>
      <View style={{flex: 3}} className="items-center">
        <Pressable
          onPress={() =>
            router.push({
              pathname: '../Match/Team',
              params: {
                params: JSON.stringify({teamId: state.matchInfo.away_team_id}),
              },
            })
          }>
          <Text className="text-center" type="title">
            {state.matchInfo.away_team_short_name}
          </Text>
        </Pressable>
      </View>
    </Row>
  )
}
