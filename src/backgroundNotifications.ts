/**
 * Firebase requires the background message handler to be registered as early as
 * possible, outside React component lifecycles.
 */
import {
  applyBadgeFromRemoteMessage,
  ensureAllNotificationChannels,
} from '@/lib/notifications'
import {getMessaging, setBackgroundMessageHandler} from '@react-native-firebase/messaging'
import {Platform} from 'react-native'

if (Platform.OS !== 'web') {
  const messaging = getMessaging()
  setBackgroundMessageHandler(messaging, async remoteMessage => {
    try {
      if (Platform.OS === 'android') {
        await ensureAllNotificationChannels()
      }
      await applyBadgeFromRemoteMessage(remoteMessage)
    } catch (e) {
      console.error('Error handling background notification:', e)
    }
  })
}
