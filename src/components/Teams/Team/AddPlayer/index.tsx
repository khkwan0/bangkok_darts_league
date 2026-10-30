import React from 'react'
import {View, Pressable} from 'react-native'
import {ThemedView} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'
import {useNavigation} from 'expo-router/react-navigation'
import {useTranslation} from 'react-i18next'
import {router, useLocalSearchParams, usePathname} from 'expo-router'

type AddPlayerChild = 'AddExistingPlayer' | 'AddNewPlayer' | 'ScanPlayerQr'

export default function AddPlayer() {
  const navigation = useNavigation()
  const {t} = useTranslation()
  const [yesIsPressed, setYesIsPressed] = React.useState(false)
  const [noIsPressed, setNoIsPressed] = React.useState(false)
  const [scanIsPressed, setScanIsPressed] = React.useState(false)
  const pathname = usePathname()

  const {teamIdParams} = useLocalSearchParams()
  const teamId = JSON.parse(teamIdParams as string).teamId

  // Construct return path to Team screen (one level up from AddPlayer)
  const returnPath = pathname.replace(/\/AddPlayer\/?$/, '') || pathname

  function pushChild(child: AddPlayerChild) {
    const base = pathname.replace(/\/$/, '')
    router.push({
      pathname: `${base}/${child}` as any,
      params: {
        teamIdParams: JSON.stringify({teamId}),
        returnPath,
      },
    })
  }

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
            onPress={() => pushChild('AddExistingPlayer')}
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
            onPress={() => pushChild('AddNewPlayer')}
            className={`bg-blue-500 p-4 rounded-lg items-center my-4 ${
              noIsPressed ? 'bg-blue-600' : ''
            }`}>
            <Text className="text-white text-base font-semibold">
              {t('no')}
            </Text>
          </Pressable>
          <Pressable
            onPressIn={() => setScanIsPressed(true)}
            onPressOut={() => setScanIsPressed(false)}
            onPress={() => pushChild('ScanPlayerQr')}
            className={`bg-emerald-600 p-4 rounded-lg items-center my-4 ${
              scanIsPressed ? 'bg-emerald-700' : ''
            }`}>
            <Text className="text-white text-base font-semibold">
              {t('scan_player_qr')}
            </Text>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  )
}
