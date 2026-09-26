export const TAB_FAB_SIZE = 56
export const TAB_FAB_RING_SIZE = TAB_FAB_SIZE + 8
export const TAB_FAB_LIFT = TAB_FAB_SIZE / 4
export const TAB_BAR_MIN_HEIGHT = 49

/** Bottom inset so scroll content clears the elevated quick-action button. */
export function getTabFabOverflowInset(extra = 28) {
  return TAB_FAB_LIFT + Math.ceil(TAB_FAB_RING_SIZE / 2) + extra
}
