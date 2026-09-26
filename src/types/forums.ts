export type ForumCategory = {
  id: number
  name: string
  slug: string
  description: string | null
  display_order: number
  is_active: boolean
}

export type ForumBoard = {
  id: number
  category_id: number
  name: string
  slug: string
  description: string | null
  display_order: number
  is_active: boolean
  is_locked: boolean
  contributes_to_global_badge?: boolean
  topic_count: number
  post_count: number
  last_post_at: string | null
  category_slug?: string
  category_name?: string
  can_pin?: boolean
  can_lock_hide?: boolean
}

export type ForumCategoryWithForums = ForumCategory & {
  forums: ForumBoard[]
}

export type ForumTopicListItem = {
  id: number
  forum_id: number
  author_id: number
  title: string
  slug: string | null
  is_pinned: boolean
  is_locked: boolean
  is_hidden: boolean
  view_count: number
  reply_count: number
  last_post_at: string | null
  last_post_author_name: string | null
  author_name: string
  created_at: string
  has_poll?: boolean
}

export type ForumPost = {
  id: number
  topic_id: number
  author_id: number
  content: string
  post_number: number
  is_anonymous: boolean
  is_hidden: boolean
  edited_at: string | null
  created_at: string
  author_name: string
  author_real_name?: string | null
}

export type ForumPoll = {
  id: number
  question: string
  is_multiple_choice: boolean
  is_closed: boolean
  voter_count: number
  options: {
    id: number
    label: string
    vote_count: number
    percentage: number
  }[]
  user_votes: number[]
}

export type ForumSettings = {
  opening_post_max_length: number
  reply_max_length: number
  topic_title_max_length: number
}

export const FORUM_SETTINGS_DEFAULTS: ForumSettings = {
  opening_post_max_length: 10000,
  reply_max_length: 5000,
  topic_title_max_length: 512,
}

export type ForumTopicDetail = {
  forum: ForumBoard
  topic: ForumTopicListItem & {forum_slug?: string; category_slug?: string}
  poll: ForumPoll | null
  opening_post?: {id: number; content: string} | null
  can_reply: boolean
  can_moderate: boolean
  can_manage: boolean
  can_pin: boolean
  can_lock_hide: boolean
}

export type Paginated<T> = {
  items: T[]
  page: number
  page_size: number
  total: number
  total_pages: number
  sort?: 'asc' | 'desc'
}

export type ForumPostReactionState = {
  counts: Record<number, number>
  userIconId: number | null
}

export type ForumReactionIcon = {
  id: number
  name: string
  emoji: string
  display_order: number
  is_active: boolean
}

export type ForumPostsPage = Paginated<ForumPost> & {
  original_post: ForumPost | null
  reaction_icons?: ForumReactionIcon[]
  reactions_by_post_id?: Record<number, ForumPostReactionState>
}

export type ForumTopicUpdate = {
  title?: string
  content?: string
  is_pinned?: boolean
  is_locked?: boolean
  is_hidden?: boolean
}

export type ForumTopicPatchResult = {
  status: 'ok' | 'error'
  topic_slug?: string
  error?: string
  max_length?: number
}

export type ForumTopicCreateInput = {
  title: string
  content?: string
  is_anonymous?: boolean
  is_pinned?: boolean
  is_locked?: boolean
  is_hidden?: boolean
}

export type ForumTopicCreateResult = {
  status: 'ok' | 'error'
  topic_slug?: string
  topic_id?: number
  error?: string
  max_length?: number
}

export type ForumImageUploadResult = {
  status: 'ok' | 'error'
  original_url?: string
  display_url?: string
  error?: string
}
