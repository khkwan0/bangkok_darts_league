import {Image, type ImageSource} from 'expo-image'
import config from '@/config'

const SKIP_INITIAL_WORDS = new Set(['the', 'a', 'an'])

export function venueInitial(name?: string | null): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const meaningful =
    parts.find(word => !SKIP_INITIAL_WORDS.has(word.toLowerCase())) ||
    parts[0] ||
    '?'
  return meaningful.charAt(0).toUpperCase() || '?'
}

function logoBaseUrl(): string {
  return String((config as {logoUrl?: string}).logoUrl || '').replace(/\/?$/, '/')
}

function bustToken(modified?: string | Date | null, logo?: string): string {
  if (modified instanceof Date) return modified.toISOString()
  if (modified != null && String(modified).trim()) return String(modified).trim()
  return logo || '0'
}

/**
 * Remote logo source for expo-image.
 * Disk-cached by URL; `modified` (from venues.modified) is appended as `?v=` so a
 * logo change after upload / UpdateVenueLogo invalidates the local cache entry.
 */
export function venueLogoSource(opts: {
  logo?: string | null
  venueId?: number | null
  modified?: string | Date | null
}): (ImageSource & {cacheKey: string}) | null {
  const logo = String(opts.logo || '').trim()
  if (!logo) return null

  const uriBase = /^https?:\/\//i.test(logo) ? logo : logoBaseUrl() + logo
  const bust = bustToken(opts.modified, logo)
  const sep = uriBase.includes('?') ? '&' : '?'
  const uri = `${uriBase}${sep}v=${encodeURIComponent(bust)}`
  // Same string as the URI so prefetch (keyed by URL) and render share one cache entry.
  const cacheKey = uri

  return {
    uri,
    cacheKey,
  }
}

/** FlatList recycling key that changes when the logo version changes. */
export function venueLogoRecyclingKey(opts: {
  logo?: string | null
  venueId?: number | null
  modified?: string | Date | null
}): string | undefined {
  const source = venueLogoSource(opts)
  if (!source) return undefined
  const venueId =
    opts.venueId != null && Number(opts.venueId) > 0 ? Number(opts.venueId) : 0
  return `venue-logo:${venueId}:${source.cacheKey}`
}

/** Warm expo-image disk cache for a venue list (best-effort). */
export function prefetchVenueLogos(
  venues: Array<{
    id?: number | null
    logo?: string | null
    modified?: string | Date | null
  }>,
): void {
  const uris = venues
    .map(v => venueLogoSource({logo: v.logo, venueId: v.id, modified: v.modified})?.uri)
    .filter((uri): uri is string => Boolean(uri))
  if (uris.length === 0) return
  void Image.prefetch(uris, 'disk')
}
