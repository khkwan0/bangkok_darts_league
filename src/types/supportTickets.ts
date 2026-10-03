export const SUPPORT_TICKET_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'closed',
] as const

export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number]

export type SupportTicketAttachment = {
  id: number
  stored_filename: string
  original_filename: string
  kind: 'image' | 'text'
  file_ext: string
  byte_size: number
  created_at: string
}

export type SupportTicketReply = {
  id: number
  support_ticket_id: number
  player_id: number
  author_display_name: string
  message: string
  is_staff: boolean
  created_at: string
  attachments: SupportTicketAttachment[]
  is_unread?: boolean
}

export type MemberSupportTicketListItem = {
  id: number
  title: string | null
  message: string
  status: SupportTicketStatus
  attachment_count: number
  reply_count: number
  unread_staff_replies: number
  created_at: string
  updated_at: string
}

export type MemberSupportTicketDetail = {
  id: number
  title: string | null
  message: string
  status: SupportTicketStatus
  created_at: string
  updated_at: string
  attachments: SupportTicketAttachment[]
  replies: SupportTicketReply[]
}

export type AdminSupportTicketListItem = {
  id: number
  player_id: number
  player_display_name: string
  player_email: string | null
  title: string | null
  message: string
  status: SupportTicketStatus
  attachment_count: number
  unread_user_activity: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type AdminSupportTicketDetail = AdminSupportTicketListItem & {
  admin_notes: string | null
  attachments: SupportTicketAttachment[]
  replies: SupportTicketReply[]
  initial_message_unread?: boolean
}

export type SupportImageAttachment = {
  uri: string
  name: string
  type: string
}
