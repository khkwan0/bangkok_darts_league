import config from '@/config'
import {File} from 'expo-file-system'
import {manipulateAsync, SaveFormat} from 'expo-image-manipulator'
import {useNetwork} from '@/hooks/useNetwork'
import {useLeagueContext} from '@/context/LeagueContext'
import i18n from '@/i18n'
import {
  markAnnouncementReadLocal,
  syncAnnouncementReadsWithBackend,
  type AnnouncementReadSyncItem,
} from '@/lib/announcementReads'
import type {
  Announcement,
  AnnouncementImageUploadResult,
  AdminAnnouncementListItem,
  PaginatedAdminAnnouncements,
  PaginatedAnnouncements,
} from '@/types/announcements'
import AsyncStorage from '@react-native-async-storage/async-storage'
import React from 'react'

/** Locale the announcements API understands (`en` | `th`). */
function announcementLocaleParam(): string {
  const lang = (i18n.language || 'en').trim().toLowerCase()
  if (lang === 'th' || lang.startsWith('th-')) {
    return 'th'
  }
  return 'en'
}

function withAnnouncementLocale(path: string): string {
  const locale = announcementLocaleParam()
  return path.includes('?')
    ? `${path}&locale=${encodeURIComponent(locale)}`
    : `${path}?locale=${encodeURIComponent(locale)}`
}

export function useAnnouncements() {
  const network = useNetwork()
  const {apiUrl} = useLeagueContext()
  const networkRef = React.useRef(network)
  const apiUrlRef = React.useRef(apiUrl)

  networkRef.current = network
  apiUrlRef.current = apiUrl

  const getAnnouncements = React.useCallback(
    async (
      page = 1,
      pageSize = 20,
    ): Promise<PaginatedAnnouncements & {error?: string}> => {
      const res = await networkRef.current.Get(
        withAnnouncementLocale(
          `/announcements?page=${page}&pageSize=${pageSize}`,
        ),
      )
      if (res?.status === 'ok' && res.data) {
        return res.data as PaginatedAnnouncements
      }
      return {items: [], total: 0, error: res?.error ?? 'request_failed'}
    },
    [],
  )

  const getAnnouncement = React.useCallback(
    async (id: number): Promise<Announcement | null> => {
      const res = await networkRef.current.Get(
        withAnnouncementLocale(`/announcements?id=${id}`),
      )
      if (res?.status === 'ok' && res.data) {
        return res.data as Announcement
      }
      return null
    },
    [],
  )

  const getUnread = React.useCallback(async (): Promise<Announcement | null> => {
    const res = await networkRef.current.Get(
      withAnnouncementLocale('/announcements/unread'),
    )
    if (res?.status === 'ok') {
      return (res.data as Announcement | null) ?? null
    }
    return null
  }, [])

  const hasUnread = React.useCallback(async (): Promise<boolean> => {
    const res = await networkRef.current.Get(
      withAnnouncementLocale('/announcements/unread?countOnly=1'),
    )
    if (res?.status === 'ok' && res.data) {
      return Boolean(res.data.hasUnread)
    }
    return false
  }, [])

  const markRead = React.useCallback(
    async (
      announcementId: number,
      readAt?: string,
    ): Promise<boolean> => {
      const seenAt = readAt ?? new Date().toISOString()
      await markAnnouncementReadLocal(announcementId, seenAt)
      const res = await networkRef.current.Post('/announcements', {
        announcementId,
        readAt: seenAt,
      })
      return res?.status === 'ok'
    },
    [],
  )

  const getReads = React.useCallback(async (): Promise<AnnouncementReadSyncItem[]> => {
    const res = await networkRef.current.Get('/announcements/reads')
    if (res?.status === 'ok' && Array.isArray(res.data)) {
      return res.data as AnnouncementReadSyncItem[]
    }
    return []
  }, [])

  const syncReads = React.useCallback(async () => {
    await syncAnnouncementReadsWithBackend(
      getReads,
      async reads => {
        await networkRef.current.Post('/announcements/reads', {reads})
      },
    )
  }, [getReads])

  const adminGetAnnouncements = React.useCallback(
    async (page = 1, pageSize = 20): Promise<PaginatedAdminAnnouncements> => {
      const res = await networkRef.current.Get(
        `/admin/announcements?page=${page}&pageSize=${pageSize}`,
      )
      if (res?.items && Array.isArray(res.items)) {
        return {
          items: res.items as AdminAnnouncementListItem[],
          total: Number(res.total) || 0,
        }
      }
      return {items: [], total: 0}
    },
    [],
  )

  const adminGetAnnouncement = React.useCallback(
    async (id: number): Promise<Announcement | null> => {
      const res = await networkRef.current.Get(`/admin/announcements?id=${id}`)
      if (res?.id) {
        return res as Announcement
      }
      return null
    },
    [],
  )

  const adminCreate = React.useCallback(
    async (payload: {
      title: string
      content: string
    }): Promise<{status: 'ok'; id: number} | {status: 'error'; error: string}> => {
      const res = await networkRef.current.Post('/admin/announcements', payload)
      if (res?.status === 'ok' && res.id) {
        return {status: 'ok', id: Number(res.id)}
      }
      return {status: 'error', error: res?.error ?? 'server_error'}
    },
    [],
  )

  const adminUpdate = React.useCallback(
    async (payload: {
      id: number
      title: string
      content: string
    }): Promise<{status: 'ok'} | {status: 'error'; error: string}> => {
      const res = await networkRef.current.Put('/admin/announcements', payload)
      if (res?.status === 'ok') {
        return {status: 'ok'}
      }
      return {status: 'error', error: res?.error ?? 'server_error'}
    },
    [],
  )

  const adminDelete = React.useCallback(
    async (
      id: number,
    ): Promise<{status: 'ok'} | {status: 'error'; error: string}> => {
      const res = await networkRef.current.Delete(`/admin/announcements?id=${id}`)
      if (res?.status === 'ok') {
        return {status: 'ok'}
      }
      return {status: 'error', error: res?.error ?? 'server_error'}
    },
    [],
  )

  const adminRestore = React.useCallback(
    async (
      id: number,
    ): Promise<{status: 'ok'} | {status: 'error'; error: string}> => {
      const res = await networkRef.current.Patch(`/admin/announcements?id=${id}`, {})
      if (res?.status === 'ok') {
        return {status: 'ok'}
      }
      return {status: 'error', error: res?.error ?? 'server_error'}
    },
    [],
  )

  const adminUploadImage = React.useCallback(
    async (originalUri: string): Promise<AnnouncementImageUploadResult> => {
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
          `${apiDomain}/admin/announcements/gallery/upload`,
          {
            method: 'POST',
            body: data,
            headers: {
              Authorization: 'Bearer ' + token,
            },
          },
        )
        const json = await res.json()
        if (json?.status === 'ok' && json.url) {
          return {status: 'ok', url: json.url, id: json.id}
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
    getAnnouncements,
    getAnnouncement,
    getUnread,
    hasUnread,
    markRead,
    getReads,
    syncReads,
    adminGetAnnouncements,
    adminGetAnnouncement,
    adminCreate,
    adminUpdate,
    adminDelete,
    adminRestore,
    adminUploadImage,
  }
}
