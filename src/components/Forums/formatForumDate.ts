export function formatForumDate(value: string | null, locale: string): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

export function topicSlug(topic: {slug: string | null; id: number}): string {
  return topic.slug ?? String(topic.id)
}
