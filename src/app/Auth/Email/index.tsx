import Button from '@/components/Button'
import TextInput from '@/components/TextInput'
import {ThemedText as Text} from '@/components/ThemedText'
import {useAccount} from '@/hooks/useAccount'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {useNavigation} from "expo-router/react-navigation"
import {router, useLocalSearchParams} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native'

export default function Email() {
  const {t} = useTranslation()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const {UserLogin} = useAccount()
  const {from} = useLocalSearchParams()
  const navigation = useNavigation()

  React.useEffect(() => {
    navigation.setOptions({
      title: t('email_login'),
    })
  }, [navigation, t])

  async function handleLogin() {
    setError('')
    setLoading(true)

    try {
      if (!email || !password) {
        setError(t('invalid_parameters'))
        return
      }

      // Add email validation like in register
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError(t('invalid_email'))
        return
      }

      const res = await UserLogin(email, password)
      if (res?.status === 'ok') {
        if (from) {
          router.dismissTo(from)
        } else {
          router.dismissTo('/')
        }
      } else {
        setError(t('invalid_creds'))
      }
    } catch (e) {
      setError(t('server_error'))
      console.log(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <ScrollView className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-1 p-6">
          {/* Header */}
          <View className="mb-8">
            <Text type="title" className="text-center text-3xl mb-2">
              {t('login')}
            </Text>
            <Text className="text-center text-gray-600 dark:text-gray-400">
              {t('sign_in_to_access')}
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View className="mb-4">
              <View className="flex-row items-center space-x-2">
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={24}
                  color="#EF4444"
                />
                <Text className="text-red-500 flex-1">{error}</Text>
              </View>
            </View>
          ) : null}

          <View className="space-y-8">
            {/* Email Input */}
            <View className="my-6">
              <Text className="mb-2 text-gray-700 dark:text-gray-300">
                {t('email')}
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('email_placeholder')}
                importantForAutofill="yes"
                returnKeyType="next"
                autoCapitalize="none"
                autoComplete="username"
                textContentType={
                  Platform.OS === 'ios' ? 'username' : 'emailAddress'
                }
                keyboardType="email-address"
                leftIcon={MaterialCommunityIcons}
                leftIconProps={{name: 'email-outline'}}
                iconSize={22}
                error={!!error && !email}
                containerStyle={{
                  borderRadius: 8,
                }}
                inputStyle={{
                  borderWidth: 0,
                  height: 48,
                  paddingLeft: 44,
                }}
              />
            </View>

            {/* Password Input */}
            <View className="my-6">
              <Text className="mb-2 text-gray-700 dark:text-gray-300">
                {t('password')}
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('password_placeholder')}
                secureTextEntry={!showPassword}
                textContentType="password"
                autoCapitalize="none"
                autoComplete="current-password"
                importantForAutofill="yes"
                returnKeyType="done"
                leftIcon={MaterialCommunityIcons}
                leftIconProps={{name: 'lock-outline'}}
                rightIcon={MaterialCommunityIcons}
                rightIconProps={{
                  name: showPassword ? 'eye-off-outline' : 'eye-outline',
                }}
                onRightIconPress={() => setShowPassword(!showPassword)}
                iconSize={22}
                error={!!error && !password}
                containerStyle={{
                  borderRadius: 8,
                }}
                inputStyle={{
                  borderWidth: 0,
                  height: 48,
                  paddingLeft: 44,
                  paddingRight: 44,
                }}
              />
            </View>

            {/* Forgot Password Link */}
            <Pressable
              onPress={() => router.push({pathname: '/Auth/Email/recover'})}
              className="items-end py-2">
              <Text className="text-blue-600 dark:text-blue-400">
                {t('forgot_password')}
              </Text>
            </Pressable>

            {/* Login Button */}
            <Button
              onPress={handleLogin}
              disabled={loading}
              className="bg-blue-600 active:bg-blue-700 py-4 rounded-lg items-center mt-4">
              <Text className="text-white text-center text-lg font-semibold">
                {loading ? t('loading') : t('login')}
              </Text>
            </Button>

            {/* Register Link */}
            <Pressable
              onPress={() =>
                router.push('./Register', {relativeToDirectory: true})
              }
              className="items-center py-4">
              <Text className="text-blue-600 dark:text-blue-400">
                {t('dont_have_account')}{' '}
                <Text className="font-semibold">{t('register')}</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
