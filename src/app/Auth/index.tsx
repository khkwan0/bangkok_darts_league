import {ThemedText as Text} from '@/components/ThemedText'
import {useAccount} from '@/hooks/useAccount'
import {
  AppleButton,
  appleAuth,
} from '@invertase/react-native-apple-authentication'
import {useNavigation} from 'expo-router/react-navigation'
import Line from '@xmartlabs/react-native-line'
import {useLocalSearchParams, useRouter} from 'expo-router'
import React, {useEffect} from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
// import {AccessToken, LoginManager} from 'react-native-fbsdk-next'

import config from '@/config'
import {useLeagueContext} from '@/context/LeagueContext'
import {loadGoogleSignIn} from '@/lib/google-sign-in'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {Platform, useColorScheme} from 'react-native'
interface StatusType {
  status: string
  error?: string
}

/**
 * Google Sign-In on iOS presents ASWebAuthenticationSession. The JS promise
 * resolves while that session is still dismissing. Presenting another
 * controller, or popping this screen, before the session is gone leaves a
 * transparent view over Settings that swallows presses and swipes.
 * The Google SDK waits this long before it will present again.
 */
const IOS_GOOGLE_SESSION_DISMISS_MS = 1000

function waitForIosGoogleSessionDismiss(since = Date.now()): Promise<void> {
  if (Platform.OS !== 'ios') return Promise.resolve()
  const remaining = IOS_GOOGLE_SESSION_DISMISS_MS - (Date.now() - since)
  if (remaining <= 0) return Promise.resolve()
  return new Promise(resolve => {
    setTimeout(resolve, remaining)
  })
}

export default function AuthHome() {
  const router = useRouter()
  const [err, setErr] = React.useState('')
  /** True while finishing SocialLogin with the backend after OAuth returns. */
  const [completingLogin, setCompletingLogin] = React.useState(false)
  const {SocialLogin} = useAccount()
  const {state: leagueState} = useLeagueContext()
  const [disabledLoginButton, setDisabledLoginButton] = React.useState(false)
  const [googleReady, setGoogleReady] = React.useState(false)
  const colorScheme = useColorScheme()
  const width = Dimensions.get('window').width
  const {t} = useTranslation()
  const {from} = useLocalSearchParams()
  const navigation = useNavigation()
  const busy = disabledLoginButton || completingLogin

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

  useEffect(() => {
    let cancelled = false
    const google = loadGoogleSignIn()
    if (!google) return
    const apply = (webClientId: string) => {
      if (cancelled || !webClientId) return
      const iosClientId = String(config.google?.iosClientId || '').trim()
      google.GoogleSignin.configure({
        webClientId,
        ...(iosClientId ? {iosClientId} : {}),
      })
      setGoogleReady(true)
    }
    const fromConfig = String(config.google?.webClientId || '').trim()
    if (fromConfig) {
      Promise.resolve().then(() => apply(fromConfig))
      return () => {
        cancelled = true
      }
    }
    fetch(`${config.apiUrl}/login/google-client`)
      .then(res => res.json())
      .then(json => apply(String(json?.data?.client_id || '').trim()))
      .catch(() => {
        /* button stays hidden until a web client id is available */
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function HandleLineLogin() {
    try {
      setErr('')
      setDisabledLoginButton(true)
      const lineRes = await Line.login({})
      if (typeof lineRes.accessToken !== 'undefined') {
        // OAuth UI is gone — show progress while the server finishes login.
        setCompletingLogin(true)
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
      setCompletingLogin(false)
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
        setCompletingLogin(true)
        const res: StatusType = (await SocialLogin('facebook', data))!
        if (typeof res.status !== 'undefined' && res.status === 'ok') {
          router.back()
        }
      }
    } catch (e) {
      setErr('Unable to Login')
    } finally {
      setCompletingLogin(false)
      setDisabledLoginButton(false)
    }
  }
    */

  async function HandleGoogleSignIn() {
    const google = loadGoogleSignIn()
    if (!google) {
      setErr('Google sign-in needs a new app build.')
      return
    }
    try {
      setErr('')
      setDisabledLoginButton(true)
      if (Platform.OS === 'android') {
        await google.GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        })
      }
      let response
      try {
        response = await google.GoogleSignin.signIn()
      } catch (e) {
        await waitForIosGoogleSessionDismiss()
        throw e
      }
      const signedInAt = Date.now()
      if (google.isCancelledResponse(response)) {
        await waitForIosGoogleSessionDismiss(signedInAt)
        return
      }
      if (!google.isSuccessResponse(response) || !response.data?.idToken) {
        await waitForIosGoogleSessionDismiss(signedInAt)
        setErr('Google did not return an ID token. Try again.')
        return
      }
      setCompletingLogin(true)
      const res: StatusType = (await SocialLogin('google', {
        idToken: response.data.idToken,
      }))!
      await waitForIosGoogleSessionDismiss(signedInAt)
      if (res?.status === 'ok') {
        router.back()
      } else {
        setErr(res?.error || 'Google signed in, but the server rejected the login.')
      }
    } catch (e: unknown) {
      if (google.isErrorWithCode(e)) {
        if (e.code === google.statusCodes.SIGN_IN_CANCELLED) return
        if (
          e.code === 'DEVELOPER_ERROR' ||
          String(e.code) === '10' ||
          /DEVELOPER_ERROR/i.test(e.message || '')
        ) {
          setErr(
            'Google sign-in is not configured for this build. Add the Android SHA-1 in Firebase, and set GOOGLE_IOS_URL_SCHEME plus the iOS client id before the next iOS build.',
          )
          return
        }
      }
      const message = e instanceof Error ? e.message : ''
      setErr(message || 'Unable to sign in with Google.')
    } finally {
      setCompletingLogin(false)
      setDisabledLoginButton(false)
    }
  }

  async function HandleAppleSignIn() {
    try {
      setErr('')
      setDisabledLoginButton(true)

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
        setCompletingLogin(true)
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
      setCompletingLogin(false)
      setDisabledLoginButton(false)
    }
  }

  return (
    <View className="relative flex-1 bg-white dark:bg-gray-900">
      <ScrollView
        className="flex-1"
        contentContainerStyle={completingLogin ? styles.dimmedContent : undefined}
        pointerEvents={busy ? 'none' : 'auto'}>
        <View className="flex-1 justify-center items-center my-16">
          <Image
            source={require('@/assets/logo.png')}
            className="w-32 h-32 mb-8"
            resizeMode="contain"
          />
          <Text type="title" className="text-center text-2xl mb-2">
            {leagueState.leagueName}
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
              disabled={busy}
              onPress={() => HandleLineLogin()}
              className="bg-[#06c755] rounded-[8px] overflow-hidden my-1"
              style={busy ? styles.buttonDisabled : undefined}>
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

            {googleReady ? (
              <Pressable
                disabled={busy}
                onPress={() => HandleGoogleSignIn()}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-[8px] overflow-hidden my-1"
                style={busy ? styles.buttonDisabled : undefined}>
                <View className="flex-row items-center justify-center h-[48px] px-4">
                  <MaterialCommunityIcons
                    name="google"
                    size={24}
                    color="#4285F4"
                    style={{marginRight: 12}}
                  />
                  <Text className="font-medium text-[18px] text-gray-900 dark:text-white">
                    {t('continue_with_google')}
                  </Text>
                </View>
              </Pressable>
            ) : null}

            {/*
          <Pressable
            disabled={busy}
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
              <View
                className="my-1"
                style={busy ? styles.buttonDisabled : undefined}
                pointerEvents={busy ? 'none' : 'auto'}>
                <AppleButton
                  buttonStyle={
                    colorScheme === 'dark'
                      ? AppleButton.Style.WHITE
                      : AppleButton.Style.BLACK
                  }
                  buttonType={AppleButton.Type.SIGN_IN}
                  style={{
                    width: width - 48,
                    height: 48,
                    borderRadius: 12,
                  }}
                  onPress={() => HandleAppleSignIn()}
                />
              </View>
            )}

            <Pressable
              disabled={busy}
              onPress={() =>
                router.push({pathname: '/Auth/Email', params: {from: from}})
              }
              className="bg-gray-100 dark:bg-gray-800 rounded-[8px] overflow-hidden my-1"
              style={busy ? styles.buttonDisabled : undefined}>
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

      {completingLogin ? (
        <View
          className="absolute inset-0 z-10 items-center justify-center px-8"
          style={styles.overlay}
          accessibilityRole="progressbar"
          accessibilityLabel={t('signing_you_in')}>
          <View
            style={[
              styles.card,
              {
                backgroundColor:
                  colorScheme === 'dark' ? '#1f2937' : '#ffffff',
              },
            ]}>
            <ActivityIndicator
              size="large"
              color={colorScheme === 'dark' ? '#fff' : '#111827'}
            />
            <Text
              type="defaultSemiBold"
              className="text-center text-lg mt-4 text-gray-900 dark:text-white">
              {t('signing_you_in')}
            </Text>
            <Text className="text-center text-gray-600 dark:text-gray-400 mt-2">
              {t('signing_you_in_hint')}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 32,
    alignItems: 'center',
  },
  dimmedContent: {
    opacity: 0.55,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
})
