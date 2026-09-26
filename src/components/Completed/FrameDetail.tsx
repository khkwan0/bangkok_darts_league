import React from 'react'
import Row from '@/components/Row'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {Pressable} from 'react-native'
import {router} from 'expo-router'

export default function FrameDetails(props: any) {
  const {homePlayers, awayPlayers, home_win: homeWin} = props.item

  return (
    <>
      <View className="my-2 px-4" key={'complete_frame_detail' + props.idx}>
        <Row className="items-center">
          <View style={{flex: 1}}>
            {homePlayers.map(
              (player: {nickname: string; playerId: number}, idx: number) => (
                <View key={'home_compelted' + idx}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: './match/player',
                        params: {
                          params: JSON.stringify({
                            playerId: player.playerId,
                          }),
                        },
                      })
                    }>
                    {idx !== 0 && <Text>and</Text>}
                    <Text type="subtitle">{player.nickname}</Text>
                  </Pressable>
                </View>
              ),
            )}
          </View>
          <View style={{flex: 1}} justifyContent="center" alignItems="center">
            {homeWin === 1 && <MCI name="check" size={30} color="green" />}
          </View>
          <View style={{flex: 0.3}} alignItems="center">
            <Text>vs</Text>
          </View>
          <View style={{flex: 1}} justifyContent="center" alignItems="center">
            {homeWin === 0 && <MCI name="check" size={30} color="green" />}
          </View>
          <View style={{flex: 1}} alignItems="flex-end">
            {awayPlayers.map((player: {nickname: string}, idx: number) => (
              <View key={'away_completed' + idx} alignItems="flex-end">
                {idx !== 0 && <Text>and</Text>}
                <Text type="subtitle">{player.nickname}</Text>
              </View>
            ))}
          </View>
        </Row>
      </View>
    </>
  )
}
