import config from '@/config'

/** Public site origin for support attachment URLs (apiUrl without trailing /api). */
export function supportSiteOrigin(apiUrl?: string | null): string {
  const raw = (apiUrl || config.apiUrl || '').replace(/\/$/, '')
  if (raw.endsWith('/api')) {
    return raw.slice(0, -4)
  }
  return raw
}

export function supportAttachmentUrl(
  storedFilename: string,
  apiUrl?: string | null,
): string {
  const origin = supportSiteOrigin(apiUrl)
  return `${origin}/support_attachments/${storedFilename}`
}

export function canMemberReplyToTicket(status: string): boolean {
  return status !== 'closed'
}

export function supportStatusLabelKey(status: string): string {
  switch (status) {
    case 'open':
      return 'support_status_open'
    case 'in_progress':
      return 'support_status_in_progress'
    case 'resolved':
      return 'support_status_resolved'
    case 'closed':
      return 'support_status_closed'
    default:
      return 'support_status_open'
  }
}

export function messagePreview(message: string, max = 120): string {
  const trimmed = message.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= max) {
    return trimmed
  }
  return `${trimmed.slice(0, max)}…`
}
