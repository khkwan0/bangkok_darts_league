/**
 * League-admin checks for the mobile app.
 *
 * Trust API `isAdmin` / `isSuperAdmin` only (from league_admins for the
 * current host, or platform superadmin). Never grant from role_id 9 alone —
 * that flag is global and would let pool admins act on other leagues.
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
  return false
}
