import SecurityOptions from '@/components/Preferences/SecurityOptions'
import {useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'

export default function Security() {
  const {t} = useTranslation()
  const navigation = useNavigation()

  React.useEffect(() => {
    navigation.setOptions({title: t('security')})
  }, [t])

  return <SecurityOptions />
}
