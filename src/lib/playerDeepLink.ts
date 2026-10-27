import {domain} from '@/config'

/** HTTPS universal-link host for player profile deep links. */
export const PLAYER_DEEP_LINK_HOST = domain

/** Path segment used by Expo Router and the website fallback. */
export const PLAYER_DEEP_LINK_PATH = 'player'

/**
 * Universal link that opens the app to a player's profile
 * (`https://darts.bkkleague.com/player/{id}`).
 */
export function playerProfileUniversalUrl(playerId: number | string): string {
  const id = Number(playerId)
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('Invalid player id for profile link')
  }
  return `https://${PLAYER_DEEP_LINK_HOST}/${PLAYER_DEEP_LINK_PATH}/${Math.trunc(id)}`
}
