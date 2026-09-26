import config from '@/config'

/** League id compiled into this build. Darts is 3. */
export function configuredLeagueId(): number | null {
  const id = Number(config.leagueId)
  if (Number.isFinite(id) && id > 0) return id
  return null
}

/** Sent on API calls so the backend does not infer the league from the host. */
export function leagueRequestHeaders(): Record<string, string> {
  const id = configuredLeagueId()
  if (id == null) return {}
  return {'X-League-Id': String(id)}
}
