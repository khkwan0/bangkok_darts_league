import Interface from '@/components/Preferences/Interface'
import React from 'react'
import {useNavigation} from 'expo-router'
import {useTranslation} from 'react-i18next'

export default function InterfaceScreen() {
  const navigation = useNavigation()
  const {t} = useTranslation()

  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: t('interface'),
    })
  }, [t])
  return <Interface />
}
