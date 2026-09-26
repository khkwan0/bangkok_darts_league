import ProfileOptions from '@/components/Preferences/ProfileOptions'
import {useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'

export default function Profile() {
  const {t} = useTranslation()
  const navigation = useNavigation()

  React.useEffect(() => {
    navigation.setOptions({title: t('profile')})
  }, [t])

  return <ProfileOptions />
}
