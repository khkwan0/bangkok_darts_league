import {ThemedView as View} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'
import {useMatchContext} from '@/context/MatchContext'
import Row from '@/components/Row'

export default function Score() {
  const {state}: any = useMatchContext()

  let homeScore = 0
  let awayScore = 0
  state.frameData.forEach(frame => {
    if (frame.winner === state.matchInfo.home_team_id) {
      homeScore++
    }
    if (frame.winner === state.matchInfo.away_team_id) {
      awayScore++
    }
  })

  return (
    <Row>
      <View flex={2}>
        <Text className="text-center" type="title">
          {homeScore}
        </Text>
      </View>
      <View flex={1} />
      <View flex={2}>
        <Text className="text-center" type="title">
          {awayScore}
        </Text>
      </View>
    </Row>
  )
}
