import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {useAccount} from '@/hooks'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useTheme} from "expo-router/react-navigation"
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, TextInput, View} from 'react-native'

export default function SecurityOptions() {
  const {colors} = useTheme()
  const {t} = useTranslation()
  const account = useAccount()
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSettingUpEmail, setIsSettingUpEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [showSetupNewPassword, setShowSetupNewPassword] = useState(false)
  const [showSetupConfirmPassword, setShowSetupConfirmPassword] =
    useState(false)
  const {state} = useLeagueContext()
  const user = state.user

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email)
    }
  }, [])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      setEmailError(t('email_required'))
      return false
    }
    if (!emailRegex.test(email)) {
      setEmailError(t('invalid_email'))
      return false
    }
    setEmailError('')
    return true
  }

  const handleEmailChange = (text: string) => {
    setNewEmail(text)
    if (emailError) {
      validateEmail(text)
    }
  }

  const handleSaveEmail = async () => {
    try {
      if (!validateEmail(newEmail)) {
        return
      }
      const res = await account.UpdateEmail(newEmail)
      if (res?.status === 'ok') {
        setEmail(newEmail)
        setIsEditingEmail(false)
        setEmailError('')
      }
    } catch (error) {
      console.error('Failed to update email:', error)
      setEmailError(t('email_update_failed'))
    }
  }

  const handleSetUpEmail = async () => {
    try {
      if (!validateEmail(newEmail)) {
        return
      }
      if (!newPassword || !confirmPassword) {
        setPasswordError(t('all_fields_required'))
        return
      }

      if (newPassword !== confirmPassword) {
        setPasswordError(t('passwords_dont_match'))
        return
      }

      if (newPassword.length < 6) {
        setPasswordError(t('password_too_short'))
        return
      }

      const res = await account.SetUpEmail(
        newEmail,
        newPassword,
        confirmPassword,
      )
      if (res?.status === 'ok') {
        setEmail(newEmail)
        setIsSettingUpEmail(false)
        setNewEmail('')
        setNewPassword('')
        setConfirmPassword('')
        setEmailError('')
        setPasswordError('')
      } else {
        setEmailError(t('email_setup_failed'))
      }
    } catch (error) {
      console.error('Failed to set up email:', error)
      setEmailError(t('email_setup_failed'))
    }
  }

  const handleChangePassword = async () => {
    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordError(t('all_fields_required'))
        return
      }
      if (newPassword !== confirmPassword) {
        setPasswordError(t('passwords_dont_match'))
        return
      }
      if (newPassword.length < 6) {
        setPasswordError(t('password_too_short'))
        return
      }

      const res = await account.UpdatePassword(currentPassword, newPassword)
      if (res?.status === 'ok') {
        setIsChangingPassword(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setPasswordError('')
      } else {
        setPasswordError(t('password_update_failed'))
      }
    } catch (error) {
      console.error('Failed to update password:', error)
      setPasswordError(t('password_update_failed'))
    }
  }

  return (
    <View>
      <Text className="text-lg font-semibold mb-4">{t('security')}</Text>
      <View className="bg-gray-800/20 rounded-xl p-4">
        {email ? (
          <View>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <MCI
                  name="email"
                  size={20}
                  color={colors.primary}
                  style={{marginRight: 8}}
                />
                <View>
                  <Text className="text-sm opacity-60">{t('email')}</Text>
                  <Text>{email}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setIsEditingEmail(!isEditingEmail)}
                className="p-2 rounded-full bg-gray-700/20">
                <MCI
                  name={isEditingEmail ? 'close' : 'pencil'}
                  size={20}
                  color={colors.primary}
                />
              </Pressable>
            </View>
            {isEditingEmail && (
              <View className="space-y-4">
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 mb-4 bg-gray-50 dark:bg-gray-800 text-base h-12"
                  value={newEmail}
                  onChangeText={handleEmailChange}
                  placeholder={t('enter_new_email')}
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={{
                    color: colors.text,
                    textAlignVertical: 'center',
                  }}
                />
                {emailError ? (
                  <Text className="text-red-500 text-sm mb-2">
                    {emailError}
                  </Text>
                ) : null}
                <View className="flex-row gap-2">
                  <Button
                    type="outline"
                    onPress={() => {
                      setIsEditingEmail(false)
                      setNewEmail('')
                    }}>
                    {t('cancel')}
                  </Button>
                  <Button onPress={handleSaveEmail}>{t('save')}</Button>
                </View>
              </View>
            )}
            <View className="mt-4">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <MCI
                    name="lock"
                    size={20}
                    color={colors.primary}
                    style={{marginRight: 8}}
                  />
                  <View>
                    <Text className="text-sm opacity-60">{t('password')}</Text>
                    <Text>••••••••</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setIsChangingPassword(!isChangingPassword)}
                  className="p-2 rounded-full bg-gray-700/20">
                  <MCI
                    name={isChangingPassword ? 'close' : 'pencil'}
                    size={20}
                    color={colors.primary}
                  />
                </Pressable>
              </View>
              {isChangingPassword && (
                <View className="space-y-4">
                  <View className="relative">
                    <TextInput
                      className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800 text-base h-12"
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder={t('enter_current_password')}
                      placeholderTextColor="#666"
                      secureTextEntry={!showCurrentPassword}
                      style={{
                        color: colors.text,
                        textAlignVertical: 'center',
                      }}
                    />
                    <Pressable
                      onPress={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2">
                      <MCI
                        name={showCurrentPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={colors.text}
                      />
                    </Pressable>
                  </View>
                  <View className="relative">
                    <TextInput
                      className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800 text-base h-12"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder={t('enter_new_password')}
                      placeholderTextColor="#666"
                      secureTextEntry={!showNewPassword}
                      style={{
                        color: colors.text,
                        textAlignVertical: 'center',
                      }}
                    />
                    <Pressable
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2">
                      <MCI
                        name={showNewPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={colors.text}
                      />
                    </Pressable>
                  </View>
                  <View className="relative">
                    <TextInput
                      className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800 text-base h-12"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder={t('confirm_new_password')}
                      placeholderTextColor="#666"
                      secureTextEntry={!showConfirmPassword}
                      style={{
                        color: colors.text,
                        textAlignVertical: 'center',
                      }}
                    />
                    <Pressable
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2">
                      <MCI
                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={colors.text}
                      />
                    </Pressable>
                  </View>
                  {/*
                              <View className="relative">
                                <TextInput
                                  className="border border-gray-300 rounded-lg p-3 mb-4 bg-gray-50 dark:bg-gray-800 text-base h-12"
                                  value={confirmPassword}
                                  onChangeText={setConfirmPassword}
                                  placeholder={t('confirm_new_password')}
                                  placeholderTextColor="#666"
                                  secureTextEntry={!showConfirmPassword}
                                  style={{
                                    color: colors.text,
                                    textAlignVertical: 'center',
                                  }}
                                />
                                <Pressable
                                  onPress={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                  }
                                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2">
                                  <MCI
                                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                                    size={20}
                                    color={colors.text}
                                  />
                                </Pressable>
                              </View>
                              */}
                  {passwordError ? (
                    <Text className="text-red-500 text-sm mb-2">
                      {passwordError}
                    </Text>
                  ) : null}
                  <View className="flex-row gap-2">
                    <Button
                      type="outline"
                      onPress={() => {
                        setIsChangingPassword(false)
                        setCurrentPassword('')
                        setNewPassword('')
                        setConfirmPassword('')
                      }}>
                      {t('cancel')}
                    </Button>
                    <Button onPress={handleChangePassword}>{t('save')}</Button>
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : isSettingUpEmail ? (
          <View className="space-y-4">
            <View className="flex-row items-center mb-2">
              <MCI
                name="email-plus"
                size={20}
                color={colors.primary}
                style={{marginRight: 8}}
              />
              <Text className="text-base opacity-60">{t('set_up_email')}</Text>
            </View>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800 text-base h-12"
              value={newEmail}
              onChangeText={handleEmailChange}
              placeholder={t('enter_email')}
              placeholderTextColor="#666"
              autoCapitalize="none"
              keyboardType="email-address"
              style={{color: colors.text, textAlignVertical: 'center'}}
            />
            {emailError ? (
              <Text className="text-red-500 text-sm mb-2">{emailError}</Text>
            ) : null}
            <View className="relative">
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800 text-base h-12"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t('enter_password')}
                placeholderTextColor="#666"
                secureTextEntry={!showSetupNewPassword}
                style={{
                  color: colors.text,
                  textAlignVertical: 'center',
                  paddingRight: 40,
                }}
              />
              <Pressable
                onPress={() => setShowSetupNewPassword(!showSetupNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2">
                <MCI
                  name={showSetupNewPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.text}
                />
              </Pressable>
            </View>
            <View className="relative">
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800 text-base h-12"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('confirm_password')}
                placeholderTextColor="#666"
                secureTextEntry={!showSetupConfirmPassword}
                style={{
                  color: colors.text,
                  textAlignVertical: 'center',
                  paddingRight: 40,
                }}
              />
              <Pressable
                onPress={() =>
                  setShowSetupConfirmPassword(!showSetupConfirmPassword)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2">
                <MCI
                  name={showSetupConfirmPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.text}
                />
              </Pressable>
            </View>
            <View className="flex-row gap-2">
              <Button
                type="outline"
                onPress={() => {
                  setIsSettingUpEmail(false)
                  setNewEmail('')
                  setNewPassword('')
                }}>
                {t('cancel')}
              </Button>
              <Button onPress={handleSetUpEmail}>{t('save')}</Button>
            </View>
          </View>
        ) : (
          <View className="space-y-4">
            <View className="flex-row items-center">
              <MCI
                name="email-outline"
                size={20}
                color={colors.primary}
                style={{marginRight: 8}}
              />
              <Text className="text-base opacity-60">{t('no_email_set')}</Text>
            </View>
            <Button
              onPress={() => setIsSettingUpEmail(true)}
              className="bg-blue-600 active:bg-blue-700 p-4 rounded-lg flex-row items-center justify-center gap-2"
              style={{
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.2,
                shadowRadius: 2,
              }}>
              <MCI name="email-plus" size={20} color="white" />
              <Text className="text-white text-base font-medium">
                {t('set_up_email')}
              </Text>
            </Button>
          </View>
        )}
      </View>
    </View>
  )
}
