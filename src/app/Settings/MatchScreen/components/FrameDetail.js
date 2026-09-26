import React from 'react'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useTheme} from "expo-router/react-navigation"

const FrameDetails = props => {
  const {homePlayers, awayPlayers} = props.item.item
  const homeWin = props.item.item.home_win
  const {colors} = useTheme()

  return (
    <>
      <View my={10} px={20} key={'complete_frame_detail' + props.idx}>
        <View className="flex-row items-center">
          <View flex={1}>
            {homePlayers.map((player, idx) => (
              <View key={'home_compelted' + idx}>
                {idx !== 0 && <Text>and</Text>}
                <Text bold>{player.nickname}</Text>
              </View>
            ))}
          </View>
          <View flex={1} justifyContent="center" alignItems="center">
            {homeWin === 1 && <MCI name="check" size={30} color="green" />}
          </View>
          <View flex={0.3} alignItems="center">
            <Text>vs</Text>
          </View>
          <View flex={1} justifyContent="center" alignItems="center">
            {homeWin === 0 && <MCI name="check" size={30} color="green" />}
          </View>
          <View flex={1} alignItems="flex-end">
            {awayPlayers.map((player, idx) => (
              <View key={'away_completed' + idx} alignItems="flex-end">
                {idx !== 0 && <Text>and</Text>}
                <Text bold>{player.nickname}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </>
  )
}

export default FrameDetails
