import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'completed_match_header_sticky'

/** Completed match score header starts pinned. */
export async function loadCompletedHeaderSticky(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw == null) return true
    return raw === '1' || raw === 'true'
  } catch {
    return true
  }
}

export async function saveCompletedHeaderSticky(sticky: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, sticky ? '1' : '0')
}
