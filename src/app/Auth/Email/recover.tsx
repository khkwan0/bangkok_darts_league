import Button from '@/components/Button'
import TextInput from '@/components/TextInput'
import {ThemedText as Text} from '@/components/ThemedText'
import {useAccount} from '@/hooks'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native'

export default function Recover() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const [email, setEmail] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [verifying, setVerifying] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [emailSubmitted, setEmailSubmitted] = React.useState(false)
  const [code, setCode] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [passwordConfirm, setPasswordConfirm] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = React.useState(false)
  const {Recover, Verify} = useAccount()
  const fadeAnim = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
  }, [])

  React.useEffect(() => {
    navigation.setOptions({
      title: t('forgot_password'),
    })
  }, [navigation, t])

  async function handleRecover() {
    try {
      setError('')
      setLoading(true)
      if (!email) {
        setError(t('invalid_parameters'))
        return
      }

      const res = await Recover(email)
      if (res?.status === 'ok') {
        setSuccess(true)
        setEmailSubmitted(true)
      } else {
        setError(res?.error ? t(res.error) : t('server_error'))
      }
    } catch (e) {
      setError(t('server_error'))
      console.log(e)
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    setSuccess(false)
    setEmailSubmitted(false)
    setCode('')
    setPassword('')
    setPasswordConfirm('')
    setError('')
  }

  async function handleVerify() {
    try {
      setError('')
      setVerifying(true)
      if (!code || !password || !passwordConfirm) {
        setError(t('invalid_parameters'))
        return
      }

      if (password !== passwordConfirm) {
        setError(t('passwords_do_not_match'))
        return
      }

      const res = await Verify(code, password, passwordConfirm)
      if (res?.status === 'ok') {
        // Handle successful verification - maybe navigate or show success
        navigation.goBack()
      } else {
        setError(res?.error ? t(res.error) : t('server_error'))
      }
    } catch (e) {
      setError(t('server_error'))
      console.log(e)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <ScrollView
        className="flex-1 bg-white dark:bg-gray-900"
        contentContainerStyle={{flexGrow: 1}}>
        <Animated.View style={{opacity: fadeAnim}} className="flex-1 p-6 pt-12">
          {/* Header */}
          <View className="mb-12">
            <Text className="text-center text-gray-600 dark:text-gray-400 text-lg">
              {t('enter_email_for_recovery')}
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View className="bg-red-100 dark:bg-red-900/30 px-6 py-4 rounded-xl mb-6 border border-red-200 dark:border-red-800">
              <Text className="text-red-600 dark:text-red-400 text-center font-medium">
                {error}
              </Text>
            </View>
          ) : null}

          {/* Success Message */}
          {success && emailSubmitted ? (
            <View className="bg-green-100 dark:bg-green-900/30 px-6 py-4 rounded-xl mb-6 border border-green-200 dark:border-green-800">
              <Text className="text-green-600 dark:text-green-400 text-center font-medium">
                {t('check_email_for_code', {email})}
              </Text>
            </View>
          ) : null}

          <View className="space-y-6">
            {/* Email Input */}
            <View>
              <Text className="mb-2 text-gray-700 dark:text-gray-300 font-medium text-base">
                {t('email')}
              </Text>
              <View className="relative">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('email_placeholder')}
                  autoCapitalize="none"
                  autoComplete="email"
                  leftIcon={MaterialCommunityIcons}
                  leftIconProps={{name: 'email-outline'}}
                  iconSize={22}
                  keyboardType="email-address"
                  error={!!error && !email}
                  editable={!success}
                />
              </View>
              {!success ? (
                <Pressable
                  onPress={() => setSuccess(true)}
                  className="items-end py-2">
                  <Text className="text-blue-600 dark:text-blue-400">
                    {t('i_already_have_code')}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* Recover Button */}
            <Button
              onPress={handleRecover}
              disabled={loading || success}
              className={`${
                loading || success
                  ? 'bg-blue-400'
                  : 'bg-blue-600 active:bg-blue-700'
              } py-4 rounded-lg my-6 shadow-lg text-center`}>
              <Text
                style={{
                  color: '#ffffff',
                  textAlign: 'center',
                  fontSize: 18,
                  fontWeight: '600',
                }}>
                {loading ? t('loading') : t('submit')}
              </Text>
            </Button>

            {/* Recovery Code Input */}
            {success ? (
              <>
                {/* Cancel Button */}
                <Pressable
                  onPress={handleCancel}
                  className="items-end py-2 mb-2">
                  <Text className="text-blue-600 dark:text-blue-400">
                    {t('cancel')}
                  </Text>
                </Pressable>

                <View>
                  <Text className="mb-2 text-gray-700 dark:text-gray-300 font-medium text-base">
                    {t('recovery_code')}
                  </Text>
                  <View className="relative">
                    <TextInput
                      value={code}
                      onChangeText={setCode}
                      textContentType="oneTimeCode"
                      autoComplete="one-time-code"
                      placeholder={t('recovery_code_placeholder')}
                      autoCapitalize="none"
                      leftIcon={MaterialCommunityIcons}
                      leftIconProps={{name: 'key-outline'}}
                      iconSize={22}
                      keyboardType="default"
                      error={!!error && !code}
                    />
                  </View>
                </View>

                {/* New Password Input */}
                <View>
                  <Text className="mb-2 text-gray-700 dark:text-gray-300 font-medium text-base">
                    {t('new_password')}
                  </Text>
                  <View className="relative">
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder={t('password_placeholder')}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      leftIcon={MaterialCommunityIcons}
                      leftIconProps={{name: 'lock-outline'}}
                      rightIcon={MaterialCommunityIcons}
                      rightIconProps={{
                        name: showPassword ? 'eye-off-outline' : 'eye-outline',
                      }}
                      onRightIconPress={() => setShowPassword(!showPassword)}
                      iconSize={22}
                      error={!!error && !password}
                    />
                  </View>
                </View>

                {/* Confirm Password Input */}
                <View>
                  <Text className="mb-2 text-gray-700 dark:text-gray-300 font-medium text-base">
                    {t('confirm_password')}
                  </Text>
                  <View className="relative">
                    <TextInput
                      value={passwordConfirm}
                      onChangeText={setPasswordConfirm}
                      placeholder={t('confirm_password_placeholder')}
                      secureTextEntry={!showPasswordConfirm}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      leftIcon={MaterialCommunityIcons}
                      leftIconProps={{name: 'lock-outline'}}
                      rightIcon={MaterialCommunityIcons}
                      rightIconProps={{
                        name: showPasswordConfirm ? 'eye-off-outline' : 'eye-outline',
                      }}
                      onRightIconPress={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      iconSize={22}
                      error={!!error && !passwordConfirm}
                    />
                  </View>
                </View>

                {/* Verify Button */}
                <Button
                  onPress={handleVerify}
                  disabled={verifying}
                  className={`${
                    verifying
                      ? 'bg-blue-400'
                      : 'bg-blue-600 active:bg-blue-700'
                  } py-4 rounded-lg my-6 shadow-lg text-center`}>
                  <Text
                    style={{
                      color: '#ffffff',
                      textAlign: 'center',
                      fontSize: 18,
                      fontWeight: '600',
                    }}>
                    {verifying ? t('loading') : t('verify')}
                  </Text>
                </Button>
              </>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
} 