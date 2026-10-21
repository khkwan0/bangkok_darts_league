import {useLeagueContext} from '@/context/LeagueContext'
import {resolvePreferredTimeZone} from '@/lib/bangkokTime'

/** Preferred display timezone from user preferences (defaults to Asia/Bangkok). */
export function usePreferredTimeZone(): string {
  const {state} = useLeagueContext()
  return resolvePreferredTimeZone(state.user?.preferences)
}
