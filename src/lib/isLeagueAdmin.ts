/**
 * League-admin checks for the mobile app.
 *
 * Prefer API `isAdmin` / `isSuperAdmin` (from league_admins for the current
 * host, or platform superadmin). Only fall back to role_id when the API has
 * not yet attached flags (older cached sessions). If `isAdmin` is explicitly
 * false, do not grant access via legacy role_id 9 — that keeps pool admins
 * from seeing admin UI on other leagues.
 */

export type AdminUserLike = {
  isAdmin?: boolean
  isSuperAdmin?: boolean
  role_id?: number | string | null
} | null | undefined

export function isSuperAdminUser(user: AdminUserLike): boolean {
  if (!user) return false
  if (user.isSuperAdmin === true) return true
  if (user.isSuperAdmin === false) return false
  return Number(user.role_id) === 10
}

/** True if the user can admin the current API host's league. */
export function isLeagueAdmin(user: AdminUserLike): boolean {
  if (!user) return false
  if (user.isAdmin === true) return true
  if (isSuperAdminUser(user)) return true
  // Explicit API denial for this host — do not fall back to role_id 9.
  if (user.isAdmin === false) return false
  // Legacy cached session without isAdmin: role_id 9 was global site admin.
  return Number(user.role_id) === 9
}
