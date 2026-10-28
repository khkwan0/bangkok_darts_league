import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'ota_restore_location_v1'

/**
 * Root Stack screens that sit beside `(tabs)`, not inside NativeTabs.
 * Restoring these with `router.replace` swaps out `(tabs)` and leaves the
 * user with no tab bar and no back target after an OTA reload.
 */
const ROOT_STACK_OVERLAY_PREFIXES = [
  '/Settings',
  '/teams',
  '/history',
  '/player',
] as const

export type OtaRestoreLocation = {
  pathname: string
  params?: Record<string, string>
}

/** Survives consume() so getInitialNotification cannot race past a finished restore. */
let restorePendingThisLaunch = false

function serializeParams(
  params: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.length > 0) {
      out[key] = value
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = String(value)
    } else if (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === 'string'
    ) {
      out[key] = value[0]
    }
  }
  return out
}

/** True when pathname is a root Stack sibling of `(tabs)` (e.g. Settings). */
export function isRootStackOverlayPath(pathname: string): boolean {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return ROOT_STACK_OVERLAY_PREFIXES.some(
    prefix => path === prefix || path.startsWith(`${prefix}/`),
  )
}

export async function saveOtaRestoreLocation(
  pathname: string,
  params: Record<string, unknown> = {},
): Promise<void> {
  if (!pathname || pathname === '/') return
  const location: OtaRestoreLocation = {
    pathname,
    params: serializeParams(params),
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(location))
}

export async function peekOtaRestorePending(): Promise<boolean> {
  if (restorePendingThisLaunch) return true
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (raw != null && raw.length > 0) {
    restorePendingThisLaunch = true
    return true
  }
  return false
}

/** Reads and clears the one-shot location saved before an OTA reload. */
export async function consumeOtaRestoreLocation(): Promise<OtaRestoreLocation | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  restorePendingThisLaunch = true
  await AsyncStorage.removeItem(STORAGE_KEY)
  try {
    const parsed = JSON.parse(raw) as OtaRestoreLocation
    if (!parsed?.pathname || typeof parsed.pathname !== 'string') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
