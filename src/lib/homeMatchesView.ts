import AsyncStorage from '@react-native-async-storage/async-storage'

export type HomeMatchesView = 'list' | 'calendar'

const STORAGE_KEY = 'home_matches_view'

/** Stored home layout. Anything missing or unrecognized falls back to the list. */
export function parseHomeMatchesView(raw: string | null): HomeMatchesView {
  if (raw === 'calendar' || raw === 'list') return raw
  return 'list'
}

export async function loadHomeMatchesView(): Promise<HomeMatchesView> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    return parseHomeMatchesView(raw)
  } catch {
    return 'list'
  }
}

export async function saveHomeMatchesView(view: HomeMatchesView): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, view)
}
