import config from '@/config'
import {leagueRequestHeaders} from '@/lib/leagueRequest'
import {useNetwork} from '@/hooks/useNetwork'
import {useLeagueContext} from '@/context/LeagueContext'
import {File} from 'expo-file-system'
import {manipulateAsync, SaveFormat} from 'expo-image-manipulator'
import type {
  AdminSupportTicketDetail,
  AdminSupportTicketListItem,
  SupportImageAttachment,
  SupportTicketStatus,
} from '@/types/supportTickets'
import AsyncStorage from '@react-native-async-storage/async-storage'
import React from 'react'

type ListResult = {
  items: AdminSupportTicketListItem[]
  total: number
  page: number
  pageSize: number
  error?: string
}

async function resolveApiDomain(contextApiUrl?: string | null) {
  try {
    const saved = await AsyncStorage.getItem('api_url')
    if (saved?.trim()) {
      return saved.replace(/\/$/, '')
    }
  } catch {
    // ignore
  }
  return (contextApiUrl ?? config.apiUrl ?? '').replace(/\/$/, '')
}

async function appendImageAttachment(
  formData: FormData,
  attachment: SupportImageAttachment,
) {
  const jpeg = await manipulateAsync(attachment.uri, [], {
    compress: 0.9,
    format: SaveFormat.JPEG,
  })
  formData.append('attachments', new File(jpeg.uri) as unknown as Blob)
}

export function useAdminSupportTickets() {
  const network = useNetwork()
  const {apiUrl} = useLeagueContext()
  const networkRef = React.useRef(network)
  const apiUrlRef = React.useRef(apiUrl)

  networkRef.current = network
  apiUrlRef.current = apiUrl

  const listTickets = React.useCallback(
    async (options?: {
      status?: SupportTicketStatus | 'all' | 'deleted'
      page?: number
      pageSize?: number
    }): Promise<ListResult> => {
      const page = options?.page ?? 1
      const pageSize = options?.pageSize ?? 20
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (options?.status === 'deleted') {
        params.set('deleted', 'only')
      } else {
        params.set('deleted', 'exclude')
        if (options?.status && options.status !== 'all') {
          params.set('status', options.status)
        }
      }
      const res = await networkRef.current.Get(
        `/admin/support-tickets?${params.toString()}`,
      )
      if (res?.status === 'ok') {
        return {
          items: (res.items as AdminSupportTicketListItem[]) ?? [],
          total: Number(res.total) || 0,
          page: Number(res.page) || page,
          pageSize: Number(res.pageSize) || pageSize,
        }
      }
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        error: res?.error ?? 'request_failed',
      }
    },
    [],
  )

  const getTicket = React.useCallback(
    async (id: number): Promise<AdminSupportTicketDetail | null> => {
      const res = await networkRef.current.Get(`/admin/support-tickets/${id}`)
      if (res?.status === 'ok' && res.ticket) {
        return res.ticket as AdminSupportTicketDetail
      }
      return null
    },
    [],
  )

  const getUnreadCount = React.useCallback(async (): Promise<number> => {
    const res = await networkRef.current.Get(
      '/admin/support-tickets/unread/count',
    )
    if (res?.status === 'ok') {
      return Number(res.count) || 0
    }
    return 0
  }, [])

  const updateTicket = React.useCallback(
    async (
      id: number,
      updates: {
        status?: SupportTicketStatus
        admin_notes?: string | null
      },
    ): Promise<{ticket?: AdminSupportTicketDetail; error?: string}> => {
      const res = await networkRef.current.Patch(
        `/admin/support-tickets/${id}`,
        updates,
      )
      if (res?.status === 'ok' && res.ticket) {
        return {ticket: res.ticket as AdminSupportTicketDetail}
      }
      return {error: res?.error ?? 'request_failed'}
    },
    [],
  )

  const deleteTicket = React.useCallback(
    async (id: number): Promise<{ok: boolean; error?: string}> => {
      const res = await networkRef.current.Delete(
        `/admin/support-tickets/${id}`,
      )
      if (res?.status === 'ok') {
        return {ok: true}
      }
      return {ok: false, error: res?.error ?? 'request_failed'}
    },
    [],
  )

  const replyToTicket = React.useCallback(
    async (
      id: number,
      params: {
        message: string
        attachments?: SupportImageAttachment[]
      },
    ): Promise<{ticket?: AdminSupportTicketDetail; error?: string}> => {
      try {
        const token = await AsyncStorage.getItem('jwt')
        const apiDomain = await resolveApiDomain(apiUrlRef.current)
        const formData = new FormData()
        formData.append('message', params.message.trim())
        for (const attachment of params.attachments ?? []) {
          await appendImageAttachment(formData, attachment)
        }
        const res = await fetch(
          `${apiDomain}/admin/support-tickets/${id}/replies`,
          {
            method: 'POST',
            body: formData,
            headers: {
              ...leagueRequestHeaders(),
              Authorization: 'Bearer ' + token,
            },
          },
        )
        const json = await res.json().catch(() => ({}))
        if (json?.status === 'ok' && json.ticket) {
          return {ticket: json.ticket as AdminSupportTicketDetail}
        }
        return {error: json?.error ?? 'request_failed'}
      } catch (e) {
        console.error(e)
        return {error: 'request_failed'}
      }
    },
    [],
  )

  return {
    listTickets,
    getTicket,
    getUnreadCount,
    updateTicket,
    deleteTicket,
    replyToTicket,
  }
}
