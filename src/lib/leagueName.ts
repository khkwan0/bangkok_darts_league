import i18n from '@/i18n'
import {configuredLeagueId} from '@/lib/leagueRequest'
import AsyncStorage from '@react-native-async-storage/async-storage'

/** Hardcoded title baked into this build (i18n). */
export function hardcodedLeagueName(): string {
  return i18n.t('bangkok_darts_league')
}

/** Per-league cache key so pool/darts (and future leagues) stay separate. */
export function leagueNameStorageKey(
  leagueId: number = configuredLeagueId(),
): string {
  return `league_name:${leagueId}`
}

/** Cached name for this build's league, or the hardcoded fallback. */
export async function loadCachedLeagueName(
  leagueId: number = configuredLeagueId(),
): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(leagueNameStorageKey(leagueId))
    const trimmed = String(raw || '').trim()
    if (trimmed) return trimmed
  } catch {
    // ignore storage errors
  }
  return hardcodedLeagueName()
}

/** Persist the backend source-of-truth name for this league. */
export async function saveCachedLeagueName(
  name: string,
  leagueId: number = configuredLeagueId(),
): Promise<void> {
  const trimmed = String(name || '').trim()
  if (!trimmed) return
  try {
    await AsyncStorage.setItem(leagueNameStorageKey(leagueId), trimmed)
  } catch {
    // ignore storage errors
  }
}
