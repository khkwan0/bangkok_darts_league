import {useLeagueContext} from '@/context/LeagueContext'
import config from '@/config'
import {
  type LiveCardScore,
  parseLiveCardScoreEvent,
} from '@/lib/liveCardScore'
import {SOCKET_PING_INTERVAL_MS, SOCKET_PING_TIMEOUT_MS} from '@/lib/socketAuth'
import {io, type Socket} from 'socket.io-client'
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {AppState, Platform} from 'react-native'

const ROOM = 'livescores:cards'

export type {LiveCardScore}

export type LiveCardConnection = 'connecting' | 'live' | 'offline'

type ScoreState = Record<string, LiveCardScore | null>

type LiveCardScoresValue = {
  scores: ScoreState
  connection: LiveCardConnection
}

const LiveCardScoresContext = createContext<LiveCardScoresValue | null>(null)

/**
 * Stays in the live-card room while the app is in the foreground.
 * A missing provider means cards keep the scores from the matches API.
 */
export function LiveCardScoresProvider({children}: {children: React.ReactNode}) {
  const {webSocketUrl} = useLeagueContext()
  const [scores, setScores] = useState<ScoreState>({})
  const [connection, setConnection] = useState<LiveCardConnection>('connecting')

  useEffect(() => {
    let socket: Socket | null = null
    let stopped = false

    const disconnect = () => {
      socket?.removeAllListeners()
      socket?.disconnect()
      socket = null
    }

    const connect = () => {
      if (stopped || AppState.currentState !== 'active') {
        setConnection('offline')
        return
      }
      disconnect()
      const url = webSocketUrl || config.webSocketUrl
      if (!url) {
        setConnection('offline')
        return
      }
      setConnection('connecting')
      socket = io(url, {
        autoConnect: false,
        reconnection: true,
        timeout: 30_000,
        pingInterval: SOCKET_PING_INTERVAL_MS,
        pingTimeout: SOCKET_PING_TIMEOUT_MS,
        transports:
          Platform.OS === 'web' ? ['websocket', 'polling'] : ['websocket'],
      })
      socket.on('connect', () => {
        socket?.emit('join', ROOM, (ack?: {status?: string}) => {
          if (stopped) return
          setConnection(ack?.status === 'ok' ? 'live' : 'offline')
        })
      })
      socket.on('disconnect', () => {
        if (!stopped) setConnection('offline')
      })
      socket.on('connect_error', () => {
        if (!stopped) setConnection('offline')
      })
      socket.io.on('reconnect_attempt', () => {
        if (!stopped) setConnection('connecting')
      })
      socket.on(ROOM, (payload: unknown) => {
        const event = parseLiveCardScoreEvent(payload)
        if (!event) return
        setScores(prev => ({
          ...prev,
          [String(event.matchId)]: event.score,
        }))
      })
      socket.connect()
    }

    connect()
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') connect()
      else {
        disconnect()
        setConnection('offline')
      }
    })

    return () => {
      stopped = true
      sub.remove()
      disconnect()
    }
  }, [webSocketUrl])

  const value = useMemo(() => ({scores, connection}), [scores, connection])
  return (
    <LiveCardScoresContext.Provider value={value}>
      {children}
    </LiveCardScoresContext.Provider>
  )
}

/** Undefined when this match has not been pushed yet. Null when it was cleared. */
export function useLiveCardScore(
  matchId: number,
): LiveCardScore | null | undefined {
  const scores = useContext(LiveCardScoresContext)?.scores
  if (!scores) return undefined
  const id = Number(matchId)
  if (!Number.isInteger(id) || id <= 0) return undefined
  if (!Object.prototype.hasOwnProperty.call(scores, String(id))) return undefined
  return scores[String(id)]
}

export function useLiveCardConnection(): LiveCardConnection {
  return useContext(LiveCardScoresContext)?.connection ?? 'offline'
}
