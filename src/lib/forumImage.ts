import config from '@/config'
import {
  isAnnouncementImageUrl,
  resolveAnnouncementImageUrl,
} from '@/lib/announcementContent'

const IMG_TAG_RE = /<img\b[^>]*\/?>/gi
const IMG_ATTR_RE = (name: string) =>
  new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i')

function forumImagesOrigin(): string {
  if (config.forumImagesUrl) {
    return config.forumImagesUrl
      .replace(/\/forum_images\/?$/, '')
      .replace(/\/$/, '')
  }
  return config.apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
}

export function resolveForumImageUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    if (isAnnouncementImageUrl(trimmed)) {
      return resolveAnnouncementImageUrl(trimmed)
    }
    return trimmed
  }
  if (isAnnouncementImageUrl(trimmed)) {
    return resolveAnnouncementImageUrl(trimmed)
  }
  if (trimmed.startsWith('/forum_images/')) {
    return `${forumImagesOrigin()}${trimmed}`
  }
  if (trimmed.startsWith('forum_images/')) {
    return `${forumImagesOrigin()}/${trimmed}`
  }
  return `${forumImagesOrigin()}/forum_images/${trimmed.replace(/^\//, '')}`
}

/** Web posts use display filenames ending in `_display.jpg`. */
export function forumImageDisplayToOriginal(displaySrc: string): string | null {
  if (!/_display\.jpg$/i.test(displaySrc)) {
    return null
  }
  return displaySrc.replace(/_display\.jpg$/i, '_original.jpg')
}

export function resolveForumImageFullUrl(
  displaySrc: string,
  explicitFullSrc?: string | null,
): string {
  if (explicitFullSrc?.trim()) {
    return resolveForumImageUrl(explicitFullSrc)
  }
  const original = forumImageDisplayToOriginal(displaySrc)
  if (original) {
    return resolveForumImageUrl(original)
  }
  return resolveForumImageUrl(displaySrc)
}

export function parseForumImageTag(tag: string): {
  displayUrl: string
  fullUrl: string
} | null {
  const srcMatch = tag.match(IMG_ATTR_RE('src'))
  if (!srcMatch?.[1]) return null
  const displayUrl = resolveForumImageUrl(srcMatch[1])
  const fullMatch = tag.match(IMG_ATTR_RE('data-full'))
  const fullUrl = resolveForumImageFullUrl(srcMatch[1], fullMatch?.[1])
  return {displayUrl, fullUrl}
}

function toForumImagePath(filename: string): string {
  const trimmed = filename.trim()
  if (trimmed.startsWith('/forum_images/')) {
    return trimmed
  }
  return `/forum_images/${trimmed.replace(/^\//, '')}`
}

export function buildForumImageEmbed(
  displayFilename: string,
  originalFilename: string,
): string {
  const display = toForumImagePath(displayFilename)
  const full = toForumImagePath(originalFilename)
  return `\n<img src="${display}" data-full="${full}" alt="Forum image" />\n`
}

const IMAGE_TOKEN_RE = /\[image (\d+)\]/g

export function forumImageToken(n: number): string {
  return `[image ${n}]`
}

/** Editable composer text: `<img>` tags swapped for `[image N]` tokens (N indexes `images`). */
export type ForumComposerContent = {
  text: string
  images: string[]
}

export function parseForumComposerContent(raw: string): ForumComposerContent {
  const images: string[] = []
  const text = raw.replace(IMG_TAG_RE, tag => {
    images.push(tag)
    return forumImageToken(images.length)
  })
  return {text, images}
}

export function serializeForumComposerContent({text, images}: ForumComposerContent): string {
  return text.replace(IMAGE_TOKEN_RE, (token, n: string) => images[Number(n) - 1] ?? token)
}

/** Image numbers whose token is still present in the text, in order of appearance. */
export function forumComposerImageNumbers({text, images}: ForumComposerContent): number[] {
  const seen = new Set<number>()
  for (const match of text.matchAll(IMAGE_TOKEN_RE)) {
    const n = Number(match[1])
    if (images[n - 1]) seen.add(n)
  }
  return [...seen]
}

export function preserveForumImageTags(content: string): string {
  return content.replace(IMG_TAG_RE, match => `\n\n${match}\n\n`)
}
