import CompletedMatchesOther from '@/components/Completed/CompletedMatchesOther'
import React from 'react'
import {useNavigation} from 'expo-router'
import {useTranslation} from 'react-i18next'

export default function CompletedAll() {
  const navigation = useNavigation()
  const {t} = useTranslation()

  React.useEffect(() => {
    navigation.setOptions({
      title: t('completed_all'),
    })
  }, [])
  return <CompletedMatchesOther />
}
