export type Competition =
  | {type: 'canonical'}
  | {type: 'mini'; id: number; name: string}
  | {type: 'tournament'; id: number; name: string}

export const CANONICAL_COMPETITION: Competition = {type: 'canonical'}

export const COMPETITION_STORAGE_KEY = 'competition_v1'

/** Fallback accent when not in Bangkok Darts League mode (e.g. tournament scope). */
export const NON_CANONICAL_ACCENT = '#C2185B'
export const NON_CANONICAL_ACCENT_SOFT = '#FCE4EC'
export const NON_CANONICAL_ACCENT_DARK = '#4A0D2A'
export const NON_CANONICAL_ACCENT_SOFT_DARK = '#5C1A3A'

export type MiniLeaguePalette = {
  accent: string
  /** Readable label/icon color on soft / softDark surfaces */
  accentOnSoftLight: string
  accentOnSoftDark: string
  soft: string
  softDark: string
  dark: string
  border: string
  borderDark: string
  /** Left → right card wash (light mode) — kept pale for text contrast */
  gradientLight: readonly [string, string, string]
  /** Left → right card wash (dark mode) */
  gradientDark: readonly [string, string, string]
}

/** Distinct, deterministic themes keyed by mini league id. */
const MINI_LEAGUE_PALETTES: MiniLeaguePalette[] = [
  {
    // Magenta (legacy default feel)
    accent: '#C2185B',
    accentOnSoftLight: '#9F1239',
    accentOnSoftDark: '#FCE4EC',
    soft: '#FCE4EC',
    softDark: '#5C1A3A',
    dark: '#4A0D2A',
    border: '#F48FB1',
    borderDark: '#7A2A4D',
    gradientLight: ['#FCE7F3', '#FFF7FB', '#FFFFFF'],
    gradientDark: ['#3A1528', '#221018', '#1A1A1A'],
  },
  {
    // Teal
    accent: '#0F766E',
    accentOnSoftLight: '#115E59',
    accentOnSoftDark: '#CCFBF1',
    soft: '#CCFBF1',
    softDark: '#134E4A',
    dark: '#042F2E',
    border: '#5EEAD4',
    borderDark: '#115E59',
    gradientLight: ['#CCFBF1', '#F0FDFA', '#FFFFFF'],
    gradientDark: ['#134E4A', '#0F2A27', '#1A1A1A'],
  },
  {
    // Amber
    accent: '#B45309',
    accentOnSoftLight: '#9A3412',
    accentOnSoftDark: '#FFEDD5',
    soft: '#FFEDD5',
    softDark: '#7C2D12',
    dark: '#431407',
    border: '#FDBA74',
    borderDark: '#9A3412',
    gradientLight: ['#FFEDD5', '#FFF7ED', '#FFFFFF'],
    gradientDark: ['#7C2D12', '#2A160C', '#1A1A1A'],
  },
  {
    // Sky
    accent: '#0369A1',
    accentOnSoftLight: '#075985',
    accentOnSoftDark: '#E0F2FE',
    soft: '#E0F2FE',
    softDark: '#0C4A6E',
    dark: '#082F49',
    border: '#7DD3FC',
    borderDark: '#075985',
    gradientLight: ['#E0F2FE', '#F0F9FF', '#FFFFFF'],
    gradientDark: ['#0C4A6E', '#0A2438', '#1A1A1A'],
  },
  {
    // Emerald
    accent: '#047857',
    accentOnSoftLight: '#065F46',
    accentOnSoftDark: '#D1FAE5',
    soft: '#D1FAE5',
    softDark: '#064E3B',
    dark: '#022C22',
    border: '#6EE7B7',
    borderDark: '#065F46',
    gradientLight: ['#D1FAE5', '#ECFDF5', '#FFFFFF'],
    gradientDark: ['#064E3B', '#0A241C', '#1A1A1A'],
  },
  {
    // Indigo
    accent: '#4338CA',
    accentOnSoftLight: '#3730A3',
    accentOnSoftDark: '#E0E7FF',
    soft: '#E0E7FF',
    softDark: '#312E81',
    dark: '#1E1B4B',
    border: '#A5B4FC',
    borderDark: '#3730A3',
    gradientLight: ['#E0E7FF', '#EEF2FF', '#FFFFFF'],
    gradientDark: ['#312E81', '#1C1A3A', '#1A1A1A'],
  },
  {
    // Rose
    accent: '#BE123C',
    accentOnSoftLight: '#9F1239',
    accentOnSoftDark: '#FFE4E6',
    soft: '#FFE4E6',
    softDark: '#881337',
    dark: '#4C0519',
    border: '#FDA4AF',
    borderDark: '#9F1239',
    gradientLight: ['#FFE4E6', '#FFF1F2', '#FFFFFF'],
    gradientDark: ['#881337', '#2A1018', '#1A1A1A'],
  },
  {
    // Cyan
    accent: '#0E7490',
    accentOnSoftLight: '#155E75',
    accentOnSoftDark: '#CFFAFE',
    soft: '#CFFAFE',
    softDark: '#164E63',
    dark: '#083344',
    border: '#67E8F9',
    borderDark: '#155E75',
    gradientLight: ['#CFFAFE', '#ECFEFF', '#FFFFFF'],
    gradientDark: ['#164E63', '#0C2833', '#1A1A1A'],
  },
  {
    // Lime / olive
    accent: '#4D7C0F',
    accentOnSoftLight: '#3F6212',
    accentOnSoftDark: '#ECFCCB',
    soft: '#ECFCCB',
    softDark: '#3F6212',
    dark: '#1A2E05',
    border: '#BEF264',
    borderDark: '#3F6212',
    gradientLight: ['#ECFCCB', '#F7FEE7', '#FFFFFF'],
    gradientDark: ['#3F6212', '#1E2A0C', '#1A1A1A'],
  },
  {
    // Slate blue
    accent: '#334155',
    accentOnSoftLight: '#1E293B',
    accentOnSoftDark: '#E2E8F0',
    soft: '#E2E8F0',
    softDark: '#1E293B',
    dark: '#0F172A',
    border: '#94A3B8',
    borderDark: '#334155',
    gradientLight: ['#E2E8F0', '#F8FAFC', '#FFFFFF'],
    gradientDark: ['#1E293B', '#151A22', '#1A1A1A'],
  },
  {
    // Coral
    accent: '#C2410C',
    accentOnSoftLight: '#9A3412',
    accentOnSoftDark: '#FFEDD5',
    soft: '#FFEDD5',
    softDark: '#7C2D12',
    dark: '#431407',
    border: '#FDBA74',
    borderDark: '#9A3412',
    gradientLight: ['#FFEDD5', '#FFF7ED', '#FFFFFF'],
    gradientDark: ['#7C2D12', '#2A160C', '#1A1A1A'],
  },
  {
    // Violet (deep)
    accent: '#6D28D9',
    accentOnSoftLight: '#5B21B6',
    accentOnSoftDark: '#EDE9FE',
    soft: '#EDE9FE',
    softDark: '#4C1D95',
    dark: '#2E1065',
    border: '#C4B5FD',
    borderDark: '#5B21B6',
    gradientLight: ['#EDE9FE', '#F5F3FF', '#FFFFFF'],
    gradientDark: ['#4C1D95', '#22144A', '#1A1A1A'],
  },
]

function hashPositive(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return (x >>> 0) % MINI_LEAGUE_PALETTES.length
}

export function getMiniLeaguePalette(miniLeagueId: number): MiniLeaguePalette {
  const id = Number(miniLeagueId)
  if (!Number.isFinite(id) || id <= 0) {
    return MINI_LEAGUE_PALETTES[0]
  }
  return MINI_LEAGUE_PALETTES[hashPositive(Math.floor(id))]
}

/** Accent / soft colors for the active competition chrome. */
export function getCompetitionPalette(
  competition: Competition,
  isDark = false,
): {
  accent: string
  /** High-contrast accent for text sitting on soft surfaces */
  label: string
  soft: string
  softHeader: string
  border: string
} {
  if (competition.type === 'mini') {
    const p = getMiniLeaguePalette(competition.id)
    return {
      accent: p.accent,
      label: isDark ? p.accentOnSoftDark : p.accentOnSoftLight,
      soft: isDark ? p.softDark : p.soft,
      softHeader: isDark ? p.dark : p.soft,
      border: isDark ? p.borderDark : p.border,
    }
  }
  if (competition.type === 'canonical') {
    return {
      accent: '#0a7ea4',
      label: isDark ? '#E0F2FE' : '#0369A1',
      soft: isDark ? '#0C4A6E' : '#E0F2FE',
      softHeader: isDark ? '#0B2838' : '#E0F2FE',
      border: isDark ? '#0369A1' : '#7DD3FC',
    }
  }
  return {
    accent: NON_CANONICAL_ACCENT,
    label: isDark ? NON_CANONICAL_ACCENT_SOFT : NON_CANONICAL_ACCENT,
    soft: isDark ? NON_CANONICAL_ACCENT_SOFT_DARK : NON_CANONICAL_ACCENT_SOFT,
    softHeader: isDark ? NON_CANONICAL_ACCENT_DARK : NON_CANONICAL_ACCENT_SOFT,
    border: isDark ? '#880E4F' : '#AD1457',
  }
}

export function isCanonicalCompetition(competition: Competition): boolean {
  return competition.type === 'canonical'
}

export function competitionModeLabel(competition: Competition): string | null {
  if (competition.type === 'mini') return 'MINI LEAGUE'
  if (competition.type === 'tournament') return 'TOURNAMENT'
  return null
}

export function competitionDisplayName(
  competition: Competition,
  canonicalLabel = 'Bangkok Darts League',
): string {
  if (competition.type === 'canonical') return canonicalLabel
  return competition.name
}

export function isMiniCompetition(
  competition: Competition,
): competition is Extract<Competition, {type: 'mini'}> {
  return competition.type === 'mini'
}

export function parseStoredCompetition(raw: string | null): Competition {
  if (!raw) return CANONICAL_COMPETITION
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.type === 'canonical') return CANONICAL_COMPETITION
    if (
      parsed?.type === 'mini' &&
      typeof parsed.id === 'number' &&
      parsed.id > 0 &&
      typeof parsed.name === 'string'
    ) {
      return {type: 'mini', id: parsed.id, name: parsed.name}
    }
    if (
      parsed?.type === 'tournament' &&
      typeof parsed.id === 'number' &&
      parsed.id > 0 &&
      typeof parsed.name === 'string'
    ) {
      return {type: 'tournament', id: parsed.id, name: parsed.name}
    }
  } catch {
    // fall through
  }
  return CANONICAL_COMPETITION
}
