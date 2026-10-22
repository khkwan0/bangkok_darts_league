/**
 * Practical regular-width cutoff (~iOS regular size class).
 * Tune on Duo Device Hub if cover/inner boundaries feel off.
 *
 * Device Hub re-test checklist (Xcode 27.1+):
 * - Cover (closed): compact, portrait tabs, modal number pad
 * - Inner landscape: regular split panes, NativeTabs side rail
 * - Book / partial fold: wider gutter, vertical split when taller than wide
 * - Split View multitasking: asymmetric safe areas on both edges
 */
export const REGULAR_WIDTH_BREAKPOINT = 700
