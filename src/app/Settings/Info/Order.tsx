import {ScrollView, View} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {useTranslation} from 'react-i18next'
import React from 'react'
import {useNavigation} from "expo-router/react-navigation"

export default function Order() {
  const {t} = useTranslation()
  const navigation = useNavigation()

  React.useEffect(() => {
    navigation.setOptions({
      title: t('order_of_play'),
    })
  }, [])

  return (
    <ScrollView contentContainerStyle={{flexGrow: 1, padding: 16}}>
      <Text className="text-2xl font-bold text-center">
        {t('order_of_play')}
      </Text>
      <View>
        <Text className="text-xl">{t('order_home_team_first')}</Text>
        <Text className="text-xl my-4">{t('order_leading_team')}</Text>
        <Text className="text-xl my-4 font-bold">{t('player_selection')}</Text>
        <Text className="text-xl">{t('player_selection_no_change')}</Text>
        <Text className="text-xl my-4">{t('player_selection_limit')}</Text>
      </View>
    </ScrollView>
  )
}
