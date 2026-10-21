import TimezoneOptions from '@/components/Preferences/TimezoneOptions'
import React from 'react'
import {useNavigation} from 'expo-router'
import {useTranslation} from 'react-i18next'

export default function Timezone() {
  const navigation = useNavigation()
  const {t} = useTranslation()

  React.useEffect(() => {
    navigation.setOptions({title: t('timezone_settings')})
  }, [t, navigation])

  return <TimezoneOptions />
}
