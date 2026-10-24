/**
 * FAB quick-actions catalog: union of Settings destinations + FAB-only items.
 * Preference stores an ordered list of visible ids; null = DEFAULT_FAB_QUICK_ACTIONS.
 */

import type {ComponentProps} from 'react'
import type MCI from '@expo/vector-icons/MaterialCommunityIcons'

export type QuickActionId =
  | 'support'
  | 'announcements'
  | 'forums'
  | 'achievements'
  | 'ai_assistant'
  | 'settings'
  | 'teams'
  | 'tournaments'
  | 'coin_flip'
  | 'change_league'
  | 'info_and_guides'
  | 'admin'
  | 'statistics'
  | 'venues'
  | 'players'
  | 'betting'
  | 'predictions'
  | 'preferences'
  | 'login'
  | 'logout'

export type QuickActionDef = {
  id: QuickActionId
  /** i18n key for the label */
  labelKey: string
  icon: ComponentProps<typeof MCI>['name']
  iconColor: string
  iconBackground: string
}

/** Current FAB sheet order — reset target when preference is cleared. */
export const DEFAULT_FAB_QUICK_ACTIONS: QuickActionId[] = [
  'support',
  'announcements',
  'forums',
  'achievements',
  'ai_assistant',
  'settings',
  'teams',
  'tournaments',
  'coin_flip',
  'change_league',
  'info_and_guides',
]

/** Full catalog (Settings + FAB), no duplicates. Order is display order in prefs UI for hidden chips. */
export const ALL_QUICK_ACTIONS: QuickActionId[] = [
  'support',
  'announcements',
  'forums',
  'achievements',
  'ai_assistant',
  'settings',
  'admin',
  'teams',
  'tournaments',
  'statistics',
  'change_league',
  'info_and_guides',
  'venues',
  'players',
  'coin_flip',
  'betting',
  'predictions',
  'preferences',
  'login',
  'logout',
]

const ALL_IDS = new Set<string>(ALL_QUICK_ACTIONS)

export const QUICK_ACTION_DEFS: Record<QuickActionId, QuickActionDef> = {
  support: {
    id: 'support',
    labelKey: 'support',
    icon: 'lifebuoy',
    iconColor: '#0EA5E9',
    iconBackground: 'rgba(14, 165, 233, 0.15)',
  },
  announcements: {
    id: 'announcements',
    labelKey: 'announcements',
    icon: 'bullhorn-outline',
    iconColor: '#FF9800',
    iconBackground: 'rgba(255, 152, 0, 0.15)',
  },
  forums: {
    id: 'forums',
    labelKey: 'forums',
    icon: 'forum-outline',
    iconColor: '#2196F3',
    iconBackground: 'rgba(33, 150, 243, 0.15)',
  },
  achievements: {
    id: 'achievements',
    labelKey: 'achievements',
    icon: 'trophy-variant',
    iconColor: '#EAB308',
    iconBackground: 'rgba(234, 179, 8, 0.15)',
  },
  ai_assistant: {
    id: 'ai_assistant',
    labelKey: 'ai_assistant',
    icon: 'robot-outline',
    iconColor: '#9C27B0',
    iconBackground: 'rgba(156, 39, 176, 0.15)',
  },
  settings: {
    id: 'settings',
    labelKey: 'settings',
    icon: 'cog',
    iconColor: '#0a7ea4',
    iconBackground: 'rgba(10, 126, 164, 0.12)',
  },
  teams: {
    id: 'teams',
    labelKey: 'teams',
    icon: 'account-group',
    iconColor: '#4CAF50',
    iconBackground: 'rgba(76, 175, 80, 0.15)',
  },
  tournaments: {
    id: 'tournaments',
    labelKey: 'tournaments',
    icon: 'trophy',
    iconColor: '#B45309',
    iconBackground: 'rgba(180, 83, 9, 0.15)',
  },
  coin_flip: {
    id: 'coin_flip',
    labelKey: 'coin_flip',
    icon: 'hand-coin',
    iconColor: '#F59E0B',
    iconBackground: 'rgba(245, 158, 11, 0.15)',
  },
  change_league: {
    id: 'change_league',
    labelKey: 'change_league',
    icon: 'trophy-outline',
    iconColor: '#E91E63',
    iconBackground: 'rgba(233, 30, 99, 0.15)',
  },
  info_and_guides: {
    id: 'info_and_guides',
    labelKey: 'info_and_guides',
    icon: 'information-outline',
    iconColor: '#FF9800',
    iconBackground: 'rgba(255, 152, 0, 0.15)',
  },
  admin: {
    id: 'admin',
    labelKey: 'admin',
    icon: 'account-group',
    iconColor: '#6366F1',
    iconBackground: 'rgba(99, 102, 241, 0.15)',
  },
  statistics: {
    id: 'statistics',
    labelKey: 'statistics',
    icon: 'chart-areaspline-variant',
    iconColor: '#2196F3',
    iconBackground: 'rgba(33, 150, 243, 0.15)',
  },
  venues: {
    id: 'venues',
    labelKey: 'venues',
    icon: 'map-marker',
    iconColor: '#E91E63',
    iconBackground: 'rgba(233, 30, 99, 0.15)',
  },
  players: {
    id: 'players',
    labelKey: 'players',
    icon: 'account-outline',
    iconColor: '#3B82F6',
    iconBackground: 'rgba(59, 130, 246, 0.15)',
  },
  betting: {
    id: 'betting',
    labelKey: 'betting_settings',
    icon: 'chart-line',
    iconColor: '#10B981',
    iconBackground: 'rgba(16, 185, 129, 0.15)',
  },
  predictions: {
    id: 'predictions',
    labelKey: 'predictions_settings',
    icon: 'crystal-ball',
    iconColor: '#0EA5E9',
    iconBackground: 'rgba(14, 165, 233, 0.15)',
  },
  preferences: {
    id: 'preferences',
    labelKey: 'preferences',
    icon: 'cog',
    iconColor: '#0a7ea4',
    iconBackground: 'rgba(10, 126, 164, 0.12)',
  },
  login: {
    id: 'login',
    labelKey: 'login',
    icon: 'login',
    iconColor: '#0a7ea4',
    iconBackground: 'rgba(10, 126, 164, 0.12)',
  },
  logout: {
    id: 'logout',
    labelKey: 'logout',
    icon: 'logout',
    iconColor: '#ef4444',
    iconBackground: 'rgba(239, 68, 68, 0.10)',
  },
}

export function isQuickActionId(value: unknown): value is QuickActionId {
  return typeof value === 'string' && ALL_IDS.has(value)
}

export function sanitizeQuickActions(
  actions: unknown,
): QuickActionId[] | null {
  if (actions == null) return null
  if (!Array.isArray(actions)) return null
  const seen = new Set<string>()
  const out: QuickActionId[] = []
  for (const raw of actions) {
    if (!isQuickActionId(raw) || seen.has(raw)) continue
    seen.add(raw)
    out.push(raw)
  }
  return out.length > 0 ? out : null
}

/** null / invalid stored value → default FAB order. */
export function resolveFabQuickActions(
  stored: unknown,
): QuickActionId[] {
  return sanitizeQuickActions(stored) ?? [...DEFAULT_FAB_QUICK_ACTIONS]
}

/**
 * Actions offered in Settings → Preferences → Quick actions.
 * Betting is hidden from the catalog; Admin only for league admins.
 */
export function getPreferenceQuickActionIds(isAdmin: boolean): QuickActionId[] {
  return ALL_QUICK_ACTIONS.filter(id => {
    if (id === 'betting') return false
    if (id === 'admin') return isAdmin
    return true
  })
}

/** Drop ids that must not appear in the preference editor for this user. */
export function filterPreferenceQuickActions(
  ids: QuickActionId[],
  isAdmin: boolean,
): QuickActionId[] {
  const allowed = new Set(getPreferenceQuickActionIds(isAdmin))
  return ids.filter(id => allowed.has(id))
}
