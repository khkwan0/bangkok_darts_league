import config from '@/config'
import {leagueRequestHeaders} from '@/lib/leagueRequest'
import {useNetwork} from '@/hooks/useNetwork'
import {useLeagueContext} from '@/context/LeagueContext'
import {File} from 'expo-file-system'
import {manipulateAsync, SaveFormat} from 'expo-image-manipulator'
import type {
  MemberSupportTicketDetail,
  MemberSupportTicketListItem,
  SupportImageAttachment,
  SupportTicketStatus,
} from '@/types/supportTickets'
import AsyncStorage from '@react-native-async-storage/async-storage'
import React from 'react'

type ListResult = {
  items: MemberSupportTicketListItem[]
  total: number
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

export function useSupportTickets() {
  const network = useNetwork()
  const {apiUrl} = useLeagueContext()
  const networkRef = React.useRef(network)
  const apiUrlRef = React.useRef(apiUrl)

  networkRef.current = network
  apiUrlRef.current = apiUrl

  const listTickets = React.useCallback(
    async (page = 1, pageSize = 20): Promise<ListResult> => {
      const res = await networkRef.current.Get(
        `/support/tickets?page=${page}&pageSize=${pageSize}`,
      )
      if (res?.status === 'ok') {
        return {
          items: (res.items as MemberSupportTicketListItem[]) ?? [],
          total: Number(res.total) || 0,
        }
      }
      return {
        items: [],
        total: 0,
        error: res?.error ?? 'request_failed',
      }
    },
    [],
  )

  const getTicket = React.useCallback(
    async (id: number): Promise<MemberSupportTicketDetail | null> => {
      const res = await networkRef.current.Get(`/support/tickets/${id}`)
      if (res?.status === 'ok' && res.ticket) {
        return res.ticket as MemberSupportTicketDetail
      }
      return null
    },
    [],
  )

  const getUnreadCount = React.useCallback(async (): Promise<number> => {
    const res = await networkRef.current.Get('/support/tickets/unread/count')
    if (res?.status === 'ok') {
      return Number(res.count) || 0
    }
    return 0
  }, [])

  const createTicket = React.useCallback(
    async (params: {
      title?: string
      message: string
      attachments?: SupportImageAttachment[]
    }): Promise<{ticketId?: number; error?: string}> => {
      try {
        const token = await AsyncStorage.getItem('jwt')
        const apiDomain = await resolveApiDomain(apiUrlRef.current)
        const formData = new FormData()
        const title = params.title?.trim()
        if (title) {
          formData.append('title', title)
        }
        formData.append('message', params.message.trim())
        for (const attachment of params.attachments ?? []) {
          await appendImageAttachment(formData, attachment)
        }
        const res = await fetch(`${apiDomain}/support`, {
          method: 'POST',
          body: formData,
          headers: {
            ...leagueRequestHeaders(),
            Authorization: 'Bearer ' + token,
          },
        })
        const json = await res.json().catch(() => ({}))
        if (json?.status === 'ok' && json.ticketId) {
          return {ticketId: Number(json.ticketId)}
        }
        return {error: json?.error ?? 'request_failed'}
      } catch (e) {
        console.error(e)
        return {error: 'request_failed'}
      }
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
    ): Promise<{ticket?: MemberSupportTicketDetail; error?: string}> => {
      try {
        const token = await AsyncStorage.getItem('jwt')
        const apiDomain = await resolveApiDomain(apiUrlRef.current)
        const formData = new FormData()
        formData.append('message', params.message.trim())
        for (const attachment of params.attachments ?? []) {
          await appendImageAttachment(formData, attachment)
        }
        const res = await fetch(`${apiDomain}/support/tickets/${id}/replies`, {
          method: 'POST',
          body: formData,
          headers: {
            ...leagueRequestHeaders(),
            Authorization: 'Bearer ' + token,
          },
        })
        const json = await res.json().catch(() => ({}))
        if (json?.status === 'ok' && json.ticket) {
          return {ticket: json.ticket as MemberSupportTicketDetail}
        }
        return {error: json?.error ?? 'request_failed'}
      } catch (e) {
        console.error(e)
        return {error: 'request_failed'}
      }
    },
    [],
  )

  const updateTicketStatus = React.useCallback(
    async (
      id: number,
      status: Extract<SupportTicketStatus, 'open' | 'closed'>,
    ): Promise<{ticket?: MemberSupportTicketDetail; error?: string}> => {
      const res = await networkRef.current.Patch(`/support/tickets/${id}`, {
        status,
      })
      if (res?.status === 'ok' && res.ticket) {
        return {ticket: res.ticket as MemberSupportTicketDetail}
      }
      return {error: res?.error ?? 'request_failed'}
    },
    [],
  )

  return {
    listTickets,
    getTicket,
    getUnreadCount,
    createTicket,
    replyToTicket,
    updateTicketStatus,
  }
}
