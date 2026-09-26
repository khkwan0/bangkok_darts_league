import * as Notifications from 'expo-notifications'
import {Platform} from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async notification => {
    const data = notification.request.content.data
    const isAnnouncement =
      data != null &&
      typeof data === 'object' &&
      'type' in data &&
      data.type === 'announcement'

    return {
      shouldShowBanner: !isAnnouncement,
      shouldShowList: !isAnnouncement,
      shouldPlaySound: !isAnnouncement,
      shouldSetBadge: true,
    }
  },
})

const CHANNELS = [
  {id: 'General', name: 'General'},
  {id: 'Admin', name: 'Admin'},
  {id: 'App Wide', name: 'General'},
  {id: 'match_confirmation', name: 'Match Confirmation'},
] as const

export async function setAppBadgeCount(count: number | null | undefined) {
  if (Platform.OS === 'web') {
    return false
  }
  try {
    const badgeCount = Math.max(0, Math.floor(Number(count) || 0))
    return await Notifications.setBadgeCountAsync(badgeCount)
  } catch (e) {
    console.error('Error setting app badge count:', e)
    return false
  }
}

async function createChannel(id: string, name: string) {
  if (Platform.OS !== 'android') {
    return
  }
  await Notifications.setNotificationChannelAsync(id, {
    name,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    enableLights: true,
    showBadge: true,
  })
}

/** Create every channel the backend may target. Safe to call repeatedly. */
export async function ensureAllNotificationChannels() {
  if (Platform.OS !== 'android') {
    return
  }
  await Promise.all(CHANNELS.map(channel => createChannel(channel.id, channel.name)))
}

export async function ensureAppWideChannel() {
  await ensureAllNotificationChannels()
}

export async function ensureUserChannels(options?: {includeAdmin?: boolean}) {
  await ensureAllNotificationChannels()
  if (options?.includeAdmin) {
    await createChannel('Admin', 'Admin')
  }
}

function parseBadge(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value))
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed))
    }
  }
  return null
}

export function getBadgeFromRemoteMessage(remoteMessage: {
  data?: Record<string, unknown> | null
  notification?: {android?: {count?: number | string} | null} | null
}): number | null {
  const fromData =
    parseBadge(remoteMessage?.data?.badge) ??
    parseBadge(remoteMessage?.data?.unreadCount)
  if (fromData != null) {
    return fromData
  }
  return parseBadge(remoteMessage?.notification?.android?.count)
}

export function isAnnouncementRemoteMessage(remoteMessage: {
  data?: Record<string, unknown> | null
}): boolean {
  return remoteMessage?.data?.type === 'announcement'
}

export async function applyBadgeFromRemoteMessage(remoteMessage: {
  data?: Record<string, unknown> | null
  notification?: {android?: {count?: number | string} | null} | null
}) {
  const badge = getBadgeFromRemoteMessage(remoteMessage)
  if (badge == null) {
    return false
  }
  return setAppBadgeCount(badge)
}

/**
 * FCM does not show a system banner while the app is in the foreground.
 * Present a local notification so the user still sees the message.
 */
export async function presentRemoteNotification(remoteMessage: {
  notification?: {
    title?: string | null
    body?: string | null
    android?: {channelId?: string | null} | null
  } | null
  data?: Record<string, unknown> | null
}) {
  if (Platform.OS === 'web') {
    return
  }

  const title =
    remoteMessage.notification?.title ||
    (typeof remoteMessage.data?.title === 'string'
      ? remoteMessage.data.title
      : 'Bangkok Darts League')
  const body =
    remoteMessage.notification?.body ||
    (typeof remoteMessage.data?.body === 'string'
      ? remoteMessage.data.body
      : typeof remoteMessage.data?.message === 'string'
        ? remoteMessage.data.message
        : '')

  if (!title && !body) {
    return
  }

  const channelId =
    remoteMessage.notification?.android?.channelId ||
    (typeof remoteMessage.data?.channelId === 'string'
      ? remoteMessage.data.channelId
      : 'General')

  if (Platform.OS === 'android') {
    await ensureAllNotificationChannels()
  }

  const badge = getBadgeFromRemoteMessage(remoteMessage)

  await Notifications.scheduleNotificationAsync({
    content: {
      title: title || 'Bangkok Darts League',
      body: body || undefined,
      data: remoteMessage.data ?? {},
      sound: true,
      ...(badge != null ? {badge} : {}),
    },
    trigger:
      Platform.OS === 'android'
        ? {channelId}
        : null,
  })
}
