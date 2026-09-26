import React from 'react'
import {View} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {useNavigation} from 'expo-router'
import {useTranslation} from 'react-i18next'

export default function Colors() {
  const navigation = useNavigation()
  const {t} = useTranslation()

  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: t('colors'),
    })
  }, [])

  return (
    <View>
      <Text>Colors</Text>
    </View>
  )
}
