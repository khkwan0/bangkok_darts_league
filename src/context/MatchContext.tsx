import { FrameType, MatchInfoDataType } from '@/components/Match/types'
import { useMatch, useTeams } from '@/hooks'
import React, { createContext, useContext, useReducer } from 'react'
import { io } from 'socket.io-client'
import { useLeagueContext } from './LeagueContext'

type JoinStatusType = {
  status: string
}

type StatsType = {
  [key: string]: {
    [key: string]: {
      win: boolean
      type: string
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
        finalizedHome: false,
        finalizedAway: false,
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
      if (side === 'home') {
        frame.homePlayerIds[slot] = playerId
      } else {
        frame.awayPlayerIds[slot] = playerId
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
    case 'CLEAR_WINNER': {
      const {frameIdx} = action.payload
      const frame = {...state.frameData[frameIdx]}
      frame.winner = 0
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
    case 'SET_FRAMES': {
      return {
        ...state,
        frameData: action.payload,
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

  const matchInfoRef = React.useRef({})

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
          dispatch({
            type: 'SET_FIRSTBREAK',
            payload: data.data.firstBreak,
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
          if (
            typeof data?.data?.side !== 'undefined' &&
            data.data.side === 'home'
          ) {
            dispatch({type: 'SET_FINALIZED_HOME', payload: false})
          } else if (
            typeof data?.data?.side !== 'undefined' &&
            data.data.side === 'away'
          ) {
            dispatch({type: 'SET_FINALIZED_AWAY', payload: false})
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
        if (typeof frame.winner !== 'undefined' && frame.winner) {
          if (frame.winner === state.matchInfo.home_team_id) {
            frame.homePlayerIds.forEach((playerId: number) => {
              const key = `p${playerId}`
              if (typeof stats[key] === 'undefined') {
                stats[key] = {}
              }
              stats[key][`frame${index}`] = {
                win: true,
                type: state.matchInfo.initialFrames![index]?.type || '',
              }
            })
            frame.awayPlayerIds.forEach((playerId: number) => {
              const key = `p${playerId}`
              if (typeof stats[key] === 'undefined') {
                stats[key] = {}
              }
              stats[key][`frame${index}`] = {
                win: false,
                type: state.matchInfo.initialFrames![index]?.type || '',
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
                type: state.matchInfo.initialFrames![index]?.type || '',
              }
            })
            frame.awayPlayerIds.forEach((playerId: number) => {
              const key = `p${playerId}`
              if (typeof stats[key] === 'undefined') {
                stats[key] = {}
              }
              stats[key][`frame${index}`] = {
                win: true,
                type: state.matchInfo.initialFrames![index]?.type || '',
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
    frameType = '9d',
    frameNumber: number,
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

    const data = {
      frameNumber: frameNumber,
      frameIdx: frameIdx,
      matchId: state.matchInfo.match_id,
      side: side,
      playerId: playerId,
      nickname: nickname,
      playerIdx: slot,
      newPlayer: newPlayer,
      frameType: frameType,
      mfpp: state.matchInfo.initialFrames?.[frameIdx]?.mfpp || 0,
    }
    SocketSend('players', data)
  }

  function UpdateFirstBreak(teamId: string) {
    const data = {
      firstBreak: parseInt(teamId),
    }
    SocketSend('firstbreak', data)
  }

  function UpdateFrameWin(
    side: string,
    frameIdx: string,
    winnerTeamId: string,
    goldenBreak: boolean,
  ) {
    const mfpp = state.matchInfo.initialFrames?.[parseInt(frameIdx)]?.mfpp || 0
    const frame = state.frameData[parseInt(frameIdx)]
    const awayPlayerCount = frame.awayPlayerIds.length
    const homePlayerCount = frame.homePlayerIds.length
    const playerIds =
      side === 'home' ? frame.homePlayerIds : frame.awayPlayerIds
    if (awayPlayerCount === mfpp && homePlayerCount === mfpp) {
      const data = {
        side: side,
        matchId: state.matchInfo.match_id,
        frameIdx: parseInt(frameIdx),
        frameNumber: frame.frameNumber,
        winnerTeamId: winnerTeamId,
        playerIds: playerIds,
        goldenBreak: goldenBreak,
      }
      SocketSend('win', data)
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
      matchId: state.matchInfo.match_id
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
        const _homePlayers = await teams.GetPlayers(
          home_team_id,
          true,
          matchId,
        )
        const _awayPlayers = await teams.GetPlayers(
          away_team_id,
          true,
          matchId,
        )
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
        UpdateFramePlayers,
        UpdateFrameWin,
        UpdateTeams,
      }}>
      {props.children}
    </MatchContext.Provider>
  )
}

export const useMatchContext = () => useContext(MatchContext)
