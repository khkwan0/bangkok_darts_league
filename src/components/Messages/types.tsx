export interface Message {
  id: number
  title: string
  message: string
  created_at: string
  read_at: string
  sender_nickname: string
  receiver_nickname: string
  from_player_id: number
  to_player_id: number
  root_id: number
  reply_to: number
}

export interface MessageCardProps {
  message: Message
  showAll: boolean
}

export interface Thread {
  id?: number
  thread_id?: number
  root_id?: number
  title?: string
  last_message?: string
  last_message_preview?: string
  last_message_at?: string
  created_at?: string
  unread_count?: number
  participant_name?: string
  participant_nickname?: string
  from?: string
  sender_nickname?: string
  other_player_id?: number
  other_player_nickname?: string
  other_player_firstname?: string
  other_player_lastname?: string
  other_player_profile_picture?: string
}

export interface MessagesProps {
  threads: Thread[]
  loading: boolean
  onThreadPress: (thread: Thread) => void
  onThreadDelete?: (thread: Thread) => void
  onThreadMarkAllRead?: (thread: Thread) => void
  /** Bulk: mark every thread’s messages as read */
  onMarkAllThreadsRead?: () => void | Promise<void>
  /** Bulk: delete every conversation (confirm in parent) */
  onDeleteAllThreads?: () => void | Promise<void>
  footerBusy?: boolean
}
