import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
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

/**
 * Checks for OTA updates on launch and when returning to foreground.
 * Downloads with a visible modal, then prompts the user to restart.
 */
export default function OTAUpdatePrompt() {
  const {t} = useTranslation()
  const [downloading, setDownloading] = useState(false)
  const busyRef = useRef(false)
  const dismissedUpdateIdRef = useRef<string | null>(null)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    if (Platform.OS === 'web' || __DEV__ || !Updates.isEnabled) {
      return
    }

    async function runCheck() {
      if (busyRef.current) return
      busyRef.current = true
      try {
        const result = await Updates.checkForUpdateAsync()
        if (!result.isAvailable) return

        const updateId =
          typeof result.manifest === 'object' &&
          result.manifest &&
          'id' in result.manifest
            ? String((result.manifest as {id?: string}).id ?? '')
            : ''

        if (updateId && dismissedUpdateIdRef.current === updateId) {
          return
        }

        setDownloading(true)
        const fetched = await Updates.fetchUpdateAsync()
        setDownloading(false)

        if (!fetched.isNew) return

        Alert.alert(
          t('ota_update_ready_title'),
          t('ota_update_ready_message'),
          [
            {
              text: t('ota_later'),
              style: 'cancel',
              onPress: () => {
                if (updateId) dismissedUpdateIdRef.current = updateId
              },
            },
            {
              text: t('ota_restart'),
              onPress: () => {
                Updates.reloadAsync().catch(() => {
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
      } finally {
        busyRef.current = false
      }
    }

    runCheck()

    const sub = AppState.addEventListener('change', nextState => {
      const wasBackground =
        appStateRef.current === 'background' ||
        appStateRef.current === 'inactive'
      appStateRef.current = nextState
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
