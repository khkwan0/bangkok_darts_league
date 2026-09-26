import AppSwitch from '@/components/AppSwitch'
import {ThemedText as Text} from '@/components/ThemedText'
import {useTheme, useNavigation} from "expo-router/react-navigation"
import {useTranslation} from 'react-i18next'
import {
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import i18n from '@/i18n'
import {useEffect, useState} from 'react'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import AntDesign from '@expo/vector-icons/AntDesign'
import {useLeagueContext} from '@/context/LeagueContext'
import {useAccount} from '@/hooks/useAccount'
import Button from '@/components/Button'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import LanguageOption from '@/components/LanguageOption'

export default function Preferences() {
  const {colors} = useTheme()
  const {t} = useTranslation()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isSettingUpEmail, setIsSettingUpEmail] = useState(false)
  const [emailError, setEmailError] = useState('')
  const {state} = useLeagueContext()
  const user = state.user
  const account = useAccount()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showSetupNewPassword, setShowSetupNewPassword] = useState(false)
  const [showSetupConfirmPassword, setShowSetupConfirmPassword] =
    useState(false)
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null)

  useEffect(() => {
    navigation.setOptions({
      title: t('preferences'),
    })
  }, [navigation, t])

  const changeLanguage = async (lang: string) => {
    try {
      await i18n.changeLanguage(lang)
      await AsyncStorage.setItem('language', lang)
      await account.SaveLanguage(lang)
      setCurrentLanguage(lang)
    } catch (error) {
      console.error('Failed to change language:', error)
    }
  }

  useEffect(() => {
    account.SavePreferences(state.user.preferences)
  }, [state.user.preferences])

  useEffect(() => {
    const fetchEmail = async () => {
      const res = await account.GetUserEmailLogin()
      if (res?.status === 'ok' && res?.data?.email) {
        // setEmail(res.data.email)
      }
    }
    fetchEmail()
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

  useEffect(() => {
    const getLanguage = async () => {
      const lang = await AsyncStorage.getItem('language')
      setCurrentLanguage(lang)
    }
    getLanguage()
  }, [])

  return (
    <View className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 20,
          }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          keyboardDismissMode="interactive">
          <View className="p-4">
            {/* Language Section */}
            <LanguageOption
              handleLanguageOption={changeLanguage}
              currentLanguage={currentLanguage}
            />

            {/* Conditional rendering of Notifications and Security sections */}
            {typeof user.id !== 'undefined' && user.id && (
              <>
                {/* Notifications Section */}
                <View className="mb-6">
                  <Text className="text-lg font-semibold mb-4">
                    {t('notifications')}
                  </Text>
                  <View className="bg-gray-800/20 rounded-xl p-4">
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text>{t('push_notifications')}</Text>
                      </View>
                      <View className="flex-row items-center">
                        <MCI
                          name="bell-cancel"
                          size={20}
                          color={colors.primary}
                          style={{marginRight: 8}}
                        />
                        <AppSwitch
                          value={
                            user?.preferences?.enabledPushNotifications ?? true
                          }
                          onValueChange={async val => {
                            await account.SetPushNotifications(val)
                          }}
                        />
                        <MCI
                          name="bell-badge"
                          size={20}
                          color={colors.primary}
                          style={{marginLeft: 8}}
                        />
                      </View>
                    </View>
                    <View className="flex-row items-center justify-between my-4">
                      <View className="flex-row items-center">
                        <Text>{t('sound_notifications')}</Text>
                      </View>
                      <View className="flex-row items-center">
                        <MCI
                          name="sleep"
                          size={20}
                          color={
                            user?.preferences?.soundNotifications
                              ? colors.text + '40'
                              : colors.primary
                          }
                          style={{marginRight: 8}}
                        />
                        <AppSwitch
                          value={user?.preferences?.soundNotifications ?? true}
                          onValueChange={async val => {
                            await account.SetSoundNotifications(val)
                          }}
                          disabled={
                            typeof user?.preferences
                              ?.enabledPushNotifications === 'undefined'
                              ? false
                              : user.preferences.enabledPushNotifications
                                ? false
                                : true
                          }
                        />
                        <AntDesign
                          name="sound"
                          size={20}
                          color={
                            user?.preferences?.soundNotifications
                              ? colors.primary
                              : colors.text + '40'
                          }
                          style={{marginLeft: 8}}
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {/* Security Section */}
                <View>
                  <Text className="text-lg font-semibold mb-4">
                    {t('security')}
                  </Text>
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
                              <Text className="text-sm opacity-60">
                                {t('email')}
                              </Text>
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
                              <Button onPress={handleSaveEmail}>
                                {t('save')}
                              </Button>
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
                                <Text className="text-sm opacity-60">
                                  {t('password')}
                                </Text>
                                <Text>••••••••</Text>
                              </View>
                            </View>
                            <Pressable
                              onPress={() =>
                                setIsChangingPassword(!isChangingPassword)
                              }
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
                                    name={
                                      showCurrentPassword ? 'eye-off' : 'eye'
                                    }
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
                                  onPress={() =>
                                    setShowNewPassword(!showNewPassword)
                                  }
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
                                    name={
                                      showConfirmPassword ? 'eye-off' : 'eye'
                                    }
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
                                <Button onPress={handleChangePassword}>
                                  {t('save')}
                                </Button>
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
                          <Text className="text-base opacity-60">
                            {t('set_up_email')}
                          </Text>
                        </View>
                        <TextInput
                          className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800 text-base h-12"
                          value={newEmail}
                          onChangeText={handleEmailChange}
                          placeholder={t('enter_email')}
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
                            onPress={() =>
                              setShowSetupNewPassword(!showSetupNewPassword)
                            }
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
                              setShowSetupConfirmPassword(
                                !showSetupConfirmPassword,
                              )
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2">
                            <MCI
                              name={
                                showSetupConfirmPassword ? 'eye-off' : 'eye'
                              }
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
                          <Button onPress={handleSetUpEmail}>
                            {t('save')}
                          </Button>
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
                          <Text className="text-base opacity-60">
                            {t('no_email_set')}
                          </Text>
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
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
