/**
 * LINE Login (native SDK and mobile web handoff) returns via
 * `line3rdp.<bundle-id>://…` / `lineauth2:…`. Expo Router also receives that
 * URL and has no matching route ("This screen doesn't exist").
 *
 * Returning `null` only keeps the current route — on a cold start the current
 * route *is* the unmatched LINE URL, so still lands on +not-found. Always
 * rewrite to `/` so Auth/tabs can mount instead.
 */
function isLineOrAuthHandoff(path: string): boolean {
  if (/line3rdp\./i.test(path) || /^lineauth2:/i.test(path)) return true
  // Scheme sometimes stripped; LINE still lands on /authorize?code=…
  if (/(^|\/)authorize\b/i.test(path) && /[?&]code=/.test(path)) return true
  // Web OAuth callback stolen by App Links / in-app browser → native open
  if (/\/api\/auth(?:\/|$)/i.test(path)) return true
  if (/\/callback\/line(?:-|$|\?)/i.test(path)) return true
  return false
}

export function redirectSystemPath({
  path,
}: {
  path: string
  initial: boolean
}): string | null {
  try {
    const value = String(path ?? '')
    if (isLineOrAuthHandoff(value)) {
      return '/'
    }
    return path
  } catch {
    return '/'
  }
}
