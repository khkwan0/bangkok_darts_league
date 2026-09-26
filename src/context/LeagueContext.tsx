import config from '@/config'
import {Thread} from '@/components/Messages/types'
import {
  CANONICAL_COMPETITION,
  COMPETITION_STORAGE_KEY,
  parseStoredCompetition,
  type Competition,
} from '@/types/competition'
import {applyScoreUnitToI18n} from '@/lib/matchUnitI18n'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react'

interface User {
  id?: number
  role_id?: number
  isAdmin?: boolean
  isSuperAdmin?: boolean
  teams?: {id: number; team_role_id: number}[]
  profile_picture?: string
  nickname?: string
  first_name?: string
  last_name?: string
  firstname?: string
  lastname?: string
  language?: string
  email?: string
  nationality_id?: number
  nationality?: {
    id: number
    name_en: string
    name_th: string
    iso_3166_1_alpha_2_code: string
  }
  preferences?: {
    enabledPushNotifications?: boolean
    soundNotifications?: boolean
    home_panels?: string[] | null
  }
}

interface LeagueState {
  user: User
  season: number
  messageCount: number
  messageThreads: Thread[]
  isNewMatchCard: boolean
  showLiveScores: boolean
  showForumFabBadge: boolean
  refreshUpcoming: boolean
  competition: Competition
  competitionPickerOpen: boolean
  sport: 'pool' | 'darts'
  scoreUnit: 'frame' | 'leg'
  /** Resolved white-label league id from /branding (when known). */
  leagueId?: number | null
  /** League default home panels from branding (null = sport default). */
  homePanelsStored?: string[] | null
  /** Effective league panels (resolved). */
  homePanels?: string[] | null
}

export interface LeagueContextType {
  state: LeagueState
  dispatch: React.Dispatch<any>
  LogoutUser: () => void
  RefreshUpcoming: () => void
  StopRefreshUpcoming: () => void
  setCompetition: (competition: Competition) => Promise<void>
  openCompetitionPicker: () => void
  closeCompetitionPicker: () => void
  apiUrl: string
  setApiUrl: (apiUrl: string) => Promise<void>
  resetApiUrl: () => Promise<void>
  webSocketUrl: string
  setWebSocketUrl: (webSocketUrl: string) => Promise<void>
  resetWebSocketUrl: () => Promise<void>
}

const LeagueContext = createContext<LeagueContextType>({} as LeagueContextType)

const initialState: LeagueState = {
  user: {},
  messageCount: 0,
  messageThreads: [],
  season: 0,
  isNewMatchCard: false,
  showLiveScores: true,
  showForumFabBadge: true,
  refreshUpcoming: false,
  competition: CANONICAL_COMPETITION,
  competitionPickerOpen: false,
  sport: 'pool',
  scoreUnit: 'frame',
  leagueId: null,
  homePanelsStored: null,
  homePanels: null,
}

const LeagueReducer = (state: any, action: any) => {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: {...action.payload},
      }
    case 'DEL_USER': {
      return {
        ...state,
        user: {},
      }
    }
    case 'SET_SEASON': {
      return {
        ...state,
        season: action.payload,
      }
    }
    case 'SET_MESSAGE_COUNT': {
      return {
        ...state,
        messageCount: action.payload,
      }
    }
    case 'SET_MESSAGE_THREADS': {
      // Calculate total unread count from threads
      const totalUnread = action.payload.reduce(
        (sum: number, thread: Thread) => {
          return sum + (thread.unread_count || 0)
        },
        0,
      )

      return {
        ...state,
        messageThreads: action.payload,
        messageCount: totalUnread,
      }
    }
    case 'UPDATE_THREAD_UNREAD_COUNT': {
      const {playerId, unreadCount} = action.payload
      const updatedThreads = state.messageThreads.map((thread: Thread) => {
        if (thread.other_player_id === playerId) {
          return {
            ...thread,
            unread_count: unreadCount,
          }
        }
        return thread
      })

      // Calculate new total unread count
      const totalUnread = updatedThreads.reduce(
        (sum: number, thread: Thread) => {
          return sum + (thread.unread_count || 0)
        },
        0,
      )

      return {
        ...state,
        messageThreads: updatedThreads,
        messageCount: totalUnread,
      }
    }
    case 'DECREMENT_THREAD_UNREAD_COUNT': {
      const {playerId, decrementBy} = action.payload
      const updatedThreads = state.messageThreads.map((thread: Thread) => {
        if (thread.other_player_id === playerId) {
          const currentUnread = thread.unread_count || 0
          const newUnread = Math.max(0, currentUnread - decrementBy)
          return {
            ...thread,
            unread_count: newUnread,
          }
        }
        return thread
      })

      // Calculate new total unread count
      const totalUnread = updatedThreads.reduce(
        (sum: number, thread: Thread) => {
          return sum + (thread.unread_count || 0)
        },
        0,
      )

      return {
        ...state,
        messageThreads: updatedThreads,
        messageCount: totalUnread,
      }
    }
    case 'SET_PREFERENCES': {
      return {
        ...state,
        user: {
          ...state.user,
          preferences: {...(state.user.preferences ?? {}), ...action.payload},
        },
      }
    }
    case 'SET_LANGUAGE': {
      return {
        ...state,
        user: {...state.user, language: action.payload},
      }
    }
    case 'SET_NATIONALITY': {
      return {
        ...state,
        user: {...state.user, nationality: action.payload},
      }
    }
    case 'SET_NICKNAME': {
      return {
        ...state,
        user: {...state.user, nickname: action.payload},
      }
    }
    case 'SET_FIRST_NAME': {
      return {
        ...state,
        user: {...state.user, firstname: action.payload},
      }
    }
    case 'SET_LAST_NAME': {
      return {
        ...state,
        user: {...state.user, lastname: action.payload},
      }
    }
    case 'SET_PROFILE_PICTURE': {
      return {
        ...state,
        user: {...state.user, profile_picture: action.payload},
      }
    }
    case 'SET_MATCH_CARD_DESIGN': {
      return {
        ...state,
        isNewMatchCard: action.payload,
      }
    }
    case 'SET_LIVE_SCORES': {
      return {
        ...state,
        showLiveScores: action.payload,
      }
    }
    case 'SET_FORUM_FAB_BADGE': {
      return {
        ...state,
        showForumFabBadge: action.payload,
      }
    }
    case 'SET_REFRESH_UPCOMING': {
      return {
        ...state,
        refreshUpcoming: action.payload,
      }
    }
    case 'SET_COMPETITION': {
      return {
        ...state,
        competition: action.payload as Competition,
      }
    }
    case 'SET_COMPETITION_PICKER_OPEN': {
      return {
        ...state,
        competitionPickerOpen: Boolean(action.payload),
      }
    }
    case 'SET_SCORE_UNIT': {
      const unit =
        action.payload === 'leg' || action.payload === 'legs' ? 'leg' : 'frame'
      return {
        ...state,
        scoreUnit: unit,
        sport: unit === 'leg' ? 'darts' : 'pool',
      }
    }
    case 'SET_SPORT': {
      const sport =
        action.payload === 'darts' || action.payload === 'dart'
          ? 'darts'
          : 'pool'
      return {
        ...state,
        sport,
        scoreUnit: sport === 'darts' ? 'leg' : 'frame',
      }
    }
    case 'SET_LEAGUE_ID': {
      return {
        ...state,
        leagueId: action.payload ?? null,
      }
    }
    case 'SET_HOME_PANELS': {
      return {
        ...state,
        homePanels: action.payload?.homePanels ?? null,
        homePanelsStored: action.payload?.homePanelsStored ?? null,
      }
    }
    default:
      return state
  }
}

export const LeagueProvider = ({children}: any) => {
  const [state, dispatch] = useReducer(LeagueReducer, initialState)
  const [apiUrl, setApiUrlState] = useState<string>(config.apiUrl)
  const [webSocketUrl, setWebSocketUrlState] = useState<string>(
    config.webSocketUrl,
  )
  useEffect(() => {
    const loadUrls = async () => {
      try {
        const savedApiUrl = await AsyncStorage.getItem('api_url')
        const savedWebSocketUrl = await AsyncStorage.getItem('web_socket_url')
        if (savedApiUrl) {
          setApiUrlState(savedApiUrl)
          const derivedWs = savedApiUrl
            .replace(/\/api\/?$/, '')
            .replace(/\/$/, '')
          if (derivedWs.startsWith('http')) {
            setWebSocketUrlState(derivedWs)
            if (savedWebSocketUrl !== derivedWs) {
              await AsyncStorage.setItem('web_socket_url', derivedWs)
            }
            return
          }
        }
        if (savedWebSocketUrl) {
          setWebSocketUrlState(savedWebSocketUrl)
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadUrls()
  }, [])

  // Restore session before screens mount so reopen does not flash as logged out.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [jwt, cachedUser] = await Promise.all([
          AsyncStorage.getItem('jwt'),
          AsyncStorage.getItem('user'),
        ])
        if (cancelled || !jwt?.trim() || !cachedUser) return
        const parsed = JSON.parse(cachedUser)
        if (parsed?.id) {
          dispatch({type: 'SET_USER', payload: parsed})
        }
      } catch (e) {
        console.error('Failed to hydrate cached user session:', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const getMatchCardDesign = async () => {
      try {
        const _design = await AsyncStorage.getItem('opt_into_new')
        if (_design) {
          const design = JSON.parse(_design)
          if (typeof design?.optIn === 'boolean') {
            dispatch({type: 'SET_MATCH_CARD_DESIGN', payload: design.optIn})
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    const getShowLiveScores = async () => {
      try {
        const _showLiveScores = await AsyncStorage.getItem('show_live_scores')
        if (_showLiveScores) {
          const showLiveScores = JSON.parse(_showLiveScores as string)
          if (typeof showLiveScores?.show === 'boolean') {
            dispatch({type: 'SET_LIVE_SCORES', payload: showLiveScores.show})
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    const getShowForumFabBadge = async () => {
      try {
        const stored = await AsyncStorage.getItem('show_forum_fab_badge')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (typeof parsed?.show === 'boolean') {
            dispatch({type: 'SET_FORUM_FAB_BADGE', payload: parsed.show})
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    getMatchCardDesign()
    getShowLiveScores()
    getShowForumFabBadge()
  }, [])

  useEffect(() => {
    const loadCompetition = async () => {
      try {
        const raw = await AsyncStorage.getItem(COMPETITION_STORAGE_KEY)
        dispatch({
          type: 'SET_COMPETITION',
          payload: parseStoredCompetition(raw),
        })
      } catch (e) {
        console.error(e)
      }
    }
    loadCompetition()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadBranding() {
      try {
        const base = apiUrl.replace(/\/$/, '')
        const res = await fetch(`${base}/branding`)
        if (!res.ok) return
        const json = await res.json()
        const sportRaw = json?.data?.sport
        const unitRaw = json?.data?.score_unit
        const leagueIdRaw = Number(json?.data?.id)
        if (cancelled) return
        if (Number.isFinite(leagueIdRaw) && leagueIdRaw > 0) {
          dispatch({type: 'SET_LEAGUE_ID', payload: leagueIdRaw})
        }
        const sport =
          sportRaw === 'darts' || sportRaw === 'dart'
            ? 'darts'
            : unitRaw === 'leg' || unitRaw === 'legs'
              ? 'darts'
              : 'pool'
        const normalized = sport === 'darts' ? 'leg' : 'frame'
        dispatch({type: 'SET_SPORT', payload: sport})
        dispatch({
          type: 'SET_HOME_PANELS',
          payload: {
            homePanels: Array.isArray(json?.data?.home_panels)
              ? json.data.home_panels
              : null,
            homePanelsStored: Array.isArray(json?.data?.home_panels_stored)
              ? json.data.home_panels_stored
              : json?.data?.home_panels_stored === null
                ? null
                : null,
          },
        })
        applyScoreUnitToI18n(normalized)
      } catch (e) {
        console.error('Failed to load league branding:', e)
      }
    }
    void loadBranding()
    return () => {
      cancelled = true
    }
  }, [apiUrl])

  async function LogoutUser() {
    try {
      await AsyncStorage.removeItem('jwt')
      await AsyncStorage.removeItem('user')
      dispatch({type: 'DEL_USER'})
      dispatch({type: 'SET_COMPETITION', payload: CANONICAL_COMPETITION})
      await AsyncStorage.setItem(
        COMPETITION_STORAGE_KEY,
        JSON.stringify(CANONICAL_COMPETITION),
      )
    } catch (e) {
      console.error(e)
    }
  }

  function RefreshUpcoming() {
    dispatch({type: 'SET_REFRESH_UPCOMING', payload: true})
  }

  function StopRefreshUpcoming() {
    dispatch({type: 'SET_REFRESH_UPCOMING', payload: false})
  }

  const setCompetition = useCallback(async (competition: Competition) => {
    dispatch({type: 'SET_COMPETITION', payload: competition})
    try {
      await AsyncStorage.setItem(
        COMPETITION_STORAGE_KEY,
        JSON.stringify(competition),
      )
    } catch (e) {
      console.error('Failed to save competition:', e)
    }
  }, [])

  const openCompetitionPicker = useCallback(() => {
    dispatch({type: 'SET_COMPETITION_PICKER_OPEN', payload: true})
  }, [])

  const closeCompetitionPicker = useCallback(() => {
    dispatch({type: 'SET_COMPETITION_PICKER_OPEN', payload: false})
  }, [])

  async function setApiUrl(newApiUrl: string) {
    try {
      setApiUrlState(newApiUrl)
      await AsyncStorage.setItem('api_url', newApiUrl)
      // Keep sockets on the same host as the API (stage vs prod).
      const ws = newApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
      if (ws.startsWith('http')) {
        setWebSocketUrlState(ws)
        await AsyncStorage.setItem('web_socket_url', ws)
      }
    } catch (e) {
      console.error('Failed to save api url:', e)
    }
  }

  async function resetApiUrl() {
    try {
      setApiUrlState(config.apiUrl)
      await AsyncStorage.removeItem('api_url')
      setWebSocketUrlState(config.webSocketUrl)
      await AsyncStorage.removeItem('web_socket_url')
    } catch (e) {
      console.error('Failed to reset domain:', e)
    }
  }

  async function setWebSocketUrl(newWebSocketUrl: string) {
    try {
      setWebSocketUrlState(newWebSocketUrl)
      await AsyncStorage.setItem('web_socket_url', newWebSocketUrl)
    } catch (e) {
      console.error('Failed to save web socket domain:', e)
    }
  }

  async function resetWebSocketUrl() {
    try {
      setWebSocketUrlState(config.webSocketUrl)
      await AsyncStorage.removeItem('web_socket_domain')
    } catch (e) {
      console.error('Failed to reset web socket domain:', e)
    }
  }
  return (
    <LeagueContext.Provider
      value={{
        state,
        dispatch,
        LogoutUser,
        RefreshUpcoming,
        StopRefreshUpcoming,
        setCompetition,
        openCompetitionPicker,
        closeCompetitionPicker,
        apiUrl,
        setApiUrl,
        resetApiUrl,
        webSocketUrl,
        setWebSocketUrl,
        resetWebSocketUrl,
      }}>
      {children}
    </LeagueContext.Provider>
  )
}

export const useLeagueContext = () => useContext(LeagueContext)
