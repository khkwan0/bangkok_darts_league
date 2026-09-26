/**
 * Tiptap (web forum editor) serializes with html:true, producing block HTML like
 * `<p>…</p>` and `<h2>…</h2>`. markdown-it turns those into html_block tokens
 * that react-native-markdown-display ignores. Convert to markdown + inline HTML.
 */

function unwrapInlineHtml(html: string): string {
  let s = html

  s = s.replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
  s = s.replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
  s = s.replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
  s = s.replace(/<i\b[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
  s = s.replace(/<(s|del|strike)\b[^>]*>([\s\S]*?)<\/\1>/gi, '~~$2~~')
  s = s.replace(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    '[$2]($1)',
  )
  s = s.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')

  // Keep forum image tags intact for inline HTML rendering.
  s = s.replace(/<img\b[^>]*\/?>/gi, match => match)

  return s.trim()
}

/** Parse `color:` from a CSS style attribute (any property order). */
export function extractColorFromStyle(style: string): string | null {
  const match = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)
  if (!match) return null
  const trimmed = match[1]!.trim()
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return trimmed
  if (/^rgba?\(\s*[\d.,\s%]+\s*\)$/i.test(trimmed)) return trimmed
  if (/^[a-z]{3,20}$/i.test(trimmed)) return trimmed
  return null
}

export type ColoredSegment = {
  text: string
  color?: string
}

/** Private markers — unlikely to appear in user content. */
const MARKER_OPEN = '\uFFFDC:'
const MARKER_MID = '\uFFFE'
const MARKER_CLOSE = '\uFFFF'

/** Innermost colored span (no nested `<span>` inside). */
const INNERMOST_COLORED_SPAN =
  /<span\b[^>]*\bstyle=["']([^"']*)["'][^>]*>((?:(?!<span\b)[\s\S])*?)<\/span>/gi

function splitMarkedContent(text: string): ColoredSegment[] {
  const segments: ColoredSegment[] = []
  let cursor = 0

  while (cursor < text.length) {
    const openIndex = text.indexOf(MARKER_OPEN, cursor)
    if (openIndex === -1) {
      const tail = text.slice(cursor)
      if (tail) segments.push({text: tail})
      break
    }

    if (openIndex > cursor) {
      segments.push({text: text.slice(cursor, openIndex)})
    }

    const colorStart = openIndex + MARKER_OPEN.length
    const midIndex = text.indexOf(MARKER_MID, colorStart)
    const closeIndex = text.indexOf(MARKER_CLOSE, midIndex + 1)
    if (midIndex === -1 || closeIndex === -1) {
      segments.push({text: text.slice(openIndex)})
      break
    }

    const color = text.slice(colorStart, midIndex)
    const inner = text.slice(midIndex + MARKER_MID.length, closeIndex)
    segments.push({text: inner, color})
    cursor = closeIndex + MARKER_CLOSE.length
  }

  return segments.length ? segments : [{text}]
}

/** Split markdown into plain and colored runs (from web editor `<span style="color:…">`). */
export function extractColoredSegments(content: string): ColoredSegment[] {
  if (!content.includes('<span')) {
    return content ? [{text: content}] : []
  }

  let work = content
  let replaced = true
  while (replaced) {
    replaced = false
    work = work.replace(INNERMOST_COLORED_SPAN, (full, style, inner) => {
      const color = extractColorFromStyle(style)
      if (!color) return full
      replaced = true
      return `${MARKER_OPEN}${color}${MARKER_MID}${inner}${MARKER_CLOSE}`
    })
  }

  // Drop any leftover span tags without a usable color.
  work = work.replace(/<\/?span\b[^>]*>/gi, '')

  return splitMarkedContent(work)
}

export function normalizeForumMarkdown(content: string): string {
  if (!content.includes('<')) {
    return content
  }

  let text = content.replace(/\r\n/g, '\n')

  text = text.replace(/<br\s*\/?>/gi, '\n')

  text = text.replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_, inner) => {
    const body = unwrapInlineHtml(inner)
    return body ? `## ${body}\n\n` : ''
  })

  text = text.replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_, inner) => {
    const body = unwrapInlineHtml(inner)
    return body ? `### ${body}\n\n` : ''
  })

  text = text.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    const lines = inner
      .trim()
      .split('\n')
      .map(line => unwrapInlineHtml(line.trim()))
      .filter(Boolean)
    return lines.length ? `${lines.map(line => `> ${line}`).join('\n')}\n\n` : ''
  })

  text = text.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) => {
    const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map(m => unwrapInlineHtml(m[1] ?? ''))
      .filter(Boolean)
    return items.length ? `${items.map(item => `- ${item}`).join('\n')}\n\n` : ''
  })

  text = text.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map(m => unwrapInlineHtml(m[1] ?? ''))
      .filter(Boolean)
    return items.length
      ? `${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n\n`
      : ''
  })

  text = text.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => {
    if (/<img\b/i.test(inner)) {
      return `${inner.trim()}\n\n`
    }
    const body = unwrapInlineHtml(inner)
    return body ? `${body}\n\n` : ''
  })

  text = text.replace(/<pre\b[^>]*><code\b[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, inner) => {
    return `\`\`\`\n${inner.trim()}\n\`\`\`\n\n`
  })

  return text.replace(/\n{3,}/g, '\n\n').trim()
}
