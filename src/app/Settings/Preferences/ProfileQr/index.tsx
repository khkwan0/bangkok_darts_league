import PlayerProfileQr from '@/components/PlayerProfileQr'
import {useLeagueContext} from '@/context/LeagueContext'
import {useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {ScrollView, View} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'

export default function ProfileQrScreen() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const {state} = useLeagueContext()
  const playerId = state.user?.id

  React.useEffect(() => {
    navigation.setOptions({title: t('my_qr_code')})
  }, [navigation, t])

  if (!playerId) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center opacity-70">{t('not_provided')}</Text>
      </View>
    )
  }

  const name =
    state.user?.nickname ||
    [state.user?.firstname, state.user?.lastname].filter(Boolean).join(' ') ||
    null

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{padding: 16, paddingBottom: 40}}>
      <PlayerProfileQr playerId={playerId} playerName={name} />
    </ScrollView>
  )
}
