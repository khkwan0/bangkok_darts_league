import {useLeagueContext} from '@/context/LeagueContext'
import {useLeague} from '@/hooks'
import {isMiniCompetition} from '@/types/competition'
import {router} from 'expo-router'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {AppState} from 'react-native'

export type LiveScore = {
  id: number
  home_name: string
  away_name: string
  homeScore: number | string
  awayScore: number | string
}

const REFRESH_INTERVAL_MS = 30000

const scoresKey = (items: LiveScore[]) =>
  items.map(s => `${s.id}:${s.homeScore}-${s.awayScore}`).join('|')

function matchInfoFromResponse(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== 'object') {
    return null
  }
  const payload = res as {status?: string; data?: unknown; match_id?: unknown}
  if (payload.status === 'ok' && payload.data && typeof payload.data === 'object') {
    return payload.data as Record<string, unknown>
  }
  if (typeof payload.match_id !== 'undefined') {
    return payload as Record<string, unknown>
  }
  return null
}

type LiveScoresContextValue = {
  scores: LiveScore[]
  hasLiveScores: boolean
  tickerKey: number
  navigatingMatchId: number | null
  openMatchScoresheet: (matchId: number) => void
}

const LiveScoresContext = createContext<LiveScoresContextValue | null>(null)

export function LiveScoresProvider({children}: {children: React.ReactNode}) {
  const league = useLeague()
  const {state} = useLeagueContext()
  const competition = state.competition
  const miniLeagueId = isMiniCompetition(competition) ? competition.id : null
  const [scores, setScores] = useState<LiveScore[]>([])
  const [tickerKey, setTickerKey] = useState(0)
  const [navigatingMatchId, setNavigatingMatchId] = useState<number | null>(
    null,
  )
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const scoresKeyRef = useRef('')
  const scoresCountRef = useRef(0)

  const getLiveScores = useCallback(async () => {
    try {
      const res = await league.GetLiveScores(miniLeagueId)
      if (typeof res.status !== 'undefined' && res.status === 'ok') {
        const next = Array.isArray(res.data)
          ? (res.data as unknown as LiveScore[])
          : []
        const key = scoresKey(next)
        if (key === scoresKeyRef.current) {
          return
        }

        const isFirstLoad = scoresKeyRef.current === ''
        const countChanged = next.length !== scoresCountRef.current

        scoresKeyRef.current = key
        scoresCountRef.current = next.length

        if (isFirstLoad) {
          setScores(next)
          return
        }

        if (countChanged) {
          setScores(next)
          setTickerKey(k => k + 1)
        } else {
          setScores(next)
        }
      }
    } catch (e) {
      console.log(e)
    }
  }, [league, miniLeagueId])

  const getLiveScoresRef = useRef(getLiveScores)
  getLiveScoresRef.current = getLiveScores

  useEffect(() => {
    scoresKeyRef.current = ''
    scoresCountRef.current = 0
    setScores([])
    setTickerKey(k => k + 1)
    getLiveScoresRef.current()
  }, [miniLeagueId])

  useEffect(() => {
    refreshTimer.current = setInterval(
      () => getLiveScoresRef.current(),
      REFRESH_INTERVAL_MS,
    )
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current)
      }
    }
  }, [miniLeagueId])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState !== 'active') {
        if (refreshTimer.current) {
          clearInterval(refreshTimer.current)
          refreshTimer.current = null
        }
      } else {
        getLiveScoresRef.current()
        refreshTimer.current = setInterval(
          () => getLiveScoresRef.current(),
          REFRESH_INTERVAL_MS,
        )
      }
    })
    return () => subscription.remove()
  }, [miniLeagueId])

  const navigatingRef = useRef(false)
  const openMatchScoresheet = useCallback(
    async (matchId: number) => {
      if (navigatingRef.current || !matchId) {
        return
      }
      navigatingRef.current = true
      setNavigatingMatchId(matchId)
      try {
        // @ts-expect-error useLeague exposes GetMatchById at runtime
        const res = await league.GetMatchById(matchId)
        const matchInfo = matchInfoFromResponse(res)
        if (matchInfo) {
          router.push({
            pathname: '/Match',
            params: {params: JSON.stringify(matchInfo)},
          })
          return
        }
        console.warn('LiveScores: could not load match', matchId, res)
      } catch (e) {
        console.log(e)
      } finally {
        navigatingRef.current = false
        setNavigatingMatchId(null)
      }
    },
    [league],
  )

  const value = useMemo(
    () => ({
      scores,
      hasLiveScores: scores.length > 0,
      tickerKey,
      navigatingMatchId,
      openMatchScoresheet,
    }),
    [scores, tickerKey, navigatingMatchId, openMatchScoresheet],
  )

  return (
    <LiveScoresContext.Provider value={value}>
      {children}
    </LiveScoresContext.Provider>
  )
}

export function useLiveScores(): LiveScoresContextValue {
  const ctx = useContext(LiveScoresContext)
  if (ctx == null) {
    throw new Error('useLiveScores must be used within LiveScoresProvider')
  }
  return ctx
}

/** Safe for optional use outside provider (returns null). */
export function useLiveScoresOptional(): LiveScoresContextValue | null {
  return useContext(LiveScoresContext)
}
