import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'home_highlights_collapsed'

/** Defaults to collapsed when the user has no saved preference. */
export async function loadHomeHighlightsCollapsed(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw == null) return true
    return raw === '1' || raw === 'true'
  } catch {
    return true
  }
}

export async function saveHomeHighlightsCollapsed(
  collapsed: boolean,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
}
