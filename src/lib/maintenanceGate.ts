import config from '@/config'

/**
 * Shows the maintenance screen only when the league looks broadly down.
 * A 502 or 504 shows it immediately. Any other 5xx is checked against
 * GET /api/health, and also against other league paths failing at the
 * same time. A later successful league response clears the screen.
 * The health check itself never clears it, because that route stays up
 * when the database is down.
 */

const FAILURE_WINDOW_MS = 10_000
const DISTINCT_FAILURES = 3
const PROBE_HEADER = 'x-maintenance-probe'

const bases = new Set<string>()
const listeners = new Set<(active: boolean) => void>()
const recentFailures = new Map<string, number>()
let active = false
let installed = false
let probeInFlight = false
let nativeFetch: typeof fetch | null = null

export function rememberApiBase(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return
  try {
    const url = new URL(trimmed)
    const base = `${url.origin}${url.pathname}`.replace(/\/$/, '')
    if (base) bases.add(base)
  } catch {
    const base = trimmed.replace(/\/$/, '')
    if (base) bases.add(base)
  }
}

export function isMaintenanceActive() {
  return active
}

export function subscribeMaintenance(listener: (active: boolean) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function setMaintenance(next: boolean) {
  if (active === next) return
  active = next
  listeners.forEach(listener => listener(next))
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url
  return ''
}

function headerValue(headers: HeadersInit | undefined, name: string): string | null {
  if (!headers) return null
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers.get(name)
  }
  if (Array.isArray(headers)) {
    const found = headers.find(([key]) => key.toLowerCase() === name)
    return found ? String(found[1] ?? '') : null
  }
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (key.toLowerCase() === name && value != null) return String(value)
  }
  return null
}

function hasHeader(input: RequestInfo | URL, init: RequestInit | undefined, name: string) {
  if (headerValue(init?.headers, name)) return true
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return Boolean(input.headers.get(name))
  }
  return false
}

function isKnownApiUrl(raw: string): boolean {
  if (!raw) return false
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  const href = `${url.origin}${url.pathname}`.replace(/\/$/, '')
  for (const base of bases) {
    if (href === base || href.startsWith(`${base}/`)) return true
  }
  return false
}

function isHealthUrl(raw: string): boolean {
  try {
    const path = new URL(raw).pathname.replace(/\/$/, '')
    return path === '/health' || path === '/api/health'
  } catch {
    return false
  }
}

function requestPath(raw: string): string {
  try {
    return new URL(raw).pathname.replace(/\/$/, '') || '/'
  } catch {
    return raw
  }
}

function healthUrlFor(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  const href = `${url.origin}${url.pathname}`.replace(/\/$/, '')
  let match = ''
  for (const base of bases) {
    if ((href === base || href.startsWith(`${base}/`)) && base.length > match.length) {
      match = base
    }
  }
  if (match) return `${match}/health`
  const apiAt = url.pathname.indexOf('/api/')
  if (apiAt >= 0) return `${url.origin}${url.pathname.slice(0, apiAt)}/api/health`
  if (url.pathname.replace(/\/$/, '') === '/api') return `${url.origin}/api/health`
  return null
}

function recordFailure(raw: string): number {
  const now = Date.now()
  for (const [path, at] of recentFailures) {
    if (now - at > FAILURE_WINDOW_MS) recentFailures.delete(path)
  }
  recentFailures.set(requestPath(raw), now)
  return recentFailures.size
}

async function probeHealth(raw: string) {
  if (probeInFlight || active || !nativeFetch) return
  const healthUrl = healthUrlFor(raw)
  if (!healthUrl) return
  probeInFlight = true
  try {
    const response = await nativeFetch(healthUrl, {
      headers: {'X-Maintenance-Probe': '1'},
    })
    if (response.status >= 500 && response.status <= 599) {
      setMaintenance(true)
    }
  } catch {
    setMaintenance(true)
  } finally {
    probeInFlight = false
  }
}

function noteResponse(input: RequestInfo | URL, init: RequestInit | undefined, status: number) {
  const raw = requestUrl(input)
  if (hasHeader(input, init, PROBE_HEADER) || isHealthUrl(raw)) {
    if (status >= 500 && status <= 599) setMaintenance(true)
    return
  }
  if (!hasHeader(input, init, 'x-league-id') && !isKnownApiUrl(raw)) return
  if (status > 0 && status < 500) {
    recentFailures.clear()
    setMaintenance(false)
    return
  }
  if (status < 500 || status > 599 || active) return
  const distinct = recordFailure(raw)
  if (status === 502 || status === 504 || distinct >= DISTINCT_FAILURES) {
    setMaintenance(true)
    return
  }
  void probeHealth(raw)
}

function installMaintenanceFetch() {
  if (installed || typeof global.fetch !== 'function') return
  installed = true
  nativeFetch = global.fetch.bind(global)
  const callNative = nativeFetch
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await callNative(input, init)
    try {
      noteResponse(input, init, response.status)
    } catch {
      // Never let maintenance tracking break the original request.
    }
    return response
  }) as typeof fetch
}

rememberApiBase(config.apiUrl)
installMaintenanceFetch()
