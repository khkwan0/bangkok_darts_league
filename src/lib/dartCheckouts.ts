/**
 * Highest possible 3-dart checkout (T20 T20 Bull).
 * Lowest is 2 (D1). Finish must end on a double (or bull = 50).
 */
export const MAX_DART_CHECKOUT = 170
export const MIN_DART_CHECKOUT = 2

/**
 * Scores that cannot be checked out in three darts ("bogey numbers").
 * @see https://en.wikipedia.org/wiki/Checkout_(darts)
 */
export const IMPOSSIBLE_DART_CHECKOUTS = new Set([
  159, 162, 163, 165, 166, 168, 169,
])

/** True if `n` is a legal checkout finish (2–170 excluding bogeys). 0 clears. */
export function isValidDartCheckout(n: number): boolean {
  const v = Math.trunc(Number(n))
  if (!Number.isFinite(v) || v < 0) return false
  if (v === 0) return true
  if (v < MIN_DART_CHECKOUT || v > MAX_DART_CHECKOUT) return false
  return !IMPOSSIBLE_DART_CHECKOUTS.has(v)
}
