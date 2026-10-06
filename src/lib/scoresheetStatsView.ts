import AsyncStorage from '@react-native-async-storage/async-storage'

export const SCORESHEET_STATS_VIEW_KEY = 'scoresheet_stats_view'

export type ScoresheetStatsView = 'compact' | 'full' | 'focus'

export const SCORESHEET_STATS_VIEWS: ScoresheetStatsView[] = [
  'full',
  'compact',
  'focus',
]

export const DEFAULT_SCORESHEET_STATS_VIEW: ScoresheetStatsView = 'full'

export function parseScoresheetStatsView(
  raw: unknown,
): ScoresheetStatsView | null {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (value === 'compact' || value === 'full' || value === 'focus') {
    return value
  }
  return null
}

export async function loadScoresheetStatsView(): Promise<ScoresheetStatsView> {
  try {
    const stored = await AsyncStorage.getItem(SCORESHEET_STATS_VIEW_KEY)
    return parseScoresheetStatsView(stored) ?? DEFAULT_SCORESHEET_STATS_VIEW
  } catch {
    return DEFAULT_SCORESHEET_STATS_VIEW
  }
}

export async function saveScoresheetStatsView(
  view: ScoresheetStatsView,
): Promise<void> {
  try {
    await AsyncStorage.setItem(SCORESHEET_STATS_VIEW_KEY, view)
  } catch {
    /* ignore */
  }
}
