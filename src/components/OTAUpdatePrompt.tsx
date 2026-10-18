import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import * as Updates from 'expo-updates'
import {useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  Modal,
  Platform,
} from 'react-native'

function manifestId(manifest: unknown): string {
  if (
    typeof manifest === 'object' &&
    manifest &&
    'id' in manifest &&
    (manifest as {id?: unknown}).id != null
  ) {
    return String((manifest as {id: unknown}).id)
  }
  return ''
}

function reloadWithSettledUI() {
  // iOS can hang if reloadAsync runs during an Alert/AppState transition.
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      Updates.reloadAsync().then(() => resolve()).catch(reject)
    }, 350)
  })
}

/**
 * Checks for OTA updates on launch and when returning to foreground.
 * Downloads with a visible modal, then either prompts to restart or
 * auto-reloads when user preference ota_auto_reload is enabled (default on).
 *
 * Requires updates.checkAutomatically: 'NEVER' so native ON_LOAD does not
 * race these JS API calls (known iOS hang on fresh install).
 */
export default function OTAUpdatePrompt() {
  const {t} = useTranslation()
  const {state} = useLeagueContext()
  const [downloading, setDownloading] = useState(false)
  const busyRef = useRef(false)
  const dismissedUpdateIdRef = useRef<string | null>(null)
  const handledUpdateIdRef = useRef<string | null>(null)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const autoReloadRef = useRef(
    state.user?.preferences?.ota_auto_reload !== false,
  )

  useEffect(() => {
    autoReloadRef.current =
      state.user?.preferences?.ota_auto_reload !== false
  }, [state.user?.preferences?.ota_auto_reload])

  useEffect(() => {
    if (Platform.OS === 'web' || __DEV__ || !Updates.isEnabled) {
      return
    }

    async function runCheck() {
      if (busyRef.current) return
      busyRef.current = true
      let holdBusy = false
      try {
        const result = await Updates.checkForUpdateAsync()
        if (!result.isAvailable) return

        const updateId = manifestId(result.manifest)

        if (
          updateId &&
          (dismissedUpdateIdRef.current === updateId ||
            handledUpdateIdRef.current === updateId)
        ) {
          return
        }

        if (updateId) {
          handledUpdateIdRef.current = updateId
        }

        const autoReload = autoReloadRef.current

        if (!autoReload) {
          setDownloading(true)
        }
        const fetched = await Updates.fetchUpdateAsync()
        if (!autoReload) {
          setDownloading(false)
        }

        if (!fetched.isNew) return

        if (autoReload) {
          holdBusy = true
          await reloadWithSettledUI()
          return
        }

        holdBusy = true
        Alert.alert(
          t('ota_update_ready_title'),
          t('ota_update_ready_message'),
          [
            {
              text: t('ota_later'),
              style: 'cancel',
              onPress: () => {
                if (updateId) dismissedUpdateIdRef.current = updateId
                busyRef.current = false
              },
            },
            {
              text: t('ota_restart'),
              onPress: () => {
                reloadWithSettledUI().catch(() => {
                  busyRef.current = false
                  Alert.alert(
                    t('ota_update_failed_title'),
                    t('ota_update_failed_message'),
                  )
                })
              },
            },
          ],
          {cancelable: false},
        )
      } catch {
        setDownloading(false)
        handledUpdateIdRef.current = null
      } finally {
        if (!holdBusy) {
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
  }, [t])

  if (!downloading) return null

  return (
    <Modal animationType="fade" transparent visible>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}>
        <View className="p-6 rounded-lg bg-white dark:bg-gray-800 w-4/5 items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text type="defaultSemiBold" className="text-lg mt-4 mb-1 text-center">
            {t('ota_downloading_title')}
          </Text>
          <Text className="text-center text-gray-600 dark:text-gray-300">
            {t('ota_downloading_message')}
          </Text>
        </View>
      </View>
    </Modal>
  )
}
