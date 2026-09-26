export const MEMBER_AI_CHAT_THREADS_PATH = 'ai-agent/chat-threads'
export const ADMIN_AI_CHAT_THREADS_PATH = 'admin/ai/chat-threads'
export const AI_CHAT_THREADS_PATH = MEMBER_AI_CHAT_THREADS_PATH
export const AI_CHAT_LLM_PAIR_LIMIT = 20
export const MEMBER_AI_CAPABILITIES_PATH = 'ai-agent/capabilities'
export const ADMIN_AI_CAPABILITIES_PATH = 'admin/ai/capabilities'
export const MEMBER_AI_CHAT_IMAGES_PATH = 'ai-agent/chat-images'
export const ADMIN_AI_CHAT_IMAGES_PATH = 'admin/ai/chat-images'
export const AI_CHAT_IMAGE_MAX_PER_TURN = 4

export type AiChatTurn = {
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

export type AiChatVisionContentV1 = {
  v: 1
  text: string
  images: string[]
}

export type AiChatThreadSummary = {
  id: number
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export type ChatMessageLike = {
  id: string
  message: string
  nickname: string
  playerId: number
  timestamp: number
  isUserMessage?: boolean
}

export type LlmContentPart =
  | {type: 'text'; text: string}
  | {type: 'image_url'; image_url: {url: string}}

export function parseAiChatVisionContent(
  content: string,
): AiChatVisionContentV1 | null {
  const trimmed = content.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    const parsed = JSON.parse(trimmed) as Partial<AiChatVisionContentV1>
    if (parsed?.v !== 1 || typeof parsed.text !== 'string') return null
    if (!Array.isArray(parsed.images)) return null
    const images = parsed.images.filter(
      (u): u is string => typeof u === 'string' && u.trim().length > 0,
    )
    return {v: 1, text: parsed.text, images}
  } catch {
    return null
  }
}

export function serializeAiChatVisionContent(
  text: string,
  images: string[],
): string {
  const payload: AiChatVisionContentV1 = {
    v: 1,
    text,
    images: images.slice(0, AI_CHAT_IMAGE_MAX_PER_TURN),
  }
  return JSON.stringify(payload)
}

export function displayTextFromAiChatContent(content: string): string {
  return parseAiChatVisionContent(content)?.text ?? content
}

export function imagesFromAiChatContent(content: string): string[] {
  return parseAiChatVisionContent(content)?.images ?? []
}

export function absoluteSiteUrl(pathOrUrl: string, apiUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith('data:')) {
    return pathOrUrl
  }
  const base = apiUrl.replace(/\/api\/?$/, '')
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${base}${path}`
}

export function turnToLlmContent(
  content: string,
  visionEnabled: boolean,
  apiUrl: string,
): string | LlmContentPart[] {
  const images = imagesFromAiChatContent(content)
  const text = displayTextFromAiChatContent(content)
  if (!visionEnabled || images.length === 0) return text
  const parts: LlmContentPart[] = []
  if (text.trim()) parts.push({type: 'text', text})
  for (const url of images.slice(0, AI_CHAT_IMAGE_MAX_PER_TURN)) {
    parts.push({
      type: 'image_url',
      image_url: {url: absoluteSiteUrl(url, apiUrl)},
    })
  }
  return parts.length > 0 ? parts : text
}

export function sliceChatHistoryForLlm(
  history: AiChatTurn[],
  pairLimit: number = AI_CHAT_LLM_PAIR_LIMIT,
): AiChatTurn[] {
  const maxMessages = Math.max(0, pairLimit) * 2
  if (history.length <= maxMessages) return history
  return history.slice(-maxMessages)
}

export function healDuplicateTurns<T extends {role: string; content: string}>(
  turns: T[],
): T[] {
  return turns.filter((turn, index) => {
    if (index === 0) return true
    const prev = turns[index - 1]
    return !(prev && prev.role === turn.role && prev.content === turn.content)
  })
}

export function chatMessagesToTurns(
  messages: ChatMessageLike[],
  currentUserId: number,
): AiChatTurn[] {
  return messages
    .filter(item => item.message.trim())
    .map(item => ({
      role: (item.isUserMessage || item.playerId === currentUserId
        ? 'user'
        : 'assistant') as 'user' | 'assistant',
      content: item.message,
      created_at: new Date(
        item.timestamp < 10000000000 ? item.timestamp * 1000 : item.timestamp,
      ).toISOString(),
    }))
}

export function turnsToChatMessages(
  turns: AiChatTurn[],
  currentUserId: number,
  currentNickname: string,
): ChatMessageLike[] {
  return turns.map((turn, index) => {
    const isUserMessage = turn.role === 'user'
    const parsed = turn.created_at ? Date.parse(turn.created_at) : NaN
    return {
      id: `thread_${index}_${turn.created_at ?? index}`,
      message: turn.content,
      nickname: isUserMessage ? currentNickname : 'Response',
      playerId: isUserMessage ? currentUserId : 0,
      timestamp: Number.isNaN(parsed) ? Date.now() : parsed,
      isUserMessage,
    }
  })
}

export function formatThreadTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
