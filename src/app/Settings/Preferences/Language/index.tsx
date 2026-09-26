import LanguageOptions from '@/components/Preferences/LanguageOptions'
import React from 'react'
import {useNavigation} from 'expo-router'
import {useTranslation} from 'react-i18next'

export default function Language() {
  const navigation = useNavigation()
  const {t} = useTranslation()

  React.useEffect(() => {
    navigation.setOptions({title: t('language')})
  }, [t])

  return <LanguageOptions />
}
