import HighlightsExplorer from '@/components/Statistics/Highlights'
import {useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'

export default function HighlightsScreen() {
  const navigation = useNavigation()
  const {t} = useTranslation()

  React.useEffect(() => {
    navigation.setOptions({
      title: t('highlights'),
      headerBackTitle: t('back'),
    })
  }, [navigation, t])

  return <HighlightsExplorer />
}
