import {LeagueProvider} from '@/context/LeagueContext'
import {MatchProvider} from '@/context/MatchContext'
import OTAUpdatePrompt from '@/components/OTAUpdatePrompt'
import {SystemNavigationBar} from '@/components/SystemNavigationBar'
import '@/i18n'
import {ensureAppWideChannel} from '@/lib/notifications'
import {BottomSheetModalProvider} from '@expo/ui/community/bottom-sheet'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  onNotificationOpenedApp,
  requestPermission,
} from '@react-native-firebase/messaging'
import {DarkTheme, DefaultTheme, ThemeProvider} from "expo-router/react-navigation"
import * as Sentry from '@sentry/react-native'
import {useFonts} from 'expo-font'
import * as Notifications from 'expo-notifications'
import {router, Stack} from 'expo-router'
import {useEffect} from 'react'
import {useTranslation} from 'react-i18next'
import {
  Appearance,
  Linking,
  PermissionsAndroid,
  Platform,
  useColorScheme,
} from 'react-native'
import {GestureHandlerRootView} from 'react-native-gesture-handler'
import {SafeAreaProvider} from 'react-native-safe-area-context'
import '../../global.css'

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN

const sentryIntegrations: Parameters<typeof Sentry.init>[0]['integrations'] =
  [Sentry.feedbackIntegration()]
if (!__DEV__ && sentryDsn) {
  sentryIntegrations.unshift(Sentry.mobileReplayIntegration())
}

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: true,
    enableLogs: true,
    // replaysSessionSampleRate: __DEV__ ? 0 : 0.1,
    // replaysOnErrorSampleRate: __DEV__ ? 0 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    integrations: sentryIntegrations,
  })
}

function RootLayout() {
  const {t} = useTranslation()
  const colorScheme = useColorScheme()
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  async function RequestUserPermission() {
    if (Platform.OS === 'ios') {
      const messaging = getMessaging()
      const authStatus = await requestPermission(messaging)
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        AuthorizationStatus.PROVISIONAL
      if (enabled) {
        console.log('Authorization status: ', authStatus)
      }
      await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      })
    } else if (Platform.OS === 'android') {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      )
      await Notifications.requestPermissionsAsync()
    }
  }

  useEffect(() => {
    RequestUserPermission()
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'web') {
      ;(async () => {
        const savedColorScheme = await AsyncStorage.getItem('theme')
        if (savedColorScheme === 'light' || savedColorScheme === 'dark') {
          Appearance.setColorScheme(savedColorScheme)
        }
      })()
    }
  }, [])

  async function CreateChannel() {
    await ensureAppWideChannel()
  }

  useEffect(() => {
    CreateChannel()
  }, [])

  // Handle notification taps
  useEffect(() => {
    if (Platform.OS !== 'web') {
      const messagingInstance = getMessaging()

      // Note: onMessage handler is handled in (tabs)/_layout.tsx to have access to context

      // Handle notification taps when app is in background/foreground
      const unsubscribe = onNotificationOpenedApp(
        messagingInstance,
        remoteMessage => {
          // console.log('Notification opened app (background/foreground):', JSON.stringify(remoteMessage, null, 2))

          // Check for threadId first - if it exists, navigate to message thread
          const senderId = remoteMessage?.data?.senderId || null
          if (senderId) {
            //console.log('Found threadId, navigating to message thread')
            // Add small delay to ensure router is ready
            setTimeout(() => {
              handleNotificationNavigation(remoteMessage)
            }, 500)
          } else {
            // No threadId, check for link URL
            const url = remoteMessage.data?.link
            if (url) {
              // console.log('No threadId, opening link:', url)
              Linking.openURL(url as string)
            } else {
              // console.log('No threadId or link, attempting navigation anyway')
              setTimeout(() => {
                handleNotificationNavigation(remoteMessage)
              }, 500)
            }
          }
        },
      )

      // Check if app was opened from a notification (quit state)
      getInitialNotification(messagingInstance)
        .then(remoteMessage => {
          // console.log('Initial notification (quit state):', JSON.stringify(remoteMessage, null, 2))
          if (remoteMessage) {
            // Check for threadId first - if it exists, navigate to message thread
            const senderId = remoteMessage?.data?.senderId || null
            if (senderId) {
              // console.log('Found threadId in initial notification, navigating to message thread')
              // Add delay to ensure router and app are fully initialized
              setTimeout(() => {
                handleNotificationNavigation(remoteMessage)
              }, 1000)
            } else {
              // No threadId, check for link URL
              const url = remoteMessage.data?.link
              if (url) {
                // console.log('No threadId in initial notification, opening link:', url)
                Linking.openURL(url as string)
              } else {
                // console.log('No threadId or link in initial notification, attempting navigation anyway')
                setTimeout(() => {
                  handleNotificationNavigation(remoteMessage)
                }, 1000)
              }
            }
          }
        })
        .catch(error => {
          console.error('Error getting initial notification:', error)
        })

      return unsubscribe
    }
  }, [])

  function handleNotificationNavigation(remoteMessage: any) {
    // Check if user is logged in by checking AsyncStorage for jwt
    AsyncStorage.getItem('jwt')
      .then(jwt => {
        if (!jwt) {
          return
        }

        try {
          // Extract sender name from notification
          const fromPlayerId = parseInt(
            remoteMessage?.data?.senderId || '0',
            10,
          )
          const senderName =
            remoteMessage?.data?.senderName ||
            remoteMessage?.notification?.title ||
            ''

          if (fromPlayerId) {
            // First navigate to messages tab to ensure it's in the stack
            // This ensures the messages list screen is in the navigation stack
            router.push('/messages' as any)

            // Then navigate to the specific thread after a short delay
            // This ensures the messages tab is mounted and the stack is properly set up
            setTimeout(() => {
              router.push({
                pathname: `/messages/${fromPlayerId}` as any,
                params: {from: senderName || fromPlayerId.toString()},
              })
            }, 200)
          } else {
            console.warn(
              'No threadId found in notification data. Available data:',
              remoteMessage?.data,
            )
            console.warn('Full notification object:', remoteMessage)
          }
        } catch (error) {
          console.error('Error handling notification navigation:', error)
        }
      })
      .catch(error => {
        console.error('Error checking jwt:', error)
      })
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <ThemeProvider
            value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <SystemNavigationBar />
            <LeagueProvider>
              <MatchProvider>
                <OTAUpdatePrompt />
                <Stack>
                  <Stack.Screen
                    name="(tabs)"
                    options={{
                      headerTitle: t('bangkok_darts_league'),
                      headerShown: false,
                    }}
                  />
                </Stack>
              </MatchProvider>
            </LeagueProvider>
          </ThemeProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout
