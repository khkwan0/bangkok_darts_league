/**
 * LINE Login returns via `line3rdp.<bundle-id>://…`. Under SDK 58's scene
 * lifecycle that URL is also delivered to Expo Router, which has no matching
 * route ("Oops! This screen doesn't exist"). Native LineLogin already consumes
 * the callback — drop it here so navigation stays on Auth.
 */
export function redirectSystemPath({
  path,
}: {
  path: string
  initial: boolean
}): string | null {
  try {
    const value = String(path ?? '')
    if (/line3rdp\./i.test(value) || /^lineauth2:/i.test(value)) {
      return null
    }
    // Scheme sometimes stripped; LINE still lands on /authorize?code=…
    if (/(^|\/)authorize\b/i.test(value) && /[?&]code=/.test(value)) {
      return null
    }
    return path
  } catch {
    return path
  }
}
