import React, {useState} from 'react'
import {Image, View, Pressable, Modal} from 'react-native'
import {ThemedView} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'
import config from '@/config'
import Button from '@/components/Button'
import {t} from 'i18next'

interface PlayerCardProps {
  player: {
    id: number
    nickname: string
    firstname: string
    lastname: string
    profile_picture: string
  }
  handlePress: (playerId: number) => void
}

export default function PlayerCard(props: PlayerCardProps) {
  const [isModalVisible, setIsModalVisible] = useState(false)

  return (
    <ThemedView className="p-4 m-2 border dark:border-gray-300 border-gray-700 rounded-md">
      <View className="flex-row justify-between">
        <View className="flex-row items-center gap-4">
          <View>
            <Text>{props.player.nickname}</Text>
            <Text>
              {props.player.firstname}{' '}
              {props.player.lastname.length > 0 ? props.player.lastname[0] : ''}
            </Text>
            <Text>ID: {props.player.id}</Text>
          </View>
          <View>
            <Pressable onPress={() => setIsModalVisible(true)}>
              <Image
                source={{uri: config.profileUrl + props.player.profile_picture}}
                className="w-10 h-10 rounded-full"
                resizeMode="contain"
                style={{borderRadius: 50}}
              />
            </Pressable>
          </View>
        </View>
        <View>
          <Button onPress={() => props.handlePress(props.player.id)}>{t('add')}</Button>
        </View>
      </View>

      <Modal
        visible={isModalVisible}
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}>
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setIsModalVisible(false)}>
          <Image
            source={{uri: config.profileUrl + props.player.profile_picture}}
            className="w-80 h-80 rounded-lg"
            resizeMode="contain"
          />
        </Pressable>
      </Modal>
    </ThemedView>
  )
}
