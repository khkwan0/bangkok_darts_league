import {useAccount} from '@/hooks'
import {useEffect, useRef} from 'react'
import {useTranslation} from 'react-i18next'
import {
  Alert,
  AppState,
  type AppStateStatus,
  Linking,
  Platform,
} from 'react-native'

const STORE_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/bangkok-darts-league'
    : 'https://play.google.com/store/apps/details?id=com.bangkok_darts_league'

/**
 * Checks for a newer App Store / Play Store binary on launch and when
 * returning to foreground (same cadence as OTAUpdatePrompt). Shows a
 * dismissable alert above the native tab bar.
 *
 * Cold-start check waits until `enabled` (after welcome gate / skip).
 */
export default function StoreUpdatePrompt({enabled = true}: {enabled?: boolean}) {
  const {t} = useTranslation()
  const account = useAccount()
  const busyRef = useRef(false)
  const dismissedRef = useRef(false)
  const promptingRef = useRef(false)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const checkVersionRef = useRef(account.CheckVersion)
  checkVersionRef.current = account.CheckVersion

  useEffect(() => {
    if (!enabled) return
    if (Platform.OS === 'web' || __DEV__) return

    async function openStore() {
      try {
        const supported = await Linking.canOpenURL(STORE_URL)
        if (supported) {
          await Linking.openURL(STORE_URL)
        }
      } catch {
        // Ignore store open failures.
      }
    }

    async function runCheck() {
      if (busyRef.current || dismissedRef.current || promptingRef.current) {
        return
      }
      busyRef.current = true
      try {
        const needsUpdate = await checkVersionRef.current()
        if (!needsUpdate || dismissedRef.current || promptingRef.current) {
          return
        }

        promptingRef.current = true
        Alert.alert(
          t('store_update_title'),
          t('store_update_message'),
          [
            {
              text: t('ota_later'),
              style: 'cancel',
              onPress: () => {
                dismissedRef.current = true
                promptingRef.current = false
                busyRef.current = false
              },
            },
            {
              text: t('store_update_now'),
              onPress: () => {
                promptingRef.current = false
                busyRef.current = false
                void openStore()
              },
            },
          ],
          {cancelable: false},
        )
      } catch {
        // Ignore version check failures.
      } finally {
        if (!promptingRef.current) {
          busyRef.current = false
        }
      }
    }

    runCheck()

    const sub = AppState.addEventListener('change', nextState => {
      const wasBackground = appStateRef.current === 'background'
      appStateRef.current = nextState
      // Only re-check after a real backgrounding. Treating `inactive` as
      // background re-fires on iOS when Alerts appear (double prompt).
      if (wasBackground && nextState === 'active') {
        runCheck()
      }
    })

    return () => sub.remove()
  }, [t, enabled])

  return null
}
