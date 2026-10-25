import {FrameType, MatchInfoDataType} from '@/components/Match/types'
import {useMatch, useTeams} from '@/hooks'
import i18n from '@/i18n'
import {hydrateFrameLegs} from '@/lib/hydrateFrameLegs'
import React, {createContext, useContext, useReducer} from 'react'
import {Alert} from 'react-native'
import {io} from 'socket.io-client'
import {useLeagueContext} from './LeagueContext'

type JoinStatusType = {
  status: string
}

type StatsType = {
  [key: string]: {
    [key: string]: {
      win: boolean
      type: string
      noPlayers: number
    }
  }
}

type TeamsType = {
  [key: string]: {
    [key: string]: {
      id: number
      nickname: string
      playerId: number
    }
  }
}

type StateType = {
  firstBreak: number | null
  frameData: FrameType[]
  teams: TeamsType
  matchInfo: MatchInfoDataType
  stats: StatsType
  history: any[]
  finalizedHome: boolean
  finalizedAway: boolean
  finalizeBusy: boolean
  /** Timestamp of last server finalize/unfinalize reject (clears local spinner). */
  finalizeRejectedAt: number
}

const MatchContext = createContext({})

const initialState: StateType = {
  firstBreak: null,
  frameData: [],
  teams: {},
  matchInfo: {} as MatchInfoDataType,
  stats: {},
  history: [],
  finalizedHome: false,
  finalizedAway: false,
  finalizeBusy: false,
  finalizeRejectedAt: 0,
}

const MatchReducer = (state: StateType, action: any) => {
  switch (action.type) {
    case 'CLEAR_MATCHSTATE': {
      return {
        firstBreak: null,
        frameData: [],
        teams: {},
        matchInfo: {} as MatchInfoDataType,
        stats: {},
        history: [],
        finalizedHome: false,
        finalizedAway: false,
        finalizeBusy: false,
        finalizeRejectedAt: 0,
      }
    }
    case 'SET_MATCHINFO': {
      return {
        ...state,
        matchInfo: action.payload,
      }
    }
    case 'SET_TEAMS': {
      return {
        ...state,
        teams: action.payload,
      }
    }
    case 'SET_PLAYER': {
      // race condition here
      // this is a get and set operation
      // can be called at the same time by incoming websocket data or
      // by user input
      const {frameIndex, playerId, side, slot} = action.payload
      const frame = {...state.frameData[frameIndex]}
      const sideKey = side === 'home' ? 'homePlayerIds' : 'awayPlayerIds'
      const statsKey = side === 'home' ? 'homePlayerStats' : 'awayPlayerStats'
      const ids = [...(frame[sideKey] ?? [])]
      const stats = [...(frame[statsKey] ?? [])]
      const emptyStat = () => ({tons: 0, heavyTons: 0, closes: 0})
      const patchLegs = (
        mutate: (legStats: {tons: number; heavyTons: number; closes: number}[]) => void,
      ) => {
        if (!Array.isArray(frame.legs) || frame.legs.length === 0) return
        frame.legs = frame.legs.map(leg => {
          const next = {
            ...leg,
            homePlayerStats: [...(leg.homePlayerStats ?? [])],
            awayPlayerStats: [...(leg.awayPlayerStats ?? [])],
          }
          mutate(side === 'home' ? next.homePlayerStats : next.awayPlayerStats)
          return next
        })
      }
      if (!playerId || Number(playerId) <= 0) {
        if (slot >= 0 && slot < ids.length) {
          ids.splice(slot, 1)
          if (slot < stats.length) stats.splice(slot, 1)
        }
        frame[sideKey] = ids.filter(
          (id: number) => id != null && Number(id) > 0,
        )
        frame[statsKey] = stats
        patchLegs(legStats => {
          if (slot >= 0 && slot < legStats.length) legStats.splice(slot, 1)
        })
      } else {
        const prev = Number(ids[slot] ?? 0)
        ids[slot] = playerId
        frame[sideKey] = ids
        while (stats.length <= slot) {
          stats.push(emptyStat())
        }
        if (prev !== Number(playerId)) {
          stats[slot] = emptyStat()
          patchLegs(legStats => {
            while (legStats.length <= slot) legStats.push(emptyStat())
            legStats[slot] = emptyStat()
          })
        }
        frame[statsKey] = stats
      }
      const _frameData = [...state.frameData]
      _frameData[frameIndex] = frame
      return {
        ...state,
        frameData: _frameData,
      }
    }
    case 'SET_WINNER': {
      const {frameIndex, winnerTeamId, goldenBreak} = action.payload
      const frame = {...state.frameData[frameIndex]}
      frame.winner = winnerTeamId
      frame.goldenBreak = goldenBreak
      const _frameData = [...state.frameData]
      _frameData[frameIndex] = frame
      return {
        ...state,
        frameData: _frameData,
      }
    }
    case 'SET_FRAME_STATS': {
      const {frameIndex, ...stats} = action.payload
      const next: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(stats)) {
        if (v !== undefined) next[k] = v
      }
      const frame = hydrateFrameLegs({
        ...state.frameData[frameIndex],
        ...next,
      } as FrameType)
      const _frameData = [...state.frameData]
      _frameData[frameIndex] = frame
      return {
        ...state,
        frameData: _frameData,
      }
    }
    case 'CLEAR_WINNER': {
      const {frameIdx} = action.payload
      const frame = {...state.frameData[frameIdx]}
      frame.winner = 0
      frame.homeScore = 0
      frame.awayScore = 0
      frame.legs = []
      const _frameData = [...state.frameData]
      _frameData[frameIdx] = frame
      return {
        ...state,
        frameData: _frameData,
      }
    }
    case 'SET_FIRSTBREAK': {
      return {
        ...state,
        firstBreak: action.payload,
      }
    }
    case 'SET_FIRST_DART': {
      const {frameIndex, firstDart} = action.payload
      const frame = {...state.frameData[frameIndex], firstDart}
      const _frameData = [...state.frameData]
      _frameData[frameIndex] = frame
      return {
        ...state,
        frameData: _frameData,
      }
    }
    case 'SET_FRAMES': {
      const frames = Array.isArray(action.payload)
        ? action.payload.map((f: FrameType) => hydrateFrameLegs(f))
        : action.payload
      return {
        ...state,
        frameData: frames,
      }
    }
    case 'SET_STATS': {
      return {
        ...state,
        stats: action.payload,
      }
    }
    case 'SET_HISTORY': {
      return {
        ...state,
        history: action.payload,
      }
    }
    case 'SET_FINALIZED_HOME': {
      return {
        ...state,
        finalizedHome: action.payload,
      }
    }
    case 'SET_FINALIZED_AWAY': {
      return {
        ...state,
        finalizedAway: action.payload,
      }
    }
    case 'SET_FINALIZE_BUSY': {
      return {
        ...state,
        finalizeBusy: !!action.payload,
      }
    }
    case 'SET_FINALIZE_REJECTED_AT': {
      return {
        ...state,
        finalizeBusy: false,
        finalizeRejectedAt: Number(action.payload) || Date.now(),
      }
    }
    default:
      return state
  }
}

export const MatchProvider = (props: any) => {
  const [state, dispatch] = useReducer(MatchReducer, initialState)
  const {state: leagueState, webSocketUrl}: any = useLeagueContext()
  const matchHooks = useMatch()
  const teams = useTeams()
  const roomId = React.useRef('')
  const socket = React.useRef<ReturnType<typeof io> | null>(null)
  const userIdRef = React.useRef<number>(0)

  const matchInfoRef = React.useRef({})

  React.useEffect(() => {
    userIdRef.current = Number(leagueState.user?.id ?? 0)
  }, [leagueState.user?.id])

  React.useEffect(() => {
    matchInfoRef.current = state.matchInfo
    UpdateTeams()
  }, [state.matchInfo])

  // Recreate socket when domain changes and set up event listeners
  React.useEffect(() => {
    // Disconnect old socket if it exists
    if (socket.current) {
      socket.current.removeAllListeners()
      socket.current.disconnect()
    }

    // Create new socket with updated domain
    socket.current = io(webSocketUrl, {autoConnect: false})

    const currentSocket = socket.current

    // Set up event listeners
    const handleConnect = () => {
      console.log('connected: ', currentSocket.connected)
      JoinRoom()
    }

    const handleDisconnect = () => {
      console.log('disconnect')
    }

    const handleMatchUpdate = (data: any) => {
      if (typeof data.type !== 'undefined') {
        if (data.type === 'firstbreak') {
          const breakId = Number(data?.data?.firstBreak ?? 0)
          dispatch({
            type: 'SET_FIRSTBREAK',
            payload: breakId > 0 ? breakId : null,
          })
        } else if (data.type === 'finalize') {
          if (
            typeof data?.data?.side !== 'undefined' &&
            data.data.side === 'home'
          ) {
            dispatch({type: 'SET_FINALIZED_HOME', payload: true})
          } else if (
            typeof data?.data?.side !== 'undefined' &&
            data.data.side === 'away'
          ) {
            dispatch({type: 'SET_FINALIZED_AWAY', payload: true})
          }
        } else if (data.type === 'unfinalize') {
          const side = data?.data?.side
          if (side === 'both' || side === 'all') {
            dispatch({type: 'SET_FINALIZED_HOME', payload: false})
            dispatch({type: 'SET_FINALIZED_AWAY', payload: false})
          } else if (side === 'home') {
            dispatch({type: 'SET_FINALIZED_HOME', payload: false})
          } else if (side === 'away') {
            dispatch({type: 'SET_FINALIZED_AWAY', payload: false})
          }
        } else if (data.type === 'finalize_busy') {
          dispatch({
            type: 'SET_FINALIZE_BUSY',
            payload: !!data?.data?.busy,
          })
        } else if (data.type === 'finalize_error') {
          dispatch({
            type: 'SET_FINALIZE_REJECTED_AT',
            payload: Date.now(),
          })
          const forUser =
            Number(data?.data?.playerId) === userIdRef.current
          if (forUser) {
            const reason = String(data?.data?.reason ?? '')
            const msgKey = [
              'not_authorized',
              'already_completed',
              'finalize_busy',
              'missing_player_or_team',
            ].includes(reason)
              ? `finalize_error_${reason}`
              : 'finalize_error'
            Alert.alert(i18n.t('error'), i18n.t(msgKey))
          }
        }
      }
    }

    const handleFrameUpdate = (data: any) => {
      if (typeof data.type !== 'undefined') {
        if (data.type === 'win') {
          dispatch({
            type: 'SET_WINNER',
            payload: {
              frameIndex: data.frameIdx,
              winnerTeamId: data.winnerTeamId,
              goldenBreak: data?.goldenBreak ?? false,
            },
          })
        } else if (data.type === 'win_rejected') {
          const reason = String(data.reason ?? 'unknown')
          const messageKey =
            reason === 'frame_not_found'
              ? 'win_rejected_frame_not_found'
              : reason === 'no_winning_players'
                ? 'win_rejected_no_winning_players'
                : 'win_rejected_unknown'
          Alert.alert(i18n.t('win_rejected_title'), i18n.t(messageKey))
        } else if (data.type === 'players') {
          ;(async () => {
            if (typeof data.newPlayer !== 'undefined' && data.newPlayer) {
              UpdateTeams()
            }
            dispatch({
              type: 'SET_PLAYER',
              payload: {
                frameIndex: data.frameIdx,
                playerId: data.playerId,
                nickname: data.nickname,
                slot: data.playerIdx,
                side: data.side,
              },
            })
          })()
        } else if (data.type === 'clearwin') {
          console.log('clearwin', data)
          dispatch({
            type: 'CLEAR_WINNER',
            payload: {
              frameIdx: data.frameIdx,
            },
          })
        } else if (data.type === 'framestats') {
          dispatch({
            type: 'SET_FRAME_STATS',
            payload: {
              frameIndex: data.frameIdx,
              homeTons: data.homeTons,
              awayTons: data.awayTons,
              homeHeavyTons: data.homeHeavyTons,
              awayHeavyTons: data.awayHeavyTons,
              homeCloses: data.homeCloses,
              awayCloses: data.awayCloses,
              homePlayerStats: data.homePlayerStats,
              awayPlayerStats: data.awayPlayerStats,
              legs: data.legs,
              homeScore: data.homeScore,
              awayScore: data.awayScore,
              homeBoardScore: data.homeBoardScore,
              awayBoardScore: data.awayBoardScore,
              winner: data.winner,
              games: data.games,
            },
          })
        } else if (data.type === 'firstdart') {
          dispatch({
            type: 'SET_FIRST_DART',
            payload: {
              frameIndex: data.frameIdx,
              firstDart: Number(data.firstDart ?? 0),
            },
          })
        }
      }
    }

    const handleHistoryUpdate = (data: any) => {
      dispatch({type: 'SET_HISTORY', payload: data})
    }

    currentSocket.on('connect', handleConnect)
    currentSocket.on('disconnect', handleDisconnect)
    currentSocket.on('match_update', handleMatchUpdate)
    currentSocket.on('frame_update', handleFrameUpdate)
    currentSocket.on('historyupdate2', handleHistoryUpdate)

    // Reconnect if we were previously connected to a room
    if (roomId.current) {
      currentSocket.connect()
    }

    // Cleanup on unmount or domain change
    return () => {
      currentSocket.off('connect', handleConnect)
      currentSocket.off('disconnect', handleDisconnect)
      currentSocket.off('match_update', handleMatchUpdate)
      currentSocket.off('frame_update', handleFrameUpdate)
      currentSocket.off('historyupdate2', handleHistoryUpdate)
      currentSocket.removeAllListeners()
      currentSocket.disconnect()
    }
  }, [webSocketUrl])

  React.useEffect(() => {
    if (
      typeof state.matchInfo !== 'undefined' &&
      state.matchInfo &&
      typeof state.frameData !== 'undefined' &&
      Object.keys(state.frameData).length > 0 &&
      state.matchInfo.initialFrames
    ) {
      const stats: StatsType = {}
      state.frameData.forEach((frame: FrameType, index: number) => {
        const initial = state.matchInfo.initialFrames![index]
        const meta = {
          type: initial?.type || frame.type || '',
          noPlayers: frame.noPlayers ?? initial?.noPlayers ?? 1,
        }
        if (typeof frame.winner !== 'undefined' && frame.winner) {
          if (frame.winner === state.matchInfo.home_team_id) {
            frame.homePlayerIds.forEach((playerId: number) => {
              const key = `p${playerId}`
              if (typeof stats[key] === 'undefined') {
                stats[key] = {}
              }
              stats[key][`frame${index}`] = {
                win: true,
                ...meta,
              }
            })
            frame.awayPlayerIds.forEach((playerId: number) => {
              const key = `p${playerId}`
              if (typeof stats[key] === 'undefined') {
                stats[key] = {}
              }
              stats[key][`frame${index}`] = {
                win: false,
                ...meta,
              }
            })
          } else {
            frame.homePlayerIds.forEach((playerId: number) => {
              const key = `p${playerId}`
              if (typeof stats[key] === 'undefined') {
                stats[key] = {}
              }
              stats[key][`frame${index}`] = {
                win: false,
                ...meta,
              }
            })
            frame.awayPlayerIds.forEach((playerId: number) => {
              const key = `p${playerId}`
              if (typeof stats[key] === 'undefined') {
                stats[key] = {}
              }
              stats[key][`frame${index}`] = {
                win: true,
                ...meta,
              }
            })
          }
        }
      })
      dispatch({type: 'SET_STATS', payload: stats})
    }
  }, [state.frameData])

  function UpdateFramePlayers(
    frameIdx: number,
    side: string,
    slot: number,
    playerId: number,
    nickname: string,
    newPlayer = false,
    frameType?: string,
    frameNumber?: number,
  ) {
    /*
    dispatch({
      type: 'SET_PLAYER',
      payload: {
        frameIndex: frameIdx,
        playerId: playerId,
        slot: slot,
        side: side,
      },
    })
      */

    const initial = state.matchInfo.initialFrames?.[frameIdx]
    const data = {
      frameNumber: frameNumber ?? initial?.frameNumber ?? 0,
      frameIdx: frameIdx,
      matchId: state.matchInfo.match_id,
      side: side,
      playerId: playerId,
      nickname: nickname,
      playerIdx: slot,
      newPlayer: newPlayer,
      frameType: frameType || initial?.type || '',
      mfpp: initial?.mfpp || 0,
    }
    SocketSend('players', data)
  }

  function UpdateFirstBreak(teamId: number | string | null) {
    // Unused on darts (per-game first dart). Kept for API compatibility.
    const breakId =
      teamId == null || teamId === '' ? 0 : parseInt(String(teamId), 10)
    const normalized = Number.isFinite(breakId) && breakId > 0 ? breakId : 0
    dispatch({
      type: 'SET_FIRSTBREAK',
      payload: normalized > 0 ? normalized : null,
    })
  }

  function UpdateFirstDart(frameIdx: number, teamId: number | string | null) {
    const dartId =
      teamId == null || teamId === '' ? 0 : parseInt(String(teamId), 10)
    const normalized = Number.isFinite(dartId) && dartId > 0 ? dartId : 0
    const initial = state.matchInfo.initialFrames?.[frameIdx]
    const frame = state.frameData[frameIdx]
    dispatch({
      type: 'SET_FIRST_DART',
      payload: {frameIndex: frameIdx, firstDart: normalized},
    })
    SocketSend('firstdart', {
      frameIdx,
      frameNumber: frame?.frameNumber ?? initial?.frameNumber ?? 0,
      firstDart: normalized,
      frameType: frame?.type || initial?.type || '',
      mfpp: initial?.mfpp || 0,
    })
  }

  function countPlayers(ids?: number[]) {
    if (!Array.isArray(ids)) return 0
    return ids.filter(id => id != null && Number(id) > 0).length
  }

  function UpdateFrameWin(
    side: string,
    frameIdx: string,
    winnerTeamId: string,
    goldenBreak: boolean,
  ) {
    const idx = parseInt(String(frameIdx), 10)
    const frame = state.frameData[idx]
    const initial = state.matchInfo.initialFrames?.[idx]
    if (!frame) {
      Alert.alert(
        i18n.t('win_rejected_title'),
        i18n.t('win_rejected_frame_not_found'),
      )
      return
    }
    const minNeeded = Math.max(
      1,
      Number(
        frame?.minPlayers ??
          frame?.noPlayers ??
          initial?.minPlayers ??
          initial?.noPlayers ??
          1,
      ) || 1,
    )
    const homePlayerCount = countPlayers(frame.homePlayerIds)
    const awayPlayerCount = countPlayers(frame.awayPlayerIds)
    const playerIds =
      side === 'home' ? frame.homePlayerIds : frame.awayPlayerIds
    const homeOk = homePlayerCount >= minNeeded
    const awayOk = awayPlayerCount >= minNeeded
    if (homeOk && awayOk) {
      const data = {
        side: side,
        matchId: state.matchInfo.match_id,
        frameIdx: idx,
        frameNumber: frame.frameNumber,
        winnerTeamId: winnerTeamId,
        playerIds: playerIds.filter(
          (id: number) => id != null && Number(id) > 0,
        ),
        goldenBreak: goldenBreak,
        homeTeamId: state.matchInfo.home_team_id,
        awayTeamId: state.matchInfo.away_team_id,
        games: frame.games ?? initial?.games ?? 1,
        seriesMode: frame.seriesMode ?? initial?.seriesMode,
      }
      SocketSend('win', data)
      return
    }
    const shortSides: string[] = []
    if (!homeOk) shortSides.push(i18n.t('home'))
    if (!awayOk) shortSides.push(i18n.t('away'))
    Alert.alert(
      i18n.t('players_required_title'),
      i18n.t('players_required_message', {
        count: minNeeded,
        home: homePlayerCount,
        away: awayPlayerCount,
        sides: shortSides.join(', '),
      }),
    )
  }

  function UpdateFrameStats(
    frameIdx: number,
    side: 'home' | 'away',
    field: 'tons' | 'heavyTons' | 'closes' | 'games' | 'boardScore',
    delta: number,
    playerIdx: number = 0,
    legIndex?: number,
  ) {
    const frame = state.frameData[frameIdx]
    const initial = state.matchInfo.initialFrames?.[frameIdx]
    const data = {
      matchId: state.matchInfo.match_id,
      frameIdx,
      frameNumber: frame?.frameNumber ?? 0,
      side,
      field,
      delta,
      games: frame?.games ?? initial?.games ?? 1,
      seriesMode: frame?.seriesMode ?? initial?.seriesMode,
      frameType: frame?.type ?? initial?.type ?? '',
      mfpp: frame?.mfpp ?? initial?.mfpp ?? 0,
      homeTeamId: state.matchInfo.home_team_id,
      awayTeamId: state.matchInfo.away_team_id,
      playerIdx,
      ...(typeof legIndex === 'number' ? {legIndex} : {}),
      playerId: 0,
      winnerTeamId: 0,
      goldenBreak: false,
      newPlayer: false,
    }
    SocketSend('framestats', data)

    // A 180 is also a ton — mirror 180 adjustments onto tons.
    if (field === 'heavyTons') {
      if (delta < 0) {
        const statsKey = side === 'home' ? 'homePlayerStats' : 'awayPlayerStats'
        const tonsFromLeg =
          typeof legIndex === 'number'
            ? Number(frame?.legs?.[legIndex]?.[statsKey]?.[playerIdx]?.tons ?? 0)
            : null
        const tons =
          tonsFromLeg != null
            ? tonsFromLeg
            : Number(frame?.[statsKey]?.[playerIdx]?.tons ?? 0)
        if (tons <= 0) return
      }
      SocketSend('framestats', {...data, field: 'tons'})
    }
  }

  function ClearFrameWinner(frameIdx: number) {
    const data = {
      frameIdx: frameIdx,
      matchId: state.matchInfo.match_id,
    }
    SocketSend('clearwin', data)
  }

  function FinalizeMatch(side: string, teamId: number) {
    const data = {
      teamId: teamId,
      side: side,
      matchId: state.matchInfo.match_id,
    }
    SocketSend('finalize', data)
  }

  function UnfinalizeMatch(side: string, teamId: number) {
    const data = {
      teamId: teamId,
      side: side,
      matchId: state.matchInfo.match_id,
    }
    SocketSend('unfinalize', data)
  }

  async function UpdateTeams() {
    const {home_team_id, away_team_id, match_id} =
      matchInfoRef.current as MatchInfoDataType
    try {
      if (home_team_id && away_team_id) {
        const _teams: TeamsType = {}
        const matchId = match_id != null ? Number(match_id) : null
        const _homePlayers = await teams.GetPlayers(home_team_id, true, matchId)
        const _awayPlayers = await teams.GetPlayers(away_team_id, true, matchId)
        const homePlayers: TeamsType[string] = {}
        const awayPlayers: TeamsType[string] = {}
        _homePlayers.data.forEach(
          (player: {playerId: number; nickname: string; id: number}) => {
            homePlayers[player.playerId] = player
          },
        )
        _awayPlayers.data.forEach(
          (player: {playerId: number; nickname: string; id: number}) => {
            awayPlayers[player.playerId] = player
          },
        )
        _teams[home_team_id] = homePlayers
        _teams[away_team_id] = awayPlayers
        dispatch({type: 'SET_TEAMS', payload: _teams})
      }
    } catch (e) {
      console.log('ERR UpdateTeams', e)
    }
  }

  function SocketConnect(_room: string) {
    roomId.current = _room
    if (socket.current && !socket.current.connected) {
      socket.current.connect()
    }
  }

  function SocketDisconnect() {
    if (socket.current) {
      socket.current.disconnect()
    }
  }

  function JoinRoom() {
    if (socket.current) {
      socket.current.emit('join', roomId.current, (status: JoinStatusType) => {
        console.log(status)
      })
    }
  }

  function SocketSend(
    type = '',
    data = {},
    dest = '',
    userId = 0,
    nickname = '',
  ) {
    const toSend = {
      type: type,
      matchId: state.matchInfo.match_id,
      timestamp: Date.now(),
      playerId: leagueState.user.id ?? 0,
      nickname: leagueState.user.nickname ?? '',
      dest: dest,
      data: {...data},
    }
    if (socket.current) {
      if (socket.current.connected) {
        socket.current.emit('matchupdate', toSend)
      } else {
        socket.current.connect()
        socket.current.once('connect', () => {
          if (socket.current) {
            socket.current.emit('matchupdate', toSend)
          }
        })
      }
    }
  }
  /*
  React.useEffect(() => {
    ;(async () => {
      try {
        const _matchInfo = await matchHooks.GetMatchInfo(
          props.matchInfo.match_id,
        )
        console.log(_matchInfo)
        if (
          typeof _matchInfo.firstBreak !== 'undefined' &&
          _matchInfo.firstBreak
        ) {
          dispatch({type: 'SET_FIRSTBREAK', payload: _matchInfo.firstBreak})
        }
      } catch (e) {
        console.log('Match provider error', e)
      }
    })()
  }, [])
  */

  return (
    <MatchContext.Provider
      value={{
        state,
        dispatch,
        ClearFrameWinner,
        FinalizeMatch,
        SocketConnect,
        SocketDisconnect,
        UnfinalizeMatch,
        UpdateFirstBreak,
        UpdateFirstDart,
        UpdateFramePlayers,
        UpdateFrameStats,
        UpdateFrameWin,
        UpdateTeams,
      }}>
      {props.children}
    </MatchContext.Provider>
  )
}

export const useMatchContext = () => useContext(MatchContext)
