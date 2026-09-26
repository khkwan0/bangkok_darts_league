import {Button, View} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import TextInput from '@/components/TextInput'
import {useTranslation} from 'react-i18next'
import React from 'react'
import {useNavigation} from "expo-router/react-navigation"
import {useRouter} from 'expo-router'
import {useAccount} from '@/hooks/useAccount'
import {useLeagueContext} from '@/context/LeagueContext'

interface ResultType {
  status: string
  error?: string | null
}

export default function DeleteAccount() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const {LogoutUser} = useLeagueContext()
  const [confirm, setConfirm] = React.useState(false)
  const [confirmInput, setConfirmInput] = React.useState('')
  const [deleteSuccess, setDeleteSuccess] = React.useState(false)
  const [err, setErr] = React.useState<string | null | undefined>(null)
  const [loading, setLoading] = React.useState(false)
  const {DeleteAccount} = useAccount()

  React.useEffect(() => {
    navigation.setOptions({
      title: t('delete_account'),
    })
  }, [t])

  const handleDelete = async () => {
    try {
      setErr(null)
      setLoading(true)
      if (
        confirmInput.length === 6 &&
        confirmInput.toLowerCase() === 'delete'
      ) {
        const result: ResultType = await DeleteAccount()
        if (typeof result.status !== 'undefined' && result.status === 'ok') {
          LogoutUser()
          setDeleteSuccess(true)
        } else {
          setErr(result.error ?? 'error_unknown')
        }
      }
    } catch (e) {
      console.error(e)
      setErr('server_error')
    } finally {
      setLoading(false)
    }
  }

  if (deleteSuccess) {
    return (
      <View className="flex-1 justify-center items-center px-10">
        <Text type="title">{t('delete_account_success')}</Text>
        <Button title={t('done')} onPress={() => router.back()} />
      </View>
    )
  }

  return (
    <View className="flex-1 justify-center items-center px-10">
      {confirm ? (
        <>
          <View>
            <Text type="title">{t('confirm_input')}</Text>
            <TextInput
              placeholder={t('type_delete_to_confirm')}
              onChangeText={text => setConfirmInput(text)}
            />
          </View>
          {err && (
            <Text type="subtitle" className="text-red-500">
              {t(err)}
            </Text>
          )}
          <View className="flex-row items-center justify-center gap-2">
            <Button
              disabled={loading}
              title={t('cancel')}
              onPress={() => router.back()}
            />
            <Button
              disabled={loading}
              title={t('delete')}
              onPress={() => handleDelete()}
            />
          </View>
        </>
      ) : (
        <>
          <Text type="title" className="text-center">
            {t('confirm_delete_account')}
          </Text>
          <View className="flex-row items-center justify-center gap-2">
            <Button title={t('cancel')} onPress={() => router.back()} />
            <Button title={t('delete')} onPress={() => setConfirm(true)} />
          </View>
        </>
      )}
    </View>
  )
}
