export type AgentScope = 'member' | 'admin'

export type CueChatSessionMessage = {
  id: string
  message: string
  nickname: string
  playerId: number
  timestamp: number
  rawData?: unknown
  isUserMessage?: boolean
}

export type CueChatSession = {
  threadId: number | null
  messages: CueChatSessionMessage[]
}

const sessions = new Map<string, CueChatSession>()

function sessionKey(userId: number, scope: AgentScope) {
  return `${scope}:${userId}`
}

export function getCueChatSession(
  userId: number,
  scope: AgentScope = 'member',
): CueChatSession | null {
  return sessions.get(sessionKey(userId, scope)) ?? null
}

export function setCueChatSession(
  userId: number,
  session: CueChatSession,
  scope: AgentScope = 'member',
) {
  sessions.set(sessionKey(userId, scope), session)
}

export function clearCueChatSession(userId?: number, scope: AgentScope = 'member') {
  if (typeof userId === 'number') {
    sessions.delete(sessionKey(userId, scope))
    return
  }
  sessions.clear()
}
