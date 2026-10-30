import config from '@/config'
import {useLeagueContext} from '@/context/LeagueContext'
import {useNetwork} from '@/hooks/useNetwork'
import {leagueRequestHeaders} from '@/lib/leagueRequest'
import type {HomePanelId, HomePanelSport} from '@/lib/homePanels'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {File} from 'expo-file-system'
import {manipulateAsync, SaveFormat} from 'expo-image-manipulator'
import React from 'react'

export type AdminLeagueListItem = {
  id: number
  name: string
  is_default?: boolean
}

export type AdminLeagueAdmin = {
  id: number
  nickname: string
  email: string
}

export type AdminLeagueDetail = {
  id: number
  name: string
  slug: string
  short_name: string
  tagline: string | null
  primary_domain: string
  domain_aliases: string[]
  logo_url: string | null
  favicon_url: string | null
  og_image_url: string | null
  sport: HomePanelSport
  score_unit?: 'frame' | 'leg'
  home_panels?: HomePanelId[]
  home_panels_stored?: HomePanelId[] | null
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  support_email: string | null
  noreply_email: string | null
  support_url: string | null
  welcome_enabled?: boolean
  welcome_blurb?: string | null
  welcome_image_url?: string | null
  welcome_background_color?: string
  welcome_text_color?: string
  welcome_revision?: number
  admins: AdminLeagueAdmin[]
}

export type BrandingSavePayload = {
  name: string
  slug: string
  short_name: string
  tagline: string | null
  primary_domain: string
  domain_aliases: string[]
  logo_url: string | null
  favicon_url: string | null
  og_image_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  text_color: string
  support_email: string | null
  noreply_email: string | null
  support_url: string | null
  sport: HomePanelSport
  home_panels: HomePanelId[]
  welcome_enabled: boolean
  welcome_blurb: string | null
  welcome_image_url: string | null
  welcome_background_color: string
  welcome_text_color: string
}

export function useAdminBranding() {
  const network = useNetwork()
  const networkRef = React.useRef(network)
  networkRef.current = network
  const {apiUrl} = useLeagueContext()
  const apiUrlRef = React.useRef(apiUrl)
  apiUrlRef.current = apiUrl

  const listLeagues = React.useCallback(async (): Promise<{
    data: AdminLeagueListItem[]
    host_league_id?: number
    is_superadmin: boolean
    error?: string
  }> => {
    const res = await networkRef.current.Get('/admin/leagues')
    if (res?.status === 'ok') {
      return {
        data: (res.data as AdminLeagueListItem[]) ?? [],
        host_league_id:
          res.host_league_id != null ? Number(res.host_league_id) : undefined,
        is_superadmin: Boolean(res.is_superadmin),
      }
    }
    return {data: [], is_superadmin: false, error: res?.error || 'failed'}
  }, [])

  const getLeague = React.useCallback(
    async (
      id: number,
    ): Promise<{data: AdminLeagueDetail | null; error?: string}> => {
      const res = await networkRef.current.Get(`/admin/leagues/${id}`)
      if (res?.status === 'ok' && res.data) {
        return {data: res.data as AdminLeagueDetail}
      }
      return {data: null, error: res?.error || 'failed'}
    },
    [],
  )

  const saveBranding = React.useCallback(
    async (
      id: number,
      payload: BrandingSavePayload,
    ): Promise<{status: string; data?: AdminLeagueDetail; error?: string}> => {
      const res = await networkRef.current.Patch(`/admin/leagues/${id}`, payload)
      if (res?.status === 'ok') {
        return {status: 'ok', data: res.data as AdminLeagueDetail | undefined}
      }
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const grantAdmin = React.useCallback(
    async (
      id: number,
      playerId: number,
    ): Promise<{status: string; admins?: AdminLeagueAdmin[]; error?: string}> => {
      const res = await networkRef.current.Post(`/admin/leagues/${id}`, {
        action: 'grant',
        player_id: playerId,
      })
      if (res?.status === 'ok') {
        return {
          status: 'ok',
          admins: (res.data?.admins as AdminLeagueAdmin[]) ?? [],
        }
      }
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const revokeAdmin = React.useCallback(
    async (
      id: number,
      playerId: number,
    ): Promise<{status: string; admins?: AdminLeagueAdmin[]; error?: string}> => {
      const res = await networkRef.current.Post(`/admin/leagues/${id}`, {
        action: 'revoke',
        player_id: playerId,
      })
      if (res?.status === 'ok') {
        return {
          status: 'ok',
          admins: (res.data?.admins as AdminLeagueAdmin[]) ?? [],
        }
      }
      return {status: 'error', error: res?.error || 'failed'}
    },
    [],
  )

  const uploadWelcomeImage = React.useCallback(
    async (
      leagueId: number,
      originalUri: string,
    ): Promise<{
      status: 'ok' | 'error'
      url?: string
      welcome_revision?: number
      error?: string
    }> => {
      try {
        const token = await AsyncStorage.getItem('jwt')
        const jpeg = await manipulateAsync(originalUri, [], {
          compress: 0.9,
          format: SaveFormat.JPEG,
        })
        const data = new FormData()
        data.append('image', new File(jpeg.uri))
        const apiDomain = apiUrlRef.current ?? config.apiUrl
        const res = await fetch(
          `${apiDomain}/admin/leagues/${leagueId}/welcome-image/upload`,
          {
            method: 'POST',
            body: data,
            headers: {
              ...leagueRequestHeaders(),
              Authorization: 'Bearer ' + token,
            },
          },
        )
        const json = await res.json()
        if (res.ok && json?.status === 'ok') {
          return {
            status: 'ok',
            url: json.url ?? json.data?.welcome_image_url,
            welcome_revision:
              json.data?.welcome_revision != null
                ? Number(json.data.welcome_revision)
                : undefined,
          }
        }
        return {status: 'error', error: json?.error ?? 'server_error'}
      } catch (e) {
        console.error(e)
        return {status: 'error', error: 'server_error'}
      }
    },
    [],
  )

  return {
    listLeagues,
    getLeague,
    saveBranding,
    grantAdmin,
    revokeAdmin,
    uploadWelcomeImage,
  }
}
