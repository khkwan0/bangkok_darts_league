import React from 'react'
import {ThemedView as View} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'
import {useTranslation} from 'react-i18next'
import Button from '@/components/Button'
import {useRouter} from 'expo-router'
import {useAccount} from '@/hooks/useAccount'

export default function RegisterSuccess() {
  const {t} = useTranslation()
  const router = useRouter()
  const account = useAccount()

  React.useEffect(() => {
    async function fetchUser() {
      const user = await account.FetchUser()
      console.log(user)
    }
    fetchUser()
  }, [])

  return (
    <View className="flex-1 items-center justify-center px-4">
      <View style={{flex: 1}} />
      <View style={{flex: 2}}>
        <View>
          <Text type="title" className="text-center">
            {t('email_registration_success')}
          </Text>
        </View>
        <View className="mt-4">
          <Button onPress={() => router.dismissAll()}>{t('continue')}</Button>
        </View>
      </View>
      <View style={{flex: 1}} />
    </View>
  )
}
