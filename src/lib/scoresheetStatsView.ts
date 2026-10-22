import AsyncStorage from '@react-native-async-storage/async-storage'

/** Legacy single-key preference (pre layout-aware defaults). */
export const SCORESHEET_STATS_VIEW_KEY = 'scoresheet_stats_view'

export type ScoresheetStatsView = 'compact' | 'full' | 'focus'

export const SCORESHEET_STATS_VIEWS: ScoresheetStatsView[] = [
  'full',
  'compact',
  'focus',
]

/** Classic — used on regular width (unfolded Duo / landscape). */
export const DEFAULT_SCORESHEET_STATS_VIEW: ScoresheetStatsView = 'full'

/** Ledger — default on compact (closed Duo / bar-phone portrait). */
export const DEFAULT_SCORESHEET_STATS_VIEW_COMPACT: ScoresheetStatsView =
  'compact'

export function defaultScoresheetStatsView(
  isRegular: boolean,
): ScoresheetStatsView {
  return isRegular
    ? DEFAULT_SCORESHEET_STATS_VIEW
    : DEFAULT_SCORESHEET_STATS_VIEW_COMPACT
}

export function scoresheetStatsViewStorageKey(isRegular: boolean): string {
  return isRegular
    ? `${SCORESHEET_STATS_VIEW_KEY}_regular`
    : `${SCORESHEET_STATS_VIEW_KEY}_compact`
}

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

export async function loadScoresheetStatsView(
  isRegular: boolean,
): Promise<ScoresheetStatsView> {
  const fallback = defaultScoresheetStatsView(isRegular)
  try {
    const key = scoresheetStatsViewStorageKey(isRegular)
    const stored = await AsyncStorage.getItem(key)
    const parsed = parseScoresheetStatsView(stored)
    if (parsed) return parsed

    // One-time migrate: only apply the old global key on regular layouts so
    // compact devices still open in Ledger instead of a prior Classic default.
    if (isRegular) {
      const legacy = await AsyncStorage.getItem(SCORESHEET_STATS_VIEW_KEY)
      return parseScoresheetStatsView(legacy) ?? fallback
    }
    return fallback
  } catch {
    return fallback
  }
}

export async function saveScoresheetStatsView(
  view: ScoresheetStatsView,
  isRegular: boolean,
): Promise<void> {
  try {
    await AsyncStorage.setItem(scoresheetStatsViewStorageKey(isRegular), view)
  } catch {
    /* ignore */
  }
}
