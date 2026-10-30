/**
 * Members-home stats panel catalog and resolution.
 * Panel ids are stable; labels come from i18n.
 */

export type HomePanelId =
  | 'singles'
  | 'doubles'
  | '8_singles'
  | '8_doubles'
  | '9_singles'
  | '9_doubles'
  | 'cricket'
  | '307_singles'
  | '307_doubles'
  | '507_singles'
  | '507_doubles'

export type HomePanelSport = 'pool' | 'darts'

/** Maps panel id → GetPlayerStats summary key. */
export const PANEL_STATS_KEY: Record<HomePanelId, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  '8_singles': '8 Ball Single',
  '8_doubles': '8 Ball Double',
  '9_singles': '9 Ball Single',
  '9_doubles': '9 Ball Double',
  cricket: 'Cricket',
  '307_singles': '307',
  '307_doubles': '307 Doubles',
  '507_singles': '507',
  '507_doubles': '507 Doubles',
}

/** i18n key under root (mobile). */
export const PANEL_I18N_KEY: Record<HomePanelId, string> = {
  singles: 'singles_games',
  doubles: 'doubles_games',
  '8_singles': 'eight_ball_singles_frames',
  '8_doubles': 'eight_ball_doubles_frames',
  '9_singles': 'nine_ball_singles_frames',
  '9_doubles': 'nine_ball_doubles_frames',
  cricket: 'cricket_legs',
  '307_singles': 'three_oh_seven_singles_legs',
  '307_doubles': 'three_oh_seven_doubles_legs',
  '507_singles': 'five_oh_seven_singles_legs',
  '507_doubles': 'five_oh_seven_doubles_legs',
}

/** Admin-facing English labels when translations are unavailable. */
export const PANEL_ADMIN_LABEL: Record<HomePanelId, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  '8_singles': '8 Ball Singles',
  '8_doubles': '8 Ball Doubles',
  '9_singles': '9 Ball Singles',
  '9_doubles': '9 Ball Doubles',
  cricket: 'Cricket',
  '307_singles': '307 Singles',
  '307_doubles': '307 Doubles',
  '507_singles': '507 Singles',
  '507_doubles': '507 Doubles',
}

const POOL_PANELS: HomePanelId[] = [
  'singles',
  'doubles',
  '8_singles',
  '8_doubles',
  '9_singles',
  '9_doubles',
]

const DARTS_PANELS: HomePanelId[] = [
  'singles',
  'doubles',
  'cricket',
  '307_singles',
  '307_doubles',
  '507_singles',
  '507_doubles',
]

const POOL_DEFAULT: HomePanelId[] = [
  'singles',
  'doubles',
  '8_singles',
  '8_doubles',
  '9_singles',
  '9_doubles',
]

const DARTS_DEFAULT: HomePanelId[] = [
  'singles',
  'doubles',
  '307_singles',
  '307_doubles',
  '507_singles',
  '507_doubles',
]

const ALL_PANEL_IDS = new Set<string>([...POOL_PANELS, ...DARTS_PANELS])

export function isHomePanelId(value: unknown): value is HomePanelId {
  return typeof value === 'string' && ALL_PANEL_IDS.has(value)
}

export function availablePanels(sport: HomePanelSport): HomePanelId[] {
  return sport === 'darts' ? [...DARTS_PANELS] : [...POOL_PANELS]
}

export function sportDefaultPanels(sport: HomePanelSport): HomePanelId[] {
  return sport === 'darts' ? [...DARTS_DEFAULT] : [...POOL_DEFAULT]
}

/**
 * Sanitize an ordered list: known ids only, unique, scoped to sport catalog.
 * Returns null if input is null/undefined/empty after filter (caller may fall back).
 */
export function sanitizeHomePanels(
  panels: unknown,
  sport: HomePanelSport,
): HomePanelId[] | null {
  if (panels == null) return null
  if (!Array.isArray(panels)) return null
  const allowed = new Set(availablePanels(sport))
  const seen = new Set<string>()
  const out: HomePanelId[] = []
  for (const raw of panels) {
    if (!isHomePanelId(raw) || !allowed.has(raw) || seen.has(raw)) continue
    seen.add(raw)
    out.push(raw)
  }
  return out.length > 0 ? out : null
}

/**
 * Member override wins when present; else league; else sport default.
 */
export function resolveHomePanels(
  leaguePanels: unknown,
  memberPanels: unknown,
  sport: HomePanelSport,
): HomePanelId[] {
  const fromMember = sanitizeHomePanels(memberPanels, sport)
  if (fromMember) return fromMember
  const fromLeague = sanitizeHomePanels(leaguePanels, sport)
  if (fromLeague) return fromLeague
  return sportDefaultPanels(sport)
}

/** Effective panels for branding payload (league or sport default). */
export function effectiveLeagueHomePanels(
  leaguePanels: unknown,
  sport: HomePanelSport,
): HomePanelId[] {
  return (
    sanitizeHomePanels(leaguePanels, sport) ?? sportDefaultPanels(sport)
  )
}
