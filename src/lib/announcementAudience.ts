import Constants from 'expo-constants'
import {Platform} from 'react-native'

export type AnnouncementAudienceFields = {
  min_build?: number | null
  max_build?: number | null
  min_app_version?: string | null
  max_app_version?: string | null
}

export type AppClientAudience = {
  build: number | null
  version: string | null
}

/** Native build + marketing version for this install (matches X-App-* headers). */
export function getAppClientAudience(): AppClientAudience {
  const version = Constants.expoConfig?.version
    ? String(Constants.expoConfig.version)
    : null
  const buildRaw =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode
  const build =
    buildRaw != null && String(buildRaw).trim() !== ''
      ? parseInt(String(buildRaw), 10)
      : NaN
  return {
    build: Number.isFinite(build) && build >= 0 ? build : null,
    version,
  }
}

function versionParts(raw: string | null | undefined): [number, number, number] {
  if (!raw) return [0, 0, 0]
  const cleaned = String(raw)
    .trim()
    .replace(/^v/i, '')
    .replace(/[^0-9.]+/g, '')
  const parts = cleaned
    .split('.')
    .slice(0, 3)
    .map(part => {
      const n = parseInt(part.replace(/[^0-9].*$/, ''), 10)
      return Number.isFinite(n) ? n : 0
    })
  while (parts.length < 3) parts.push(0)
  return [parts[0]!, parts[1]!, parts[2]!]
}

function versionCmp(a: string, b: string): number {
  const pa = versionParts(a)
  const pb = versionParts(b)
  for (let i = 0; i < 3; i++) {
    if (pa[i]! > pb[i]!) return 1
    if (pa[i]! < pb[i]!) return -1
  }
  return 0
}

/**
 * Whether this announcement may show in the launch dialog for the client.
 * Null bounds = no restriction. List/detail screens ignore this.
 */
export function matchesAnnouncementAudience(
  row: AnnouncementAudienceFields,
  audience: AppClientAudience = getAppClientAudience(),
): boolean {
  if (row.min_build != null) {
    if (audience.build == null || audience.build < row.min_build) return false
  }
  if (row.max_build != null) {
    if (audience.build == null || audience.build > row.max_build) return false
  }
  const minVer = row.min_app_version?.trim() || null
  if (minVer) {
    if (!audience.version || versionCmp(audience.version, minVer) < 0) {
      return false
    }
  }
  const maxVer = row.max_app_version?.trim() || null
  if (maxVer) {
    if (!audience.version || versionCmp(audience.version, maxVer) > 0) {
      return false
    }
  }
  return true
}
