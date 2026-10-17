import config from '@/config'

const ANNOUNCEMENT_IMAGE_RE =
  /announcements(?:\/gallery\/serve|_gallery)|\/api\/api\/announcements/i

const ANNOUNCEMENT_VIDEO_EXT_RE =
  /\.(mp4|mov|m4v|webm)(?:\?|#|$)/i

/** Keep in sync with backend gallery upload + nginx client_max_body_size. */
export const ANNOUNCEMENT_MAX_VIDEO_BYTES = 100 * 1024 * 1024

function apiOrigin(apiUrl: string): string {
  return apiUrl.replace(/\/$/, '').replace(/\/api$/i, '')
}

/** True when a markdown media URL points at a playable video file. */
export function isAnnouncementVideoUrl(src: string): boolean {
  const trimmed = src.trim()
  if (!trimmed) {
    return false
  }
  try {
    const path = /^https?:\/\//i.test(trimmed)
      ? new URL(trimmed).pathname
      : trimmed.split('?')[0]?.split('#')[0] ?? trimmed
    return ANNOUNCEMENT_VIDEO_EXT_RE.test(path)
  } catch {
    return ANNOUNCEMENT_VIDEO_EXT_RE.test(trimmed)
  }
}

/** Resolve a single announcement image/video URL for mobile rendering. */
export function resolveAnnouncementImageUrl(
  src: string,
  apiUrl?: string,
): string {
  const trimmed = src.trim()
  if (!trimmed) {
    return trimmed
  }

  const base = (apiUrl ?? config.apiUrl ?? '').replace(/\/$/, '')
  const origin = base ? apiOrigin(base) : ''

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/(\/\/[^/]+)\/api\/api\//i, '$1/api/')
  }

  if (!origin) {
    return trimmed
  }

  if (trimmed.startsWith('/api/announcements/gallery/serve/')) {
    return `${origin}${trimmed}`
  }

  if (trimmed.startsWith('/announcements_gallery/')) {
    return `${origin}${trimmed}`
  }

  if (trimmed.startsWith('announcements_gallery/')) {
    return `${origin}/${trimmed}`
  }

  if (trimmed.startsWith('/api/')) {
    return `${origin}${trimmed}`
  }

  if (trimmed.includes('announcements/gallery/serve/')) {
    return trimmed.startsWith('/')
      ? `${origin}${trimmed}`
      : `${origin}/${trimmed}`
  }

  return trimmed
}

export function isAnnouncementImageUrl(src: string): boolean {
  return ANNOUNCEMENT_IMAGE_RE.test(src)
}

/** Prefix relative announcement gallery URLs in markdown content. */
export function resolveAnnouncementContent(
  content: string,
  apiUrl?: string,
): string {
  if (!content) {
    return content
  }

  const base = apiUrl ?? config.apiUrl
  if (!base) {
    return content
  }

  let resolved = content.replace(
    /(\!\[[^\]]*\]\()([^)]+)(\))/g,
    (match, prefix, url, suffix) => {
      const trimmed = String(url).trim()
      if (
        isAnnouncementImageUrl(trimmed) ||
        trimmed.startsWith('/announcements_gallery/') ||
        trimmed.startsWith('/api/announcements/')
      ) {
        return `${prefix}${resolveAnnouncementImageUrl(trimmed, base)}${suffix}`
      }
      return match
    },
  )

  resolved = resolved.replace(
    /<img\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      const trimmed = String(src).trim()
      if (!isAnnouncementImageUrl(trimmed)) {
        return match
      }
      const fixed = resolveAnnouncementImageUrl(trimmed, base)
      return `<img${before}src="${fixed}"${after}>`
    },
  )

  resolved = resolved.replace(
    /<video\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      const trimmed = String(src).trim()
      if (
        !isAnnouncementImageUrl(trimmed) &&
        !trimmed.startsWith('/announcements_gallery/') &&
        !trimmed.startsWith('/api/announcements/')
      ) {
        return match
      }
      const fixed = resolveAnnouncementImageUrl(trimmed, base)
      return `<video${before}src="${fixed}"${after}>`
    },
  )

  return resolved
}

export function buildAnnouncementImageEmbed(apiUrl: string, path: string): string {
  const url = resolveAnnouncementImageUrl(path, apiUrl)
  return `\n![image](${url})\n`
}

export function buildAnnouncementVideoEmbed(apiUrl: string, path: string): string {
  const url = resolveAnnouncementImageUrl(path, apiUrl)
  return `\n![video](${url})\n`
}
