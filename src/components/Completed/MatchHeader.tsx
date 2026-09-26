import Row from '@/components/Row'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'

const MatchHeader = props => {
  let home_frames = 0
  let away_frames = 0

  props.matchData.forEach(frame => {
    if (frame.home_win === 1) {
      home_frames++
    } else {
      away_frames++
    }
  })

  return (
    <>
      <Row className="items-center mt-4">
        <View style={{flex: 2}}>
          <Text type="subtitle" style={{textAlign: 'center'}}>
            {props.matchData[0].homeTeam.name}
          </Text>
        </View>
        <View style={{flex: 1}}>
          <Text type="default" style={{textAlign: 'center'}}>
            vs
          </Text>
        </View>
        <View style={{flex: 2}}>
          <Text type="subtitle" style={{textAlign: 'center'}}>
            {props.matchData[0].awayTeam.name}
          </Text>
        </View>
      </Row>
      <Row className="mt-4 items-center">
        <View style={{flex: 2}}>
          <Text type="title" style={{textAlign: 'center'}}>
            {home_frames.toString()}
          </Text>
        </View>
        <View style={{flex: 1}} />
        <View style={{flex: 2}}>
          <Text type="title" style={{textAlign: 'center'}}>
            {away_frames.toString()}
          </Text>
        </View>
      </Row>
    </>
  )
}

export default MatchHeader
