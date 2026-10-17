import AsyncStorage from '@react-native-async-storage/async-storage'

export type VenueMatchesView = 'list' | 'calendar'

const STORAGE_KEY = 'venue_matches_view'

export function parseVenueMatchesView(raw: string | null): VenueMatchesView {
  if (raw === 'calendar' || raw === 'list') return raw
  return 'list'
}

export async function loadVenueMatchesView(): Promise<VenueMatchesView> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    return parseVenueMatchesView(raw)
  } catch {
    return 'list'
  }
}

export async function saveVenueMatchesView(
  view: VenueMatchesView,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, view)
}
