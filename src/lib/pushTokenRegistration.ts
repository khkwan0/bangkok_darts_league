import AsyncStorage from '@react-native-async-storage/async-storage'
import {getPushToken} from '@/lib/notifications'

const STORAGE_KEY = 'push_token_registration'
/** Resume re-registers at most this often for an unchanged token (keeps last_seen_at fresh). */
const RESEND_AFTER_MS = 12 * 60 * 60 * 1000

type LastRegistration = {
  token: string
  playerId: number
  at: number
}

type PostFn = (path: string, body: unknown) => Promise<{status?: string} | null>

async function readLast(): Promise<LastRegistration | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LastRegistration) : null
  } catch {
    return null
  }
}

/**
 * Send this device's FCM token to the backend.
 * `force: false` skips the request when the same token was sent for the same
 * player within RESEND_AFTER_MS. `prompt: false` never shows the iOS permission
 * dialog (use for background/resume paths).
 */
export async function registerPushToken(
  post: PostFn,
  playerId: number | null | undefined,
  {force = true, prompt = true}: {force?: boolean; prompt?: boolean} = {},
): Promise<string | null> {
  if (!playerId) return null
  const token = await getPushToken({prompt})
  if (!token) return null

  if (!force) {
    const last = await readLast()
    if (
      last &&
      last.token === token &&
      last.playerId === playerId &&
      Date.now() - last.at < RESEND_AFTER_MS
    ) {
      return token
    }
  }

  const res = await post('/user/token', {token})
  if (res?.status === 'ok') {
    const record: LastRegistration = {token, playerId, at: Date.now()}
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record)).catch(
      () => {},
    )
  }
  return token
}
