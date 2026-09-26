import React from 'react'
import {View, Pressable} from 'react-native'
import {ThemedView} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'
import {useNavigation} from "expo-router/react-navigation"
import {useTranslation} from 'react-i18next'
import {router, useLocalSearchParams, usePathname} from 'expo-router'

export default function AddPlayer() {
  const navigation = useNavigation()
  const {t} = useTranslation()
  const [yesIsPressed, setYesIsPressed] = React.useState(false)
  const [noIsPressed, setNoIsPressed] = React.useState(false)
  const pathname = usePathname()

  const {teamIdParams} = useLocalSearchParams()
  const teamId = JSON.parse(teamIdParams as string).teamId

  // Construct return path to Team screen (one level up from AddPlayer)
  const returnPath = pathname.replace('/AddPlayer', '')

  React.useEffect(() => {
    navigation.setOptions({title: t('add_player')})
  }, [])

  return (
    <ThemedView className="flex-1">
      <View className="flex-1 p-5 justify-center items-center">
        <Text className="text-lg text-center mb-8 leading-6">
          {t('player_has_account')}
        </Text>
        <View className="w-full max-w-[300px] space-y-4">
          <Pressable
            onPressIn={() => setYesIsPressed(true)}
            onPressOut={() => setYesIsPressed(false)}
            onPress={() =>
              router.push({
                pathname: './AddPlayer/AddExistingPlayer',
                params: {
                  teamIdParams: JSON.stringify({teamId}),
                  returnPath: returnPath,
                },
              })
            }
            className={`bg-blue-500 p-4 rounded-lg items-center my-4 ${
              yesIsPressed ? 'bg-blue-600' : ''
            }`}>
            <Text className="text-white text-base font-semibold">
              {t('yes')}
            </Text>
          </Pressable>
          <Pressable
            onPressIn={() => setNoIsPressed(true)}
            onPressOut={() => setNoIsPressed(false)}
            onPress={() =>
              router.push({
                pathname: './AddPlayer/AddNewPlayer',
                params: {
                  teamIdParams: JSON.stringify({teamId}),
                  returnPath: returnPath,
                },
              })
            }
            className={`bg-blue-500 p-4 rounded-lg items-center my-4 ${
              noIsPressed ? 'bg-blue-600' : ''
            }`}>
            <Text className="text-white text-base font-semibold">
              {t('no')}
            </Text>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  )
}
