/**
 * Normalize Match route / embed params into a matchInfo-like object.
 * Supports:
 * - flattened fixture: `{ match_id, home_team_name, ... }`
 * - wrapped JSON: `{ params: "<json>" }`
 */
export function resolveMatchInfoFromParams(
  routeParams: Record<string, unknown> | null | undefined,
  embedMatchInfo?: Record<string, unknown> | null,
): Record<string, any> {
  if (embedMatchInfo != null && embedMatchInfo.match_id != null) {
    return embedMatchInfo
  }
  if (routeParams == null) return {}

  const wrapped = routeParams.params
  if (typeof wrapped === 'string') {
    try {
      const parsed = JSON.parse(wrapped)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // ignore
    }
  }

  if (routeParams.match_id != null) {
    return routeParams
  }

  return {}
}
