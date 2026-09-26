import {createSocketClient, loadSocketAuth} from '@/lib/socketAuth'
import {useLeagueContext} from '@/context/LeagueContext'
import React from 'react'
import type {Socket} from 'socket.io-client'

export type TournamentEditor = {
  player_id: number
  nickname: string
}

type UpdatePayload = {
  tournament_id?: number
  type?: string
  actor_id?: number | null
}

type EditorsPayload = {
  tournament_id?: number
  editors?: TournamentEditor[]
}

/**
 * Join tournament_{id} for admin edit presence + invalidate-on-change.
 * Connects while `enabled`; tears down on disable / unmount.
 */
export function useTournamentAdminSocket(opts: {
  tournamentId: number
  enabled: boolean
  onRemoteUpdate: (payload: UpdatePayload) => void
}) {
  const {tournamentId, enabled, onRemoteUpdate} = opts
  const {webSocketUrl, apiUrl, state} = useLeagueContext() as any
  const selfId = Number(state?.user?.id) || 0
  const [editors, setEditors] = React.useState<TournamentEditor[]>([])
  const onRemoteUpdateRef = React.useRef(onRemoteUpdate)
  onRemoteUpdateRef.current = onRemoteUpdate
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Prefer API host so stage API + stage sockets stay aligned.
  const socketUrl = React.useMemo(() => {
    const fromApi =
      typeof apiUrl === 'string'
        ? apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
        : ''
    if (fromApi.startsWith('http')) return fromApi
    return webSocketUrl
  }, [apiUrl, webSocketUrl])

  React.useEffect(() => {
    if (!enabled || !tournamentId || !socketUrl) {
      setEditors([])
      return
    }

    let cancelled = false
    let socket: Socket | null = null
    const room = `tournament_${tournamentId}`

    async function setup() {
      const authOptions = await loadSocketAuth({
        apiUrl,
        leagueId: state?.leagueId,
      })
      if (cancelled) return
      socket = createSocketClient(socketUrl, authOptions)

      socket.on('connect_error', err => {
        console.warn('tournament socket connect_error', err?.message)
      })

      socket.on('tournament:editors', (payload: EditorsPayload) => {
        if (Number(payload?.tournament_id) !== tournamentId) return
        setEditors(Array.isArray(payload.editors) ? payload.editors : [])
      })

      socket.on('tournament_update', (payload: UpdatePayload) => {
        if (Number(payload?.tournament_id) !== tournamentId) return
        // Do not skip by actor_id: same admin on phone + web must still refresh.
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          onRemoteUpdateRef.current(payload)
        }, 300)
      })

      socket.on('connect', () => {
        socket?.emit(
          'join',
          room,
          (ack?: {status?: string; error?: string}) => {
            if (ack?.status !== 'ok') {
              console.warn('tournament join failed', ack?.error)
            }
          },
        )
      })

      socket.connect()
    }

    setup()

    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (socket) {
        socket.emit('leave', room)
        socket.removeAllListeners()
        socket.disconnect()
      }
      setEditors([])
    }
  }, [enabled, tournamentId, socketUrl, selfId, apiUrl, state?.leagueId])

  const others = React.useMemo(
    () =>
      selfId > 0
        ? editors.filter(e => Number(e.player_id) !== selfId)
        : [],
    [editors, selfId],
  )

  return {editors, others, selfId}
}
