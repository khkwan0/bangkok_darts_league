import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'ota_restore_location_v1'

/**
 * Root Stack screens that sit beside `(tabs)`, not inside NativeTabs.
 * Opening one of these as the only root route (OTA restore, a notification,
 * or a deep link) drops the tab bar and leaves no back target.
 */
const ROOT_STACK_OVERLAY_PREFIXES = [
  '/Settings',
  '/teams',
  '/history',
  '/player',
  '/Completed',
  '/Messages',
] as const

export const TABS_ROUTE_NAME = '(tabs)'

export type RootStackRouteSnapshot = {
  name: string
  params?: object
  state?: object
  path?: string
}

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

function routeHref(route: {name: string; path?: string}): string {
  if (route.path && route.path.length > 0) {
    return route.path.startsWith('/') ? route.path : `/${route.path}`
  }
  return `/${route.name}`
}

/**
 * True when the root stack is showing Settings/teams/etc. with `(tabs)` not
 * underneath. That state has no back button and no tab bar.
 */
export function rootOverlayMissingTabs(
  routes: Array<{name: string; path?: string}>,
): boolean {
  if (routes.length === 0) return false
  if (routes.some(route => route.name === TABS_ROUTE_NAME)) return false
  return routes.some(route => isRootStackOverlayPath(routeHref(route)))
}

/** Root reset that keeps the current screens and puts `(tabs)` behind them. */
export function tabsAnchorReset(
  routes: RootStackRouteSnapshot[],
  index: number,
): {index: number; routes: RootStackRouteSnapshot[]} | null {
  if (!rootOverlayMissingTabs(routes)) return null
  const safeIndex = Math.min(Math.max(index, 0), routes.length - 1)
  return {
    index: safeIndex + 1,
    routes: [
      {name: TABS_ROUTE_NAME},
      ...routes.map(route => ({
        name: route.name,
        params: route.params,
        state: route.state,
        path: route.path,
      })),
    ],
  }
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
