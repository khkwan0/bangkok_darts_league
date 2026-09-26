import config from '@/config'
import {configuredLeagueId} from '@/lib/leagueRequest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {Platform} from 'react-native'
import {io, type Socket} from 'socket.io-client'

/** Hostname for the white-label league (pool vs darts), from API base URL. */
export function leagueHostFromApiUrl(apiUrl?: string | null): string {
  try {
    const raw = String(apiUrl || config.apiUrl || '')
      .trim()
      .replace(/\/api\/?$/i, '')
      .replace(/\/$/, '')
    if (!raw) return ''
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    return new URL(withScheme).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export type SocketAuthOptions = {
  /** Current API base (e.g. https://darts.bkkleague.com/api) — scopes agent tools. */
  apiUrl?: string | null
  /** Ignored when this build has config.leagueId. */
  leagueId?: number | null
}

/**
 * Auth + league identity for Socket.IO (CueChat / tournament admin).
 * Mobile cannot rely on Host alone behind some proxies, so we also send
 * auth.leagueHost / X-League-Host for the server MCP loopback.
 */
export async function loadSocketAuth(options: SocketAuthOptions = {}) {
  const token = await AsyncStorage.getItem('jwt')
  const leagueHost = leagueHostFromApiUrl(options.apiUrl)
  const optionLeagueId =
    options.leagueId != null &&
    Number.isFinite(Number(options.leagueId)) &&
    Number(options.leagueId) > 0
      ? Number(options.leagueId)
      : null
  const leagueId = configuredLeagueId() ?? optionLeagueId

  const leagueAuth: Record<string, string | number> = {}
  if (leagueHost) leagueAuth.leagueHost = leagueHost
  if (leagueId != null) leagueAuth.leagueId = leagueId

  const leagueHeaders: Record<string, string> = {}
  if (leagueHost) leagueHeaders['X-League-Host'] = leagueHost
  if (leagueId != null) leagueHeaders['X-League-Id'] = String(leagueId)

  if (!token) {
    return {
      auth: {...leagueAuth},
      extraHeaders: {...leagueHeaders},
    }
  }

  const bearerToken = `Bearer ${token}`
  return {
    auth: {authorization: bearerToken, token, ...leagueAuth},
    extraHeaders: {Authorization: bearerToken, ...leagueHeaders},
  }
}

/** Keep in sync with pingTimeout on the Socket.IO server (server.ts). */
export const SOCKET_PING_INTERVAL_MS = 25_000
export const SOCKET_PING_TIMEOUT_MS = 120_000

/** CueChat manages connect/disconnect explicitly — disable auto-reconnect. */
export function createSocketClient(
  url?: string,
  authOptions: Record<string, unknown> = {},
): Socket {
  return io(url || config.webSocketUrl, {
    autoConnect: false,
    reconnection: false,
    timeout: 30_000,
    pingInterval: SOCKET_PING_INTERVAL_MS,
    pingTimeout: SOCKET_PING_TIMEOUT_MS,
    transports: Platform.OS === 'web' ? ['websocket', 'polling'] : ['websocket'],
    ...authOptions,
  })
}
