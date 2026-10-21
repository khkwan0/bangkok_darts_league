import {useLeagueContext} from '@/context/LeagueContext'
import {
  getDeviceTimeZone,
  resolvePreferredTimeZone,
  tzMismatchAckKey,
} from '@/lib/bangkokTime'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {router} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Alert} from 'react-native'

/**
 * One-time informational alert when device TZ differs from saved preference.
 * Display always uses the preference; dialog does not change it.
 */
export default function TimezoneMismatchDialog() {
  const {t} = useTranslation()
  const {state} = useLeagueContext()
  const userId = state.user?.id
  const preferredTz = resolvePreferredTimeZone(state.user?.preferences)
  const shownRef = React.useRef(false)

  React.useEffect(() => {
    if (!userId || shownRef.current) return

    let cancelled = false
    void (async () => {
      const deviceTz = getDeviceTimeZone()
      if (deviceTz === preferredTz) return

      const key = tzMismatchAckKey(preferredTz, deviceTz)
      try {
        const acked = await AsyncStorage.getItem(key)
        if (acked === '1' || cancelled) return
      } catch {
        // show anyway
      }

      if (cancelled) return
      shownRef.current = true
      Alert.alert(
        t('timezone_mismatch_title'),
        `${t('timezone_mismatch_body', {
          preferred: preferredTz,
          device: deviceTz,
        })}\n\n${t('timezone_mismatch_settings_hint')}`,
        [
          {
            text: t('timezone_mismatch_open_settings'),
            onPress: () => {
              void AsyncStorage.setItem(key, '1')
              router.push('/Settings/Preferences/Timezone' as any)
            },
          },
          {
            text: t('timezone_mismatch_ok'),
            style: 'default',
            onPress: () => {
              void AsyncStorage.setItem(key, '1')
            },
          },
        ],
      )
    })()

    return () => {
      cancelled = true
    }
  }, [userId, preferredTz, t])

  return null
}
