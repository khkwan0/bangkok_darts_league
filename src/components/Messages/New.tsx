import React, {useState} from 'react'
import {
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  View as RNView,
} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useTranslation} from 'react-i18next'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import {useAccount} from '@/hooks/useAccount'
import {router, useNavigation} from 'expo-router'
import {useLeagueContext} from '@/context/LeagueContext'

export default function NewMessage({
  recipientId,
  nickname,
}: {
  recipientId: number
  nickname: string
}) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const {t} = useTranslation()
  const navigation = useNavigation()
  const account = useAccount()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const {state} = useLeagueContext()

  React.useEffect(() => {
    navigation.setOptions({
      title: t('send_message'),
    })
  }, [navigation, t])

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert(t('error'), t('message_content') + ' ' + t('is_required'))
      return
    }

    try {
      setSending(true)
      const response = await account.SendMessage(
        state.user.id,
        recipientId,
        title,
        message,
      )

      if (response.status === 'ok') {
        Alert.alert(t('success'), t('message_sent'))
        router.back()
      } else {
        Alert.alert(t('error'), response.message || t('something_went_wrong'))
      }
    } catch (error) {
      console.error(error)
      Alert.alert(t('error'), t('something_went_wrong'))
    } finally {
      setSending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <RNView className="flex-1">
        <ScrollView className="p-4">
          <View
            className={`rounded-xl p-4 mb-4 border ${
              isDark
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}>
            <View className="flex-row mb-4 items-center">
              <Text className="font-bold mr-2">{t('message_to')}:</Text>
              <Text className="flex-1">{nickname}</Text>
            </View>
            <View className="mb-4">
              <TextInput
                placeholder={`${t('message_title')} (${t('optional')})`}
                value={title}
                onChangeText={setTitle}
                style={{marginBottom: 16}}
                autoCapitalize="sentences"
              />
            </View>
            <View className="mb-4">
              <TextInput
                placeholder={t('message_content')}
                value={message}
                onChangeText={setMessage}
                style={{marginBottom: 24, height: 150}}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
            </View>
            <View className="items-center">
              <Button
                onPress={handleSend}
                disabled={sending || !message.trim()}
                style={{minWidth: 120}}>
                {sending ? t('sending') : t('send')}
              </Button>
            </View>
          </View>
        </ScrollView>
      </RNView>
    </KeyboardAvoidingView>
  )
}
