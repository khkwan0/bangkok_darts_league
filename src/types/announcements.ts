export type Announcement = {
  id: number
  title: string
  content: string
  created_at: string
  modified_at: string
  read_at?: string | null
}

export type AnnouncementListItem = {
  id: number
  title: string
  content_preview: string
  created_at: string
  modified_at: string
  read_at: string | null
}

export type AdminAnnouncementListItem = {
  id: number
  title: string
  content_preview: string
  created_at: string
  modified_at: string
  active: boolean
}

export type PaginatedAnnouncements = {
  items: AnnouncementListItem[]
  total: number
}

export type PaginatedAdminAnnouncements = {
  items: AdminAnnouncementListItem[]
  total: number
}

export type AnnouncementImageUploadResult =
  | {status: 'ok'; url: string; id?: number}
  | {status: 'error'; error: string}
