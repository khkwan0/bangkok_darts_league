import {ThemedText as Text} from '@/components/ThemedText'
import {useAccount} from '@/hooks/useAccount'
import {
  AppleButton,
  appleAuth,
} from '@invertase/react-native-apple-authentication'
import {useNavigation} from "expo-router/react-navigation"
import Line from '@xmartlabs/react-native-line'
import { router, useLocalSearchParams } from 'expo-router';
import React, {useEffect} from 'react'
import {useTranslation} from 'react-i18next'
import {Dimensions, Image, Pressable, ScrollView, View} from 'react-native'
// import {AccessToken, LoginManager} from 'react-native-fbsdk-next'

import config from '@/config'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {Platform, useColorScheme} from 'react-native'
interface StatusType {
  status: string
  error?: string
}

export default function AuthHome() {
  const [err, setErr] = React.useState('')
  const [lineSuccess, setLineSuccess] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const {SocialLogin, UserLogin, Logout} = useAccount()
  const [disabledLoginButton, setDisabledLoginButton] = React.useState(false)
  const colorScheme = useColorScheme()
  const width = Dimensions.get('window').width
  const {t} = useTranslation()
  const {from} = useLocalSearchParams()
  const navigation = useNavigation()

  useEffect(() => {
    navigation.setOptions({
      title: t('authorization'),
    })
    Line.setup({
      channelId: config.line.channelId,
    }).catch((e: unknown) => {
      console.log('LINE setup failed', e)
    })
  }, [navigation, t])

  async function HandleLineLogin() {
    try {
      setErr('')
      setDisabledLoginButton(true)
      const lineRes = await Line.login({})
      if (typeof lineRes.accessToken !== 'undefined') {
        setLineSuccess(true)
        const res: StatusType = (await SocialLogin('line', lineRes))!
        if (typeof res?.status !== 'undefined' && res.status === 'ok') {
          router.back()
        } else {
          setErr(
            res?.error
              ? String(res.error)
              : 'LINE signed in, but the server rejected the login. Try again.',
          )
        }
      } else {
        setErr('LINE login did not return an access token. Try again.')
      }
    } catch (e: any) {
      console.log('LINE login error', e)
      const message = String(e?.message || e?.userInfo?.message || '')
      // LINE's native dialog often shows "An unknown error occurred" when the
      // Android package name / SHA-1 fingerprint is not registered for this channel.
      if (/unknown error/i.test(message)) {
        setErr(
          'LINE login failed (Android package / SHA-1 mismatch). Check LINE Developers Console → LINE Login → Android package name com.bangkok_darts_league and both debug + release SHA-1 fingerprints.',
        )
      } else if (
        e?.code === 'LOGIN_CANCELLED' ||
        /cancel/i.test(message)
      ) {
        // User dismissed LINE — no banner needed.
      } else {
        setErr(message || 'Unable to Login with LINE')
      }
    } finally {
      setLoading(false)
      setDisabledLoginButton(false)
    }
  }

  /*
  async function HandleFacebookLogin() {
    try {
      setErr('')
      setDisabledLoginButton(true)
      const result = await LoginManager.logInWithPermissions(['public_profile'])
      if (result.isCancelled) {
        throw new Error('User cancelled login')
      }
      const data = await AccessToken.getCurrentAccessToken()
      if (data) {
        const res: StatusType = (await SocialLogin('facebook', data))!
        if (typeof res.status !== 'undefined' && res.status === 'ok') {
          router.back()
        }
      }
    } catch (e) {
      setErr('Unable to Login')
    } finally {
      setLoading(false)
      setDisabledLoginButton(false)
    }
  }
    */

  async function HandleAppleSignIn() {
    try {
      setErr('')
      setDisabledLoginButton(true)
      setLoading(true)

      // performs login request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        // Note: it appears putting FULL_NAME first is important, see issue #293
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      })

      // get current authentication state for user
      // /!\ This method must be tested on a real device. On the iOS simulator it always throws an error.
      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthRequestResponse.user,
      )

      // use credentialState response to ensure the user is authenticated
      if (credentialState === appleAuth.State.AUTHORIZED) {
        const res: StatusType = (await SocialLogin(
          'apple',
          appleAuthRequestResponse,
        ))!
        if (typeof res?.status !== 'undefined' && res?.status === 'ok') {
          router.back()
        } else {
          if (typeof res?.status !== 'undefined' && res?.status === 'error') {
            setErr(res?.error ?? 'Unable to Login')
          }
        }
      }
    } catch (e: any) {
      console.log('Apple Sign In Error:', e)
      // Handle user cancellation - error code 1001 is ASAuthorizationErrorCanceled
      if (
        e?.code === 1001 ||
        e?.message?.includes('canceled') ||
        e?.message?.includes('cancel')
      ) {
        // User canceled, no error message needed
        return
      }
      // Handle error 1000 - ASAuthorizationErrorUnknown (configuration issue)
      if (e?.code === 1000 || e?.message?.includes('1000')) {
        setErr(
          'Apple Sign In is not properly configured. Please ensure the app is configured in Apple Developer Console with Sign in with Apple capability enabled, and rebuild the app.',
        )
      } else {
        setErr('Unable to sign in with Apple. Please try again.')
      }
    } finally {
      setLoading(false)
      setDisabledLoginButton(false)
    }
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-1 justify-center items-center my-16">
        <Image
          source={require('@/assets/logo.png')}
          className="w-32 h-32 mb-8"
          resizeMode="contain"
        />
        <Text type="title" className="text-center text-2xl mb-2">
          Bangkok Darts League
        </Text>
        <Text className="text-center text-gray-600 dark:text-gray-400 mb-12">
          Sign in to access your account
        </Text>

        {err ? (
          <View className="bg-red-100 dark:bg-red-900/30 px-6 py-4 rounded-xl mb-6 border border-red-200 dark:border-red-800">
            <Text className="text-red-600 dark:text-red-400 text-center font-medium">
              {err}
            </Text>
          </View>
        ) : null}

        <View className="w-full px-6 space-y-4 my-4">
          <Pressable
            disabled={disabledLoginButton}
            onPress={() => HandleLineLogin()}
            className="bg-[#06c755] rounded-[8px] overflow-hidden my-1">
            <View className="flex-row items-center justify-center h-[48px] px-4">
              <Image
                source={require('@/assets/social/line/btn_base.png')}
                className="w-12 h-12"
                style={{marginRight: 12}}
              />
              <Text className="text-white font-medium text-[18px]">
                {t('continue_with_line')}
              </Text>
            </View>
          </Pressable>

          {/*
          <Pressable
            disabled={disabledLoginButton}
            onPress={() => HandleFacebookLogin()}
            className="bg-[#1877f2] rounded-[8px] overflow-hidden my-1">
            <View className="flex-row items-center justify-center h-[48px] px-4">
              <Image
                source={require('@/assets/social/facebook/icon.png')}
                className="w-8 h-8"
                style={{marginRight: 12}}
              />
              <Text className="text-white font-medium text-[18px]">
                {t('continue_with_facebook')}
              </Text>
            </View>
          </Pressable>
          */}
          {Platform.OS !== 'android' && Platform.OS !== 'web' && (
            <View className="my-1">
              <AppleButton
                buttonStyle={
                  colorScheme === 'dark'
                    ? AppleButton.Style.WHITE
                    : AppleButton.Style.BLACK
                }
                buttonType={AppleButton.Type.SIGN_IN}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 12,
                }}
                onPress={() => HandleAppleSignIn()}
              />
            </View>
          )}

          <Pressable
            onPress={() =>
              router.push({pathname: '/Auth/Email', params: {from: from}})
            }
            className="bg-gray-100 dark:bg-gray-800 rounded-[8px] overflow-hidden my-1">
            <View className="flex-row items-center justify-center h-[48px] px-4">
              <MaterialCommunityIcons
                name="email-outline"
                size={24}
                style={{marginRight: 12}}
                color={colorScheme === 'dark' ? '#fff' : '#000'}
              />
              <Text className="font-medium text-[18px] text-gray-900 dark:text-white">
                {t('continue_with_email')}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}
