import {
  useFocusEffect,
  useNavigation,
  usePathname,
  useRouter,
} from 'expo-router'
import {useCallback, useRef} from 'react'

const DOUBLE_PRESS_MS = 700

// Shared so a second tap on a different row is ignored too.
let lockedUntil = 0

type PushParams = Record<string, string | number | (string | number)[]>

/**
 * Push `suffix` onto the path of the screen that is focused.
 *
 * `usePathname()` updates as soon as the first push commits, while this
 * screen is still mounted and can still take another tap. Appending to that
 * live path stacks a route that is not registered (`…/Player/Player`).
 * The base path is frozen on focus, and further presses are ignored until
 * this screen blurs or the guard expires.
 */
export function useGuardedRelativePush() {
  const router = useRouter()
  const navigation = useNavigation()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  const basePathRef = useRef(pathname)
  const screenLocked = useRef(false)
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  pathnameRef.current = pathname

  useFocusEffect(
    useCallback(() => {
      basePathRef.current = pathnameRef.current
      screenLocked.current = false
      return () => {
        screenLocked.current = true
        if (unlockTimer.current) {
          clearTimeout(unlockTimer.current)
          unlockTimer.current = null
        }
      }
    }, []),
  )

  return useCallback(
    (suffix: string, params?: PushParams) => {
      const now = Date.now()
      if (screenLocked.current || now < lockedUntil) return
      if (!navigation.isFocused()) return
      screenLocked.current = true
      lockedUntil = now + DOUBLE_PRESS_MS
      router.push({
        pathname: `${basePathRef.current}${suffix}` as any,
        params,
      })

      unlockTimer.current = setTimeout(() => {
        unlockTimer.current = null
        if (navigation.isFocused()) screenLocked.current = false
      }, DOUBLE_PRESS_MS)
    },
    [navigation, router],
  )
}
