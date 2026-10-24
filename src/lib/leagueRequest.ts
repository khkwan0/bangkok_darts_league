import config from '@/config'
import Constants from 'expo-constants'
import {Platform} from 'react-native'

/** League id compiled into this build. Darts is 3. */
export function configuredLeagueId(): number | null {
  const id = Number(config.leagueId)
  if (Number.isFinite(id) && id > 0) return id
  return null
}

/** Marketing version + native build for announcement audience targeting. */
function appClientHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const version = Constants.expoConfig?.version
  if (version) {
    headers['X-App-Version'] = String(version)
  }
  const build =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode
  if (build != null && String(build).trim() !== '') {
    headers['X-App-Build'] = String(build)
  }
  return headers
}

/** Sent on API calls so the backend does not infer the league from the host. */
export function leagueRequestHeaders(): Record<string, string> {
  const id = configuredLeagueId()
  return {
    ...(id != null ? {'X-League-Id': String(id)} : {}),
    ...appClientHeaders(),
  }
}
