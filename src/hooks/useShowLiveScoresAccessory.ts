import {useLeagueContext} from '@/context/LeagueContext'
import {useLiveScoresOptional} from '@/context/LiveScoresContext'
import {usePathname} from 'expo-router'

/**
 * BottomAccessory live crawl: Home tab (incl. mini-league home) and live Match
 * scoresheet only. Hidden on other tabs / completed match routes.
 */
export function useShowLiveScoresAccessory(): boolean {
  const {state} = useLeagueContext()
  const live = useLiveScoresOptional()
  const pathname = usePathname() ?? ''
  const prefOn =
    typeof state.showLiveScores === 'undefined' || state.showLiveScores

  if (!prefOn || !live?.hasLiveScores) {
    return false
  }

  // Live scoresheet (home stack)
  if (
    pathname === '/Match' ||
    pathname.startsWith('/Match/') ||
    pathname.endsWith('/Match')
  ) {
    // Exclude completed / stats match detail routes
    if (
      pathname.includes('completed') ||
      pathname.includes('statistics') ||
      pathname.includes('Completed')
    ) {
      return false
    }
    return true
  }

  // Home tab root (canonical or mini-league)
  if (
    pathname === '/' ||
    pathname === '' ||
    pathname === '/(tabs)/(index)' ||
    pathname.endsWith('/(index)') ||
    pathname.endsWith('/(index)/')
  ) {
    return true
  }

  return false
}
