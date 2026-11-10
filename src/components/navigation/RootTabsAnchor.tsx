import {tabsAnchorReset} from '@/lib/otaNavigationRestore'
import {useNavigationContainerRef, useRootNavigationState} from 'expo-router'
import {CommonActions} from 'expo-router/react-navigation'
import {useEffect, useRef} from 'react'

/**
 * If the root stack is only Settings, teams, or another screen beside the
 * tabs, put `(tabs)` back underneath so the back button has a target.
 * The tab bar itself shows again once that screen is popped.
 */
export function RootTabsAnchor() {
  const state = useRootNavigationState()
  const navigation = useNavigationContainerRef()
  const attempted = useRef<string | null>(null)

  useEffect(() => {
    if (!state?.key || !navigation.isReady()) return
    const routes = state.routes
    if (!routes?.length) return

    const signature = `${state.key}:${routes.map(route => route.name).join('|')}`
    if (attempted.current === signature) return

    const index = typeof state.index === 'number' ? state.index : routes.length - 1
    const next = tabsAnchorReset(routes, index)
    if (!next) return

    attempted.current = signature
    navigation.dispatch(
      CommonActions.reset(
        next as Parameters<typeof CommonActions.reset>[0],
      ),
    )
  }, [navigation, state])

  return null
}
