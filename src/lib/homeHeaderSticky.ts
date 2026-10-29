import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'home_header_sticky'

/** Defaults to unpinned when the user has no saved preference. */
export async function loadHomeHeaderSticky(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw == null) return false
    return raw === '1' || raw === 'true'
  } catch {
    return false
  }
}

export async function saveHomeHeaderSticky(sticky: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, sticky ? '1' : '0')
}
