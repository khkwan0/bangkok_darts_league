import HabitsPanel from '@/components/habits/HabitsPanel'
import {useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'

export default function WeekliesScreen() {
  const {t} = useTranslation()
  const navigation = useNavigation()

  React.useEffect(() => {
    navigation.setOptions({
      title: t('weeklies'),
      headerBackTitle: t('back'),
    })
  }, [navigation, t])

  return <HabitsPanel />
}
