import React from 'react'
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
      <View className="flex-row items-center mt-10">
        <View flex={2}>
          <Text bold fontSize="xl" textAlign="center">
            {props.matchData[0].homeTeam.name}
          </Text>
        </View>
        <View flex={1}>
          <Text textAlign="center">vs</Text>
        </View>
        <View flex={2}>
          <Text bold fontSize="xl" textAlign="center">
            {props.matchData[0].awayTeam.name}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center mt-10">
        <View flex={1}>
          <Text textAlign="center" fontSize="xxxl" bold>
            {home_frames}
          </Text>
        </View>
        <View flex={1} />
        <View flex={1}>
          <Text textAlign="center" fontSize="xxxl" bold>
            {away_frames}
          </Text>
        </View>
      </View>
    </>
  )
}

export default MatchHeader
