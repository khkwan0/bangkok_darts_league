import Button from '@/components/Button'
import {ChatMarkdown, markdownContainsTable} from '@/components/ChatMarkdown'
import TextInput from '@/components/TextInput'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {useNetwork} from '@/hooks/useNetwork'
import {useThemeColor} from '@/hooks/useThemeColor'
import {
  ADMIN_AI_CAPABILITIES_PATH,
  ADMIN_AI_CHAT_IMAGES_PATH,
  ADMIN_AI_CHAT_THREADS_PATH,
  AI_CHAT_IMAGE_MAX_PER_TURN,
  MEMBER_AI_CAPABILITIES_PATH,
  MEMBER_AI_CHAT_IMAGES_PATH,
  MEMBER_AI_CHAT_THREADS_PATH,
  absoluteSiteUrl,
  chatMessagesToTurns,
  displayTextFromAiChatContent,
  formatThreadTime,
  healDuplicateTurns,
  imagesFromAiChatContent,
  serializeAiChatVisionContent,
  turnsToChatMessages,
  type AiChatThreadSummary,
  type AiChatTurn,
} from '@/lib/aiChatThreads'
import {
  getCueChatSession,
  setCueChatSession,
  type AgentScope,
  type CueChatSessionMessage,
} from '@/lib/cueChatSession'
import {createSocketClient, loadSocketAuth} from '@/lib/socketAuth'
import config from '@/config'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {Ionicons} from '@expo/vector-icons'
import {File} from 'expo-file-system'
import {manipulateAsync, SaveFormat} from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import {useFocusEffect} from "expo-router/react-navigation"
import {Stack, usePathname, useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  View as RNView,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

type ChatMessage = {
  id: string
  message: string
  nickname: string
  playerId: number
  timestamp: number
  rawData?: any
  isUserMessage?: boolean
}

type ConnectionPhase =
  | 'initializing'
  | 'connecting'
  | 'connected'
  | 'disconnected'

type AgentActivity =
  | {phase: 'reconnecting'}
  | {phase: 'sending'}
  | {phase: 'preparing'}
  | {phase: 'tool'; toolName: string}

type ToolCallPayload = {
  requestId?: string
  toolCall?: {
    name?: string
    function?: {name?: string}
  }
}

function resolveToolCallName(payload: ToolCallPayload): string {
  const toolCall = payload?.toolCall
  if (!toolCall) return 'tool'
  if (typeof toolCall.name === 'string' && toolCall.name.trim()) {
    return toolCall.name.trim()
  }
  const functionName = toolCall.function?.name
  if (typeof functionName === 'string' && functionName.trim()) {
    return functionName.trim()
  }
  return 'tool'
}

function formatToolDisplayName(rawName: string): string {
  const cleaned = rawName
    .replace(/^bkk_?league_?/i, '')
    .replace(/_/g, ' ')
    .trim()
  if (!cleaned) return rawName
  return cleaned.replace(/\b\w/g, char => char.toUpperCase());
}

export type {AgentScope}

type CueChatProps = {
  agentScope?: AgentScope
}

export default function CueChat({agentScope = 'member'}: CueChatProps) {
  const isAdminChat = agentScope === 'admin'
  const threadsApiBase = isAdminChat
    ? ADMIN_AI_CHAT_THREADS_PATH
    : MEMBER_AI_CHAT_THREADS_PATH
  const {t} = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const headerIconColor = useThemeColor({}, 'text')
  const themeBackgroundColor = useThemeColor({}, 'background')
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [inputText, setInputText] = React.useState('')
  const [agentActivity, setAgentActivity] =
    React.useState<AgentActivity | null>(null)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [responseText, setResponseText] = React.useState('')
  const [reasoningText, setReasoningText] = React.useState('')
  const [agentError, setAgentError] = React.useState<string | null>(null)
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const themeMutedTextColor = isDark ? '#9ca3af' : '#6b7280'
  const {state: leagueState, webSocketUrl, apiUrl}: any = useLeagueContext()
  const {Get, Post, Put, Delete} = useNetwork()
  const getRef = React.useRef(Get)
  const postRef = React.useRef(Post)
  const putRef = React.useRef(Put)
  const deleteRef = React.useRef(Delete)
  React.useEffect(() => {
    getRef.current = Get
    postRef.current = Post
    putRef.current = Put
    deleteRef.current = Delete
  }, [Get, Post, Put, Delete])
  const [visionEnabled, setVisionEnabled] = React.useState(false)
  const [pendingImageUris, setPendingImageUris] = React.useState<string[]>([])
  const [uploadingImages, setUploadingImages] = React.useState(false)

  React.useEffect(() => {
    const capabilitiesPath = isAdminChat
      ? ADMIN_AI_CAPABILITIES_PATH
      : MEMBER_AI_CAPABILITIES_PATH
    let cancelled = false
    void (async () => {
      try {
        const res = await getRef.current(`/${capabilitiesPath}`)
        if (!cancelled && res?.status === 'ok') {
          setVisionEnabled(Boolean(res.vision_enabled))
        }
      } catch {
        // leave vision off
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAdminChat, leagueState.user?.id])

  const pickImages = React.useCallback(async () => {
    if (!visionEnabled || isStreaming || uploadingImages) return
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert(
          t('forums_image_permission_title'),
          t('forums_image_permission_body'),
        )
        return
      }
      const room = AI_CHAT_IMAGE_MAX_PER_TURN - pendingImageUris.length
      if (room <= 0) return
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsMultipleSelection: true,
        selectionLimit: room,
        // Prefer JPEG-compatible assets on iOS (avoid raw HEIC when possible).
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      })
      if (result.canceled || !result.assets?.length) return
      const uris = result.assets
        .map(a => a.uri)
        .filter((u): u is string => Boolean(u))
        .slice(0, room)
      setPendingImageUris(prev =>
        [...prev, ...uris].slice(0, AI_CHAT_IMAGE_MAX_PER_TURN),
      )
    } catch (e) {
      console.error(e)
      Alert.alert(t('forums_image_upload_failed'))
    }
  }, [
    isStreaming,
    pendingImageUris.length,
    t,
    uploadingImages,
    visionEnabled,
  ])

  const uploadPendingImages = React.useCallback(async (): Promise<string[]> => {
    if (pendingImageUris.length === 0) return []
    const uploadPath = isAdminChat
      ? ADMIN_AI_CHAT_IMAGES_PATH
      : MEMBER_AI_CHAT_IMAGES_PATH
    const token = await AsyncStorage.getItem('jwt')
    const apiDomain = apiUrl ?? config.apiUrl
    const urls: string[] = []
    for (const uri of pendingImageUris) {
      // iPhone HEIC often fails server-side sharp on Alpine — convert to JPEG first.
      const jpeg = await manipulateAsync(uri, [], {
        compress: 0.85,
        format: SaveFormat.JPEG,
      })
      // Expo winter fetch rejects RN `{uri,name,type}` FormData parts.
      // `File` from expo-file-system implements Blob and is supported.
      const file = new File(jpeg.uri)
      const data = new FormData()
      data.append('file', file)
      const res = await fetch(`${apiDomain}/${uploadPath}`, {
        method: 'POST',
        body: data,
        headers: {
          Authorization: 'Bearer ' + token,
        },
      })
      let json: {status?: string; url?: string; error?: string} = {}
      try {
        json = await res.json()
      } catch {
        throw new Error('server_error')
      }
      if (json?.status !== 'ok' || typeof json.url !== 'string') {
        throw new Error(
          typeof json?.error === 'string' ? json.error : 'image_upload_failed',
        )
      }
      urls.push(json.url)
    }
    return urls
  }, [apiUrl, isAdminChat, pendingImageUris])

  const [connectionPhase, setConnectionPhase] =
    React.useState<ConnectionPhase>('initializing')
  const [socketError, setSocketError] = React.useState<string | null>(null)
  const [threads, setThreads] = React.useState<AiChatThreadSummary[]>([])
  const [activeThreadId, setActiveThreadId] = React.useState<number | null>(null)
  const [threadsLoading, setThreadsLoading] = React.useState(false)
  const [threadLoading, setThreadLoading] = React.useState(false)
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const activeThreadIdRef = React.useRef<number | null>(null)
  const persistThreadMessagesRef = React.useRef<
    ((threadId: number, nextMessages: ChatMessage[]) => Promise<void>) | null
  >(null)
  const ensureThreadIdRef = React.useRef<
    ((firstPrompt: string) => Promise<number | null>) | null
  >(null)
  const refreshThreadsRef = React.useRef<(() => Promise<void>) | null>(null)
  const flatListRef = React.useRef<FlatList>(null)
  const socketRef = React.useRef<ReturnType<typeof createSocketClient> | null>(
    null,
  )
  const responseBufferRef = React.useRef('')
  const pendingResponseTokensRef = React.useRef('')
  const pendingReasoningTokensRef = React.useRef('')
  const responseFlushRafRef = React.useRef<number | null>(null)
  const reasoningFlushRafRef = React.useRef<number | null>(null)
  const activeRequestIdRef = React.useRef<string | null>(null)
  const isStreamingRef = React.useRef(false)
  isStreamingRef.current = isStreaming
  const messagesRef = React.useRef(messages)
  messagesRef.current = messages
  const isLoggedIn = Boolean(leagueState.user?.id)

  React.useEffect(() => {
    activeThreadIdRef.current = activeThreadId
  }, [activeThreadId])
  const isConnected = connectionPhase === 'connected'
  const isConnecting =
    connectionPhase === 'initializing' || connectionPhase === 'connecting'
  const displayError = agentError ?? socketError

  const reconnectSocket = React.useCallback(() => {
    const socket = socketRef.current
    if (!socket || !leagueState.user?.id || socket.connected) {
      return
    }
    setSocketError(null)
    setConnectionPhase('connecting')
    socket.connect()
  }, [leagueState.user?.id])

  const ensureConnected = React.useCallback(() => {
    const currentSocket = socketRef.current
    if (!currentSocket) {
      return Promise.reject(new Error('Socket not initialized'))
    }
    if (!leagueState.user?.id) {
      return Promise.reject(new Error('User is not logged in'))
    }
    if (currentSocket.connected) {
      return Promise.resolve(currentSocket)
    }
    return new Promise<NonNullable<typeof currentSocket>>((resolve, reject) => {
      const onConnect = () => {
        currentSocket.off('connect_error', onError)
        resolve(currentSocket)
      }
      const onError = (error: Error) => {
        currentSocket.off('connect', onConnect)
        reject(error)
      }
      currentSocket.once('connect', onConnect)
      currentSocket.once('connect_error', onError)
      setConnectionPhase('connecting')
      currentSocket.connect()
    })
  }, [leagueState.user?.id])

  const appStateRef = React.useRef(AppState.currentState)

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const wasBackground = appStateRef.current.match(/inactive|background/)
      appStateRef.current = nextAppState
      if (wasBackground && nextAppState === 'active') {
        reconnectSocket()
      }
    })
    return () => subscription.remove()
  }, [reconnectSocket])

  function clearAgentActivity() {
    setAgentActivity(null)
  }

  function teardownSocket(
    pendingSocket: ReturnType<typeof createSocketClient> | null = null,
  ) {
    const requestId = activeRequestIdRef.current
    const sockets = new Set(
      [pendingSocket, socketRef.current].filter(
        (socket): socket is NonNullable<typeof socket> => socket != null,
      ),
    )

    for (const socket of sockets) {
      if (socket.connected && requestId) {
        socket.emit('agent:cancel', {requestId})
      }
      socket.removeAllListeners()
      socket.disconnect()
    }

    socketRef.current = null

    if (responseFlushRafRef.current != null) {
      cancelAnimationFrame(responseFlushRafRef.current)
      responseFlushRafRef.current = null
    }
    if (reasoningFlushRafRef.current != null) {
      cancelAnimationFrame(reasoningFlushRafRef.current)
      reasoningFlushRafRef.current = null
    }

    activeRequestIdRef.current = null
    responseBufferRef.current = ''
    pendingResponseTokensRef.current = ''
    pendingReasoningTokensRef.current = ''
    setResponseText('')
    setReasoningText('')
    setIsStreaming(false)
    clearAgentActivity()
    setConnectionPhase('disconnected')
  }

  function flushPendingResponseTokens() {
    responseFlushRafRef.current = null
    const chunk = pendingResponseTokensRef.current
    if (!chunk) return
    pendingResponseTokensRef.current = ''
    responseBufferRef.current += chunk
    setResponseText(prev => prev + chunk)
  }

  function flushPendingReasoningTokens() {
    reasoningFlushRafRef.current = null
    const chunk = pendingReasoningTokensRef.current
    if (!chunk) return
    pendingReasoningTokensRef.current = ''
    setReasoningText(prev => prev + chunk)
  }

  function scheduleResponseTokenFlush() {
    if (responseFlushRafRef.current != null) return
    responseFlushRafRef.current = requestAnimationFrame(
      flushPendingResponseTokens,
    )
  }

  function scheduleReasoningTokenFlush() {
    if (reasoningFlushRafRef.current != null) return
    reasoningFlushRafRef.current = requestAnimationFrame(
      flushPendingReasoningTokens,
    )
  }

  function appendResponseToken(token: string) {
    pendingResponseTokensRef.current += token
    scheduleResponseTokenFlush()
  }

  function appendReasoningToken(token: string) {
    pendingReasoningTokensRef.current += token
    scheduleReasoningTokenFlush()
  }

  function flushAllPendingStreamTokens() {
    if (responseFlushRafRef.current != null) {
      cancelAnimationFrame(responseFlushRafRef.current)
      responseFlushRafRef.current = null
    }
    if (reasoningFlushRafRef.current != null) {
      cancelAnimationFrame(reasoningFlushRafRef.current)
      reasoningFlushRafRef.current = null
    }
    const responseChunk = pendingResponseTokensRef.current
    const reasoningChunk = pendingReasoningTokensRef.current
    pendingResponseTokensRef.current = ''
    pendingReasoningTokensRef.current = ''
    if (responseChunk) {
      responseBufferRef.current += responseChunk
      setResponseText(prev => prev + responseChunk)
    }
    if (reasoningChunk) {
      setReasoningText(prev => prev + reasoningChunk)
    }
  }

  function formatToolStatusLabel(rawToolName: string): string {
    const tool = formatToolDisplayName(rawToolName)
    let prefix = t('ai_assistant_status_tool_prefix', {
      defaultValue: 'Looking up',
    })
    const braceIndex = prefix.indexOf('{')
    if (braceIndex >= 0) {
      prefix = prefix.slice(0, braceIndex).trim()
    }
    if (!prefix) prefix = 'Looking up'
    return `${prefix} ${tool}…`
  }

  function getAgentActivityLabel(
    activity: AgentActivity | null,
  ): string | null {
    if (!activity) return null
    switch (activity.phase) {
      case 'reconnecting':
        return t('ai_assistant_status_reconnecting')
      case 'sending':
        return t('ai_assistant_status_sending')
      case 'preparing':
        return t('ai_assistant_status_preparing')
      case 'tool':
        return formatToolStatusLabel(activity.toolName)
      default:
        return null
    }
  }

  React.useEffect(() => {
    return () => {
      if (responseFlushRafRef.current != null) {
        cancelAnimationFrame(responseFlushRafRef.current)
      }
      if (reasoningFlushRafRef.current != null) {
        cancelAnimationFrame(reasoningFlushRafRef.current)
      }
    }
  }, [])

  function persistCueChatSession() {
    const playerId = leagueState.user?.id
    if (!playerId) return
    setCueChatSession(
      playerId,
      {
        threadId: activeThreadIdRef.current,
        messages: messagesRef.current as CueChatSessionMessage[],
      },
      agentScope,
    )
  }

  const refreshThreads = React.useCallback(async () => {
    if (!leagueState.user?.id) return
    try {
      setThreadsLoading(true)
      const response = await getRef.current(threadsApiBase)
      if (response?.status === 'ok' && Array.isArray(response.data)) {
        setThreads(response.data)
        setAgentError(null)
        return
      }
      const error = response?.error || 'request_failed'
      console.error('Failed to load chat threads:', error)
      setAgentError(error)
    } catch (e) {
      console.error('Failed to load chat threads:', e)
    } finally {
      setThreadsLoading(false)
    }
  }, [leagueState.user?.id, threadsApiBase])

  React.useEffect(() => {
    refreshThreadsRef.current = refreshThreads
  }, [refreshThreads])

  const persistThreadMessages = React.useCallback(
    async (threadId: number, nextMessages: ChatMessage[]) => {
      if (!threadId || !leagueState.user?.id) return
      try {
        const turns = chatMessagesToTurns(nextMessages, leagueState.user.id)
        const response = await putRef.current(
          `${threadsApiBase}/${threadId}`,
          {
            messages: turns,
            update_title: true,
          },
        )
        if (response?.status !== 'ok') {
          console.error('Failed to save chat thread:', response?.error)
          return
        }
        await refreshThreads()
      } catch (e) {
        console.error('Failed to save chat thread:', e)
      }
    },
    [leagueState.user, refreshThreads, threadsApiBase],
  )

  const ensureThreadId = React.useCallback(
    async (firstPrompt: string): Promise<number | null> => {
      if (activeThreadIdRef.current) return activeThreadIdRef.current
      try {
        const response = await postRef.current(threadsApiBase, {
          title: firstPrompt,
        })
        if (response?.status !== 'ok' || !response?.data?.id) {
          console.error('Failed to create chat thread:', response?.error)
          return null
        }
        const id = response.data.id as number
        setActiveThreadId(id)
        activeThreadIdRef.current = id
        await refreshThreads()
        return id
      } catch (e) {
        console.error('Failed to create chat thread:', e)
        return null
      }
    },
    [refreshThreads, threadsApiBase],
  )

  React.useEffect(() => {
    persistThreadMessagesRef.current = persistThreadMessages
  }, [persistThreadMessages])

  React.useEffect(() => {
    ensureThreadIdRef.current = ensureThreadId
  }, [ensureThreadId])

  const startNewChat = React.useCallback(() => {
    if (isStreamingRef.current) return
    setActiveThreadId(null)
    activeThreadIdRef.current = null
    setMessages([])
    messagesRef.current = []
    setInputText('')
    setPendingImageUris([])
    setResponseText('')
    setReasoningText('')
    setAgentError(null)
    setHistoryOpen(false)
    persistCueChatSession()
  }, [leagueState.user?.id])

  const loadThread = React.useCallback(
    async (threadId: number) => {
      if (isStreamingRef.current) return
      const playerId = leagueState.user?.id
      if (!playerId) return
      try {
        setThreadLoading(true)
        setAgentError(null)
        const response = await getRef.current(
          `${threadsApiBase}/${threadId}`,
        )
        if (response?.status !== 'ok' || !response?.data) {
          setAgentError(response?.error || 'Failed to load chat thread')
          return
        }
        const rawTurns = (response.data.messages ?? []) as AiChatTurn[]
        const turns = healDuplicateTurns(rawTurns)
        const nextMessages = turnsToChatMessages(
          turns,
          playerId,
          leagueState.user?.nickname ?? 'You',
        ) as ChatMessage[]
        setActiveThreadId(threadId)
        activeThreadIdRef.current = threadId
        setMessages(nextMessages)
        setInputText('')
        setPendingImageUris([])
        setResponseText('')
        setReasoningText('')
        setHistoryOpen(false)
        setCueChatSession(
          playerId,
          {
            threadId,
            messages: nextMessages,
          },
          agentScope,
        )
        if (turns.length < rawTurns.length) {
          void persistThreadMessagesRef.current?.(threadId, nextMessages)
        }
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({animated: false})
        }, 100)
      } catch (e) {
        console.error('Failed to load chat thread:', e)
        setAgentError('Failed to load chat thread')
      } finally {
        setThreadLoading(false)
      }
    },
    [leagueState.user?.id, leagueState.user?.nickname, threadsApiBase, agentScope],
  )

  const deleteThread = React.useCallback(
    (threadId: number) => {
      if (isStreamingRef.current) return
      Alert.alert(
        t('ai_assistant_delete_thread_title'),
        t('ai_assistant_delete_thread_body'),
        [
          {text: t('cancel'), style: 'cancel'},
          {
            text: t('delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await deleteRef.current(
                  `${threadsApiBase}/${threadId}`,
                )
                if (response?.status !== 'ok') {
                  setAgentError(response?.error || 'Failed to delete chat thread')
                  return
                }
                if (activeThreadIdRef.current === threadId) {
                  startNewChat()
                }
                await refreshThreads()
              } catch (e) {
                console.error('Failed to delete chat thread:', e)
                setAgentError('Failed to delete chat thread')
              }
            },
          },
        ],
      )
    },
    [refreshThreads, startNewChat, t, threadsApiBase],
  )

  React.useEffect(() => {
    const playerId = leagueState.user?.id
    if (!playerId) {
      setThreads([])
      setActiveThreadId(null)
      activeThreadIdRef.current = null
      setMessages([])
      return
    }

    const cachedSession = getCueChatSession(playerId, agentScope)
    if (cachedSession?.messages?.length) {
      setMessages(cachedSession.messages as ChatMessage[])
      setActiveThreadId(cachedSession.threadId)
      activeThreadIdRef.current = cachedSession.threadId
    }

    void refreshThreads()
  }, [leagueState.user?.id, refreshThreads])

  React.useEffect(() => {
    const playerId = leagueState.user?.id
    if (!playerId) return
    setCueChatSession(
      playerId,
      {
        threadId: activeThreadId,
        messages: messages as CueChatSessionMessage[],
      },
      agentScope,
    )
  }, [messages, activeThreadId, leagueState.user?.id, agentScope])

  React.useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({animated: true})
    }, 50)
  }, [reasoningText, responseText, isStreaming, messages.length])

  // webSocketUrl is captured once per visit; not in deps so AsyncStorage URL load
  // does not tear down the socket mid-chat.
  useFocusEffect(
    React.useCallback(() => {
      const socketUrl = webSocketUrl
      const playerId = leagueState.user?.id
      if (playerId) {
        const cachedSession = getCueChatSession(playerId, agentScope)
        if (cachedSession?.messages?.length) {
          setMessages(cachedSession.messages as ChatMessage[])
          setActiveThreadId(cachedSession.threadId)
          activeThreadIdRef.current = cachedSession.threadId
        }
      }

      let cancelled = false
      let activeSocket: ReturnType<typeof createSocketClient> | null = null

      async function setupSocket() {
        setConnectionPhase('initializing')
        setSocketError(null)

        teardownSocket()

        const authOptions = await loadSocketAuth({
          apiUrl,
          leagueId: leagueState.leagueId,
        })
        if (cancelled) return

        activeSocket = createSocketClient(socketUrl, authOptions)
        if (cancelled) {
          activeSocket.removeAllListeners()
          activeSocket.disconnect()
          return
        }

      activeSocket.on('connect', () => {
        setConnectionPhase('connected')
        setSocketError(null)
      })

      activeSocket.on('disconnect', (reason: string) => {
        if (__DEV__) {
          console.log('CueChat socket disconnected:', reason)
        }

        const isIntentionalDisconnect =
          reason === 'io client disconnect' || reason === 'io server disconnect'

        if (
          reason === 'ping timeout' &&
          isStreamingRef.current &&
          activeRequestIdRef.current &&
          !cancelled &&
          socketRef.current
        ) {
          setSocketError(null)
          setConnectionPhase('connecting')
          socketRef.current.connect()
          return
        }

        setConnectionPhase('disconnected')

        if (isIntentionalDisconnect) {
          return
        }

        if (
          reason === 'ping timeout' ||
          reason === 'transport close' ||
          reason === 'transport error'
        ) {
          setSocketError(
            reason === 'ping timeout'
              ? 'Connection timed out — try sending again'
              : 'Connection lost',
          )
        }
      })

      activeSocket.on('connect_error', (error: Error) => {
        console.error('CueChat socket connection error:', error.message)
        setConnectionPhase('disconnected')
        const message = error.message || 'Socket connection failed'
        setSocketError(
          /timeout/i.test(message)
            ? 'Could not reach the server — check your connection'
            : message,
        )
        setIsStreaming(false)
        clearAgentActivity()
      })

      const isCurrentRequest = (requestId?: string) =>
        !requestId || requestId === activeRequestIdRef.current

      const handleAgentReasoningToken = (payload: {
      requestId?: string
      token?: string
    }) => {
      if (!isCurrentRequest(payload?.requestId)) return
      const tokenValue = typeof payload?.token === 'string' ? payload.token : ''
      if (!tokenValue) return
      clearAgentActivity()
      appendReasoningToken(tokenValue)
    }

    const handleAgentToken = (payload: {
      requestId?: string
      token?: string
    }) => {
      if (!isCurrentRequest(payload?.requestId)) return
      const tokenValue = typeof payload?.token === 'string' ? payload.token : ''
      if (!tokenValue) return
      clearAgentActivity()
      appendResponseToken(tokenValue)
    }

    const handleAgentToolCall = (payload: ToolCallPayload) => {
      if (!isCurrentRequest(payload?.requestId)) return
      setAgentActivity({phase: 'tool', toolName: resolveToolCallName(payload)})
    }

    const handleAgentDone = (payload: {
      requestId?: string
      threadId?: number
      response?: {content?: string}
    }) => {
      if (!isCurrentRequest(payload?.requestId)) return

      flushAllPendingStreamTokens()

      const serverThreadId =
        typeof payload?.threadId === 'number' ? payload.threadId : null
      if (serverThreadId && !activeThreadIdRef.current) {
        setActiveThreadId(serverThreadId)
        activeThreadIdRef.current = serverThreadId
      }

      let assistantReply = responseBufferRef.current.trim()
      if (!assistantReply) {
        const responseContent = payload?.response?.content
        assistantReply =
          typeof responseContent === 'string' ? responseContent.trim() : ''
      }

      if (assistantReply) {
        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}_${Math.random()}`,
          message: assistantReply,
          nickname: 'Response',
          playerId: 0,
          timestamp: Date.now(),
          isUserMessage: false,
        }
        const nextMessages = [...messagesRef.current, assistantMessage]
        messagesRef.current = nextMessages
        setMessages(nextMessages)
      }

      void refreshThreadsRef.current?.()

      responseBufferRef.current = ''
      activeRequestIdRef.current = null
      setResponseText('')
      setReasoningText('')
      setIsStreaming(false)
      isStreamingRef.current = false
      clearAgentActivity()
      setAgentError(null)
    }

    const handleAgentError = (payload: {
      requestId?: string
      error?: string
      message?: string
    }) => {
      if (!isCurrentRequest(payload?.requestId)) return
      flushAllPendingStreamTokens()
      responseBufferRef.current = ''
      pendingResponseTokensRef.current = ''
      pendingReasoningTokensRef.current = ''
      activeRequestIdRef.current = null
      setResponseText('')
      setReasoningText('')
      setIsStreaming(false)
      isStreamingRef.current = false
      clearAgentActivity()
      const message =
        payload?.error || payload?.message || 'Agent request failed'
      setAgentError(message)
      console.error('CueChat agent error:', message)
      }

      activeSocket.on('agent:reasoning_token', handleAgentReasoningToken)
      activeSocket.on('agent:token', handleAgentToken)
      activeSocket.on('agent:tool_call', handleAgentToolCall)
      activeSocket.on('agent:done', handleAgentDone)
      activeSocket.on('agent:error', handleAgentError)

      socketRef.current = activeSocket

      if (leagueState.user?.id) {
        setConnectionPhase('connecting')
        activeSocket.connect()
      } else {
        setConnectionPhase('disconnected')
      }
    }

      setupSocket()

      return () => {
        cancelled = true
        persistCueChatSession()
        teardownSocket(activeSocket)
      }
    }, [leagueState.user?.id, leagueState.leagueId, agentScope, apiUrl]),
  )

  async function emitAgentRequest(params: {
    requestId: string
    prompt: string
    images?: string[]
    threadId?: number | null
  }) {
    const socket = socketRef.current
    if (!socket) return

    const payload = {
      requestId: params.requestId,
      agentScope,
      threadId: params.threadId ?? undefined,
      prompt: params.prompt,
      images:
        params.images && params.images.length > 0 ? params.images : undefined,
    }

    const onAck = (ack?: {
      status?: string
      error?: string
      threadId?: number
    }) => {
      if (typeof ack?.threadId === 'number' && !activeThreadIdRef.current) {
        setActiveThreadId(ack.threadId)
        activeThreadIdRef.current = ack.threadId
        void refreshThreadsRef.current?.()
      }
      if (ack?.status === 'error') {
        activeRequestIdRef.current = null
        responseBufferRef.current = ''
        setResponseText('')
        setReasoningText('')
        setIsStreaming(false)
        isStreamingRef.current = false
        clearAgentActivity()
        setAgentError(ack.error || 'Failed to start agent request')
        console.error(
          'CueChat agent ack error:',
          ack.error || 'Failed to start agent request',
        )
      }
    }

    const emitPayload = () => {
      setAgentActivity({phase: 'preparing'})
      socket.emit('agent', payload, onAck)
    }

    try {
      if (socket.connected) {
        setAgentActivity({phase: 'sending'})
        emitPayload()
      } else {
        setAgentActivity({phase: 'reconnecting'})
        await ensureConnected()
        setAgentActivity({phase: 'sending'})
        emitPayload()
      }
    } catch (error) {
      setIsStreaming(false)
      clearAgentActivity()
      const message =
        error instanceof Error ? error.message : 'Socket connection failed'
      setAgentError(message)
    }
  }

  const isInputEnabled =
    isLoggedIn && isConnected && !isStreaming && !isConnecting && !uploadingImages
  const canSend =
    isInputEnabled &&
    (Boolean(inputText.trim()) ||
      (visionEnabled && pendingImageUris.length > 0))
  const inputPlaceholder = !isLoggedIn
    ? t('ai_assistant_input_login_required')
    : isConnecting
      ? t('ai_assistant_input_connecting')
      : !isConnected
        ? t('ai_assistant_input_disconnected')
        : isStreaming
          ? t('ai_assistant_input_responding')
          : isAdminChat
            ? t('admin_ai_agent_placeholder')
            : t('ai_assistant_message_placeholder')

  const suggestionKeys = (
    isAdminChat
      ? [
          'admin_ai_agent_suggestion_1',
          'admin_ai_agent_suggestion_2',
          'admin_ai_agent_suggestion_3',
          'admin_ai_agent_suggestion_4',
        ]
      : [
          'ai_assistant_suggestion_1',
          'ai_assistant_suggestion_2',
          'ai_assistant_suggestion_3',
          'ai_assistant_suggestion_4',
        ]
  ) as const

  const screenTitle = isAdminChat ? t('admin_ai_agent') : t('ai_assistant')
  const readyMessage = isAdminChat
    ? t('admin_ai_agent_ready_message')
    : t('ai_assistant_ready_message')

  const showReadyPrompt =
    isLoggedIn &&
    isConnected &&
    !isConnecting &&
    !isStreaming &&
    !threadLoading &&
    messages.length === 0

  async function SendMessage(overrideText?: string) {
    const messageText = (overrideText ?? inputText).trim()
    const hasImages =
      !overrideText && visionEnabled && pendingImageUris.length > 0
    if (!messageText && !hasImages) return
    if (!overrideText && !canSend) return
    if (overrideText && !isInputEnabled) return
    if (isStreamingRef.current) return
    const currentUserId = leagueState.user.id ?? 0
    const currentNickname = leagueState.user.nickname ?? 'You'

    isStreamingRef.current = true
    setIsStreaming(true)

    let imageUrls: string[] = []
    if (hasImages) {
      try {
        setUploadingImages(true)
        imageUrls = await uploadPendingImages()
      } catch (e) {
        isStreamingRef.current = false
        setIsStreaming(false)
        setUploadingImages(false)
        setAgentError(
          e instanceof Error
            ? e.message === 'server_error'
              ? t('server_error')
              : e.message
            : 'Failed to upload images',
        )
        return
      } finally {
        setUploadingImages(false)
      }
    }

    const storedContent =
      imageUrls.length > 0
        ? serializeAiChatVisionContent(messageText, imageUrls)
        : messageText

    const requestId = `ai-${Date.now()}`
    activeRequestIdRef.current = requestId
    if (responseFlushRafRef.current != null) {
      cancelAnimationFrame(responseFlushRafRef.current)
      responseFlushRafRef.current = null
    }
    if (reasoningFlushRafRef.current != null) {
      cancelAnimationFrame(reasoningFlushRafRef.current)
      reasoningFlushRafRef.current = null
    }
    responseBufferRef.current = ''
    pendingResponseTokensRef.current = ''
    pendingReasoningTokensRef.current = ''
    setResponseText('')
    setReasoningText('')
    setAgentError(null)
    setAgentActivity({phase: 'sending'})

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}_${Math.random()}`,
      message: storedContent,
      nickname: currentNickname,
      playerId: currentUserId,
      timestamp: Date.now(),
      isUserMessage: true,
    }
    const nextMessages = [...messagesRef.current, userMessage]
    messagesRef.current = nextMessages
    setMessages(nextMessages)
    if (!overrideText) {
      setInputText('')
      setPendingImageUris([])
    }

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({animated: true})
    }, 100)

    try {
      emitAgentRequest({
        requestId,
        prompt: messageText,
        images: imageUrls,
        threadId: activeThreadIdRef.current,
      })
    } catch (e) {
      console.error('Error sending message:', e)
      activeRequestIdRef.current = null
      responseBufferRef.current = ''
      setResponseText('')
      setReasoningText('')
      setIsStreaming(false)
      isStreamingRef.current = false
      clearAgentActivity()
    }
  }

  // Background colors - shared across components
  const userBgColor = '#3b82f6' // blue-500
  const apiBgColor = isDark ? '#166534' : '#86efac' // green-800 dark, green-300 light
  const apiTextColor = isDark ? '#f3f4f6' : '#1f2937'

  const renderMessage = ({item}: {item: ChatMessage}) => {
    const isUserMessage =
      item.isUserMessage || item.playerId === leagueState.user.id
    const displayText = isUserMessage
      ? displayTextFromAiChatContent(item.message)
      : item.message
    const turnImages = isUserMessage
      ? imagesFromAiChatContent(item.message)
      : []
    const siteApiUrl = apiUrl ?? config.apiUrl
    const hasTable = !isUserMessage && markdownContainsTable(item.message)
    // Handle timestamp - convert to milliseconds if needed
    const timestamp =
      item.timestamp < 10000000000 ? item.timestamp * 1000 : item.timestamp
    const date = new Date(timestamp)

    // Format as 24-hour time (HH:MM) without AM/PM, ensuring colon is properly displayed
    const hours = date.getHours()
    const minutes = date.getMinutes()

    return (
      <View
        className={`mx-4 my-2 ${isUserMessage ? 'items-end' : hasTable ? '' : 'items-start'}`}
        style={
          !isUserMessage && hasTable ? {alignItems: 'stretch'} : undefined
        }>
        <View
          style={{
            backgroundColor: isUserMessage ? userBgColor : apiBgColor,
            borderRadius: 16,
            paddingHorizontal: hasTable ? 8 : 16,
            paddingVertical: 12,
            maxWidth: hasTable ? '96%' : '80%',
            alignSelf: hasTable ? 'stretch' : undefined,
            overflow: hasTable ? 'visible' : 'hidden',
          }}>
          {!isUserMessage && (
            <Text
              style={{
                color: isDark ? '#d1d5db' : '#374151',
                fontSize: 12,
                marginBottom: 6,
                fontWeight: '600',
              }}>
              {item.nickname}
            </Text>
          )}
          {isUserMessage ? (
            <>
              {displayText ? (
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 16,
                    marginBottom: turnImages.length > 0 ? 8 : 16,
                  }}>
                  {displayText}
                </Text>
              ) : null}
              {turnImages.length > 0 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 6,
                    marginBottom: 16,
                  }}>
                  {turnImages.map(url => (
                    <Image
                      key={url}
                      source={{uri: absoluteSiteUrl(url, siteApiUrl)}}
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 8,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                      }}
                    />
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <RNView style={{marginBottom: 16}}>
              <ChatMarkdown content={item.message} textColor={apiTextColor} />
            </RNView>
          )}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 20,
              backgroundColor: isUserMessage ? userBgColor : apiBgColor,
            }}>
            <Text
              style={{
                color: isUserMessage
                  ? '#bfdbfe'
                  : isDark
                    ? '#9ca3af'
                    : '#4b5563',
                fontSize: 12,
                backgroundColor: isUserMessage ? userBgColor : apiBgColor,
              }}>
              {String(hours).padStart(2, '0')}
            </Text>
            <Text
              style={{
                color: isUserMessage
                  ? '#bfdbfe'
                  : isDark
                    ? '#9ca3af'
                    : '#4b5563',
                fontSize: 12,
                backgroundColor: isUserMessage ? userBgColor : apiBgColor,
              }}>
              :
            </Text>
            <Text
              style={{
                color: isUserMessage
                  ? '#bfdbfe'
                  : isDark
                    ? '#9ca3af'
                    : '#4b5563',
                fontSize: 12,
                backgroundColor: isUserMessage ? userBgColor : apiBgColor,
              }}>
              {String(minutes).padStart(2, '0')}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  const BouncingDots = () => {
    const dot1 = React.useRef(new Animated.Value(0)).current
    const dot2 = React.useRef(new Animated.Value(0)).current
    const dot3 = React.useRef(new Animated.Value(0)).current

    React.useEffect(() => {
      const animateDot = (dot: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dot, {
              toValue: -8,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        )
      }

      const animations = [
        animateDot(dot1, 0),
        animateDot(dot2, 150),
        animateDot(dot3, 300),
      ]

      animations.forEach(anim => anim.start())

      return () => {
        animations.forEach(anim => anim.stop())
      }
    }, [])

    const dotColor = isDark ? '#f3f4f6' : '#1f2937'

    return (
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
        <Animated.View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: dotColor,
            transform: [{translateY: dot1}],
          }}
        />
        <Animated.View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: dotColor,
            transform: [{translateY: dot2}],
          }}
        />
        <Animated.View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: dotColor,
            transform: [{translateY: dot3}],
          }}
        />
      </View>
    )
  }

  const reasoningBgColor = isDark ? '#1f2937' : '#f3f4f6'
  const reasoningBorderColor = isDark ? '#374151' : '#e5e7eb'
  const reasoningTextColor = isDark ? '#d1d5db' : '#4b5563'
  const reasoningLabelColor = isDark ? '#9ca3af' : '#6b7280'

  const renderReasoningIndicator = () => {
    if (!reasoningText.trim()) return null

    return (
      <RNView
        style={{
          marginHorizontal: 16,
          marginVertical: 8,
          alignItems: 'flex-start',
        }}>
        <RNView
          style={{
            backgroundColor: reasoningBgColor,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: reasoningBorderColor,
            paddingHorizontal: 16,
            paddingVertical: 12,
            maxWidth: '90%',
          }}>
          <Text
            style={{
              color: reasoningLabelColor,
              fontSize: 10,
              fontWeight: '600',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
            {t('ai_assistant_reasoning_label')}
          </Text>
          <ScrollView style={{maxHeight: 120}} nestedScrollEnabled>
            <Text
              style={{
                color: reasoningTextColor,
                fontSize: 13,
                lineHeight: 20,
              }}>
              {reasoningText}
            </Text>
          </ScrollView>
        </RNView>
      </RNView>
    )
  }

  const renderStreamingResponse = () => {
    if (!isStreaming || !responseText.trim()) return null

    return (
      <RNView
        style={{
          marginHorizontal: 16,
          marginVertical: 8,
          alignItems: 'stretch',
        }}>
        <RNView
          style={{
            backgroundColor: apiBgColor,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 12,
            maxWidth: '80%',
            alignSelf: 'flex-start',
          }}>
          <Text
            style={{
              color: isDark ? '#d1d5db' : '#374151',
              fontSize: 12,
              marginBottom: 6,
              fontWeight: '600',
            }}>
            Response
          </Text>
          <Text style={{color: apiTextColor, fontSize: 16, lineHeight: 22}}>
            {responseText}
          </Text>
        </RNView>
      </RNView>
    )
  }

  const renderTypingIndicator = () => {
    if (!isStreaming || reasoningText.trim() || responseText.trim()) {
      return null
    }

    const activityLabel = getAgentActivityLabel(agentActivity)

    return (
      <RNView
        style={{
          marginHorizontal: 16,
          marginVertical: 8,
          alignItems: 'flex-start',
        }}>
        <RNView
          style={{
            backgroundColor: apiBgColor,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 12,
            minHeight: 36,
            justifyContent: 'center',
          }}>
          {activityLabel ? (
            <Text
              style={{
                color: apiTextColor,
                fontSize: 14,
                marginBottom: 8,
                opacity: 0.9,
              }}>
              {activityLabel}
            </Text>
          ) : null}
          <BouncingDots />
        </RNView>
      </RNView>
    )
  }

  const renderListFooter = () => (
    <>
      {renderReasoningIndicator()}
      {renderStreamingResponse()}
      {renderTypingIndicator()}
    </>
  )

  const chipBorderColor = isDark ? '#4b5563' : '#d1d5db'
  const chipBgColor = isDark ? '#1f2937' : '#ffffff'
  const chipTextColor = isDark ? '#e5e7eb' : '#374151'

  const renderReadyPrompt = () => (
    <RNView
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: 'flex-start',
        width: '100%',
      }}>
      <RNView
        style={{
          backgroundColor: apiBgColor,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          maxWidth: '90%',
          marginBottom: 12,
        }}>
        <Text
          style={{
            color: isDark ? '#d1d5db' : '#374151',
            fontSize: 12,
            marginBottom: 6,
            fontWeight: '600',
          }}>
          {t(isAdminChat ? 'admin_ai_agent' : 'ai_assistant')}
        </Text>
        <Text style={{color: apiTextColor, fontSize: 16, lineHeight: 22}}>
          {readyMessage}
        </Text>
      </RNView>
      <Text
        style={{
          color: reasoningLabelColor,
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 8,
          marginLeft: 4,
        }}>
        {t('ai_assistant_suggestions_label')}
      </Text>
      <RNView style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
        {suggestionKeys.map(key => {
          const label = t(key)
          return (
            <TouchableOpacity
              key={key}
              onPress={() => SendMessage(label)}
              disabled={!isInputEnabled}
              activeOpacity={0.7}
              style={{
                borderWidth: 1,
                borderColor: chipBorderColor,
                backgroundColor: chipBgColor,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 10,
                maxWidth: '100%',
                opacity: isInputEnabled ? 1 : 0.5,
              }}>
              <Text
                style={{color: chipTextColor, fontSize: 14, lineHeight: 20}}>
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </RNView>
    </RNView>
  )

  const renderLoginRequired = () => (
    <View className="flex-1 justify-center items-center py-8 px-6">
      <Ionicons
        name="log-in-outline"
        size={48}
        color={isDark ? '#9ca3af' : '#6b7280'}
        style={{marginBottom: 16}}
      />
      <Text
        style={{
          fontSize: 17,
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: 8,
        }}>
        {t('ai_assistant_login_required')}
      </Text>
      <Text
        className="opacity-60"
        style={{textAlign: 'center', marginBottom: 24, lineHeight: 22}}>
        {t('ai_assistant_login_required_detail')}
      </Text>
      <Button
        onPress={() =>
          router.push({
            pathname: '/Auth',
            params: {from: pathname},
          })
        }>
        {t('login')}
      </Button>
    </View>
  )

  const renderListEmpty = () => {
    if (!isLoggedIn) {
      return renderLoginRequired()
    }
    if (showReadyPrompt) {
      return renderReadyPrompt()
    }
    if (threadLoading) {
      return (
        <View className="flex-1 justify-center items-center py-8">
          <Text className="opacity-60">
            {t('ai_assistant_input_connecting')}
          </Text>
        </View>
      )
    }
    if (isConnecting) {
      return (
        <View className="flex-1 justify-center items-center py-8">
          <Text className="opacity-60">
            {t('ai_assistant_input_connecting')}
          </Text>
        </View>
      )
    }
    if (!isConnected) {
      return (
        <View className="flex-1 justify-center items-center py-8">
          <Text className="opacity-60">
            {t('ai_assistant_input_disconnected')}
          </Text>
        </View>
      )
    }
    return (
      <View className="flex-1 justify-center items-center py-8">
        <Text className="opacity-60">{t('ai_assistant_empty')}</Text>
      </View>
    )
  }

  if (isAdminChat && !isLeagueAdmin(leagueState.user)) {
    return (
      <>
        <Stack.Screen options={{title: t('admin_ai_agent')}} />
        <View className="flex-1 justify-center items-center px-6">
          <Text style={{textAlign: 'center'}}>
            {t('admin_ai_agent_unauthorized')}
          </Text>
        </View>
      </>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: screenTitle,
          headerRight: () => (
              <RNView style={{flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 4}}>
                {isLoggedIn ? (
                  <>
                    <TouchableOpacity
                      onPress={startNewChat}
                      disabled={isStreaming}
                      hitSlop={8}
                      accessibilityLabel={t('ai_assistant_new_chat')}>
                      <Ionicons
                        name="create-outline"
                        size={24}
                        color={headerIconColor}
                        style={{opacity: isStreaming ? 0.4 : 1}}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setHistoryOpen(true)
                        void refreshThreads()
                      }}
                      disabled={isStreaming}
                      hitSlop={8}
                      accessibilityLabel={t('ai_assistant_chat_history')}>
                      <Ionicons
                        name="time-outline"
                        size={24}
                        color={headerIconColor}
                        style={{opacity: isStreaming ? 0.4 : 1}}
                      />
                    </TouchableOpacity>
                  </>
                ) : null}
                <RNView
                  accessibilityRole="image"
                  accessibilityLabel={
                    isConnected ? t('connected') : t('disconnected')
                  }
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: isConnected ? '#16a34a' : '#dc2626',
                  }}
                />
              </RNView>
            ),
        }}
      />
      <Modal
        visible={historyOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setHistoryOpen(false)}>
        <View
          className="flex-1"
          style={{
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            backgroundColor: themeBackgroundColor,
          }}>
          <RNView
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? '#334155' : '#e2e8f0',
            }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: headerIconColor,
              }}>
              {t('ai_assistant_chat_history')}
            </Text>
            <RNView style={{flexDirection: 'row', alignItems: 'center', gap: 16}}>
              <TouchableOpacity
                onPress={startNewChat}
                disabled={isStreaming}
                hitSlop={8}>
                <Text
                  style={{
                    color: '#2563eb',
                    fontWeight: '600',
                    opacity: isStreaming ? 0.4 : 1,
                  }}>
                  {t('ai_assistant_new_chat')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setHistoryOpen(false)}
                hitSlop={8}>
                <Ionicons name="close" size={24} color={headerIconColor} />
              </TouchableOpacity>
            </RNView>
          </RNView>
          {threadsLoading ? (
            <View className="flex-1 justify-center items-center">
              <Text style={{color: themeMutedTextColor}}>
                {t('ai_assistant_input_connecting')}
              </Text>
            </View>
          ) : agentError ? (
            <View className="flex-1 justify-center items-center px-8">
              <Text
                style={{
                  textAlign: 'center',
                  color: isDark ? '#fecaca' : '#b91c1c',
                }}>
                {agentError}
              </Text>
            </View>
          ) : threads.length === 0 ? (
            <View className="flex-1 justify-center items-center px-8">
              <Text
                style={{
                  textAlign: 'center',
                  color: themeMutedTextColor,
                }}>
                {t('ai_assistant_no_saved_chats')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={threads}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{paddingVertical: 8}}
              renderItem={({item}) => {
                const isActive = item.id === activeThreadId
                return (
                  <RNView
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginHorizontal: 12,
                      marginVertical: 4,
                      borderRadius: 10,
                      backgroundColor: isActive
                        ? isDark
                          ? '#1e3a5f'
                          : '#eff6ff'
                        : 'transparent',
                    }}>
                    <TouchableOpacity
                      style={{flex: 1, paddingHorizontal: 12, paddingVertical: 12}}
                      onPress={() => void loadThread(item.id)}
                      disabled={isStreaming || threadLoading}>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 15,
                          fontWeight: '600',
                          color: isActive
                            ? isDark
                              ? '#bfdbfe'
                              : '#1e40af'
                            : headerIconColor,
                        }}>
                        {item.title}
                      </Text>
                      <Text
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: themeMutedTextColor,
                        }}>
                        {formatThreadTime(item.updated_at)}
                        {item.message_count > 0
                          ? ` · ${item.message_count} ${t('ai_assistant_msgs')}`
                          : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteThread(item.id)}
                      disabled={isStreaming}
                      hitSlop={8}
                      style={{paddingHorizontal: 12, paddingVertical: 12}}>
                      <Ionicons
                        name="close"
                        size={18}
                        color={isDark ? '#94a3b8' : '#64748b'}
                      />
                    </TouchableOpacity>
                  </RNView>
                )
              }}
            />
          )}
        </View>
      </Modal>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View className="flex-1">
          {displayError ? (
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 8,
                padding: 12,
                borderRadius: 8,
                backgroundColor: isDark ? '#7f1d1d' : '#fef2f2',
              }}>
              <Text
                style={{
                  color: isDark ? '#fecaca' : '#b91c1c',
                  fontSize: 13,
                }}>
                {displayError}
              </Text>
            </View>
          ) : null}

          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            ListFooterComponent={renderListFooter}
            contentContainerStyle={{
              paddingVertical: 16,
              paddingBottom: insets.bottom + 80,
            }}
            ListEmptyComponent={renderListEmpty()}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({animated: true})
            }}
          />

          {/* Input Area */}
          {isLoggedIn ? (
            <View
              className="border-t border-gray-300 dark:border-gray-700"
              style={{
                paddingBottom: insets.bottom,
                backgroundColor: 'transparent',
              }}>
              {visionEnabled && pendingImageUris.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 8,
                    gap: 8,
                  }}>
                  {pendingImageUris.map(uri => (
                    <View key={uri} style={{position: 'relative'}}>
                      <Image
                        source={{uri}}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 8,
                          backgroundColor: isDark ? '#334155' : '#e2e8f0',
                        }}
                      />
                      <TouchableOpacity
                        onPress={() =>
                          setPendingImageUris(prev =>
                            prev.filter(u => u !== uri),
                          )
                        }
                        disabled={!isInputEnabled}
                        style={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          borderRadius: 10,
                          width: 20,
                          height: 20,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name="close" size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
              <View className="flex-row items-center px-4 py-2 gap-2">
                {visionEnabled ? (
                  <TouchableOpacity
                    onPress={() => void pickImages()}
                    disabled={
                      !isInputEnabled ||
                      pendingImageUris.length >= AI_CHAT_IMAGE_MAX_PER_TURN
                    }
                    className="rounded-full p-3 bg-gray-200 dark:bg-gray-700"
                    style={{
                      opacity:
                        !isInputEnabled ||
                        pendingImageUris.length >= AI_CHAT_IMAGE_MAX_PER_TURN
                          ? 0.5
                          : 1,
                    }}>
                    {uploadingImages ? (
                      <ActivityIndicator size="small" color="#3b82f6" />
                    ) : (
                      <Ionicons
                        name="image-outline"
                        size={20}
                        color={isDark ? '#93c5fd' : '#2563eb'}
                      />
                    )}
                  </TouchableOpacity>
                ) : null}
                <View style={{flex: 1, justifyContent: 'center'}}>
                  <TextInput
                    placeholder={inputPlaceholder}
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={() => SendMessage()}
                    disabled={!isInputEnabled}
                    multiline
                    maxLength={1000}
                    textAlignVertical="center"
                    containerStyle={{
                      opacity: isInputEnabled ? 1 : 0.5,
                    }}
                    inputStyle={{
                      height: undefined,
                      minHeight: 48,
                      paddingTop: 12,
                      paddingBottom: 12,
                    }}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => SendMessage()}
                  disabled={!canSend}
                  className={`rounded-full p-3 ${
                    canSend
                      ? 'bg-blue-500 dark:bg-blue-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  style={{
                    opacity: canSend ? 1 : 0.5,
                  }}>
                  <Ionicons
                    name="send"
                    size={20}
                    color={canSend ? 'white' : 'gray'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </>
  )
}
