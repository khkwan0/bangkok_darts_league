import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useMatchContext} from '@/context/MatchContext'
import Row from '@/components/Row'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useColorScheme, Pressable} from 'react-native'
import {MatchInfoType} from '../types'
import React from 'react'

export default function FirstBreak({matchInfo}: MatchInfoType) {
  const {state, UpdateFirstBreak}: any = useMatchContext()
  const [loading, setLoading] = React.useState(false)

  function HandleFirstBreak(teamId: number) {
    setLoading(true)
    UpdateFirstBreak(teamId)
  }

  React.useEffect(() => {
    setLoading(false)
  }, [state.firstBreak])

  const theme = useColorScheme()
  const borderColor = theme === 'dark' ? '#aaa' : '#222'

  return (
    <Row>
      <View flex={2} alignItems="center">
        <Pressable
          disabled={state.firstBreak === state.matchInfo.home_team_id}
          onPress={() => HandleFirstBreak(state.matchInfo.home_team_id)}
          style={{alignItems: 'center'}}>
          <Row style={{gap: 10}}>
            <MCI
              name={
                state.firstBreak === state.matchInfo.home_team_id
                  ? 'circle'
                  : 'circle-outline'
              }
              color={borderColor}
              size={20}
            />
            <Text>{loading ? 'updating' : 'first_break'}</Text>
          </Row>
        </Pressable>
      </View>
      <View flex={1} />
      <View flex={2} alignItems="center">
        <Pressable
          disabled={state.firstBreak === state.matchInfo.away_team_id}
          onPress={() => HandleFirstBreak(state.matchInfo.away_team_id)}
          style={{alignItems: 'center'}}>
          <Row style={{gap: 10}}>
            <MCI
              name={
                state.firstBreak === state.matchInfo.away_team_id
                  ? 'circle'
                  : 'circle-outline'
              }
              color={borderColor}
              size={20}
            />
            <Text>{loading ? 'updating' : 'first_break'}</Text>
          </Row>
        </Pressable>
      </View>
    </Row>
  )
}
