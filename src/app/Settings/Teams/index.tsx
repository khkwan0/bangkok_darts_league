import TeamList from '@/components/Teams'
import {useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'

export default function TeamsHome() {
  const navigation = useNavigation()
  const {t} = useTranslation()

  React.useEffect(() => {
    navigation.setOptions({
      title: t('teams'),
    })
  }, [navigation, t])

  return <TeamList />
}
