import {useNetwork} from '@/hooks/useNetwork'
import React from 'react'

export type ReleaseNoteKind = 'feature' | 'fix' | 'change'

export type ReleaseNoteSportScope = 'pool' | 'darts' | 'both'

export type ReleaseNoteClientScope = 'web' | 'mobile' | 'both'

/** Pool only, darts only, or both. `all` and notes with no sport tag count as both. */
export function releaseNoteSportScope(audiences: readonly string[]): ReleaseNoteSportScope {
  const tags = new Set(audiences)
  if (tags.has('all')) return 'both'
  const pool = tags.has('pool')
  const darts = tags.has('darts')
  if (pool && !darts) return 'pool'
  if (darts && !pool) return 'darts'
  return 'both'
}

/** App only, website only, or both. `all` and notes with no client tag count as both. */
export function releaseNoteClientScope(audiences: readonly string[]): ReleaseNoteClientScope {
  const tags = new Set(audiences)
  if (tags.has('all')) return 'both'
  const web = tags.has('web')
  const mobile = tags.has('mobile')
  if (web && !mobile) return 'web'
  if (mobile && !web) return 'mobile'
  return 'both'
}

export type ReleaseNote = {
  id: number
  title: string
  body: string
  kind: ReleaseNoteKind
  audiences: string[]
  hidden: boolean
  created_at: string
  updated_at: string
  preview?: string
}

type ListResponse = {
  status?: string
  error?: string
  data?: {items?: ReleaseNote[]; total?: number} | ReleaseNote
}

export function useReleaseNotes() {
  const network = useNetwork()
  const networkRef = React.useRef(network)
  networkRef.current = network

  const listPublic = React.useCallback(async (
    page = 1,
  ): Promise<{
    items: ReleaseNote[]
    total: number
    error?: string
  }> => {
    const res = (await networkRef.current.Get(
      `/release-notes?page=${page}&pageSize=50`,
    )) as ListResponse
    const data = res?.data
    if (res?.status === 'ok' && data && 'items' in data) {
      return {items: data.items ?? [], total: data.total ?? 0}
    }
    return {items: [], total: 0, error: res?.error ?? 'request_failed'}
  }, [])

  const getPublic = React.useCallback(async (id: number): Promise<ReleaseNote | null> => {
    const res = (await networkRef.current.Get(
      `/release-notes?id=${id}`,
    )) as ListResponse
    if (res?.status === 'ok' && res.data && !('items' in res.data)) {
      return res.data
    }
    return null
  }, [])

  const listAdmin = React.useCallback(async (): Promise<{
    items: ReleaseNote[]
    error?: string
  }> => {
    const res = (await networkRef.current.Get(
      '/admin/release-notes?page=1&pageSize=100',
    )) as ListResponse
    const data = res?.data
    if (res?.status === 'ok' && data && 'items' in data) {
      return {items: data.items ?? []}
    }
    return {items: [], error: res?.error ?? 'request_failed'}
  }, [])

  const saveAdmin = React.useCallback(
    async (note: {
      id?: number | null
      title: string
      body: string
      kind: ReleaseNoteKind
      audiences: string[]
      hidden: boolean
    }): Promise<{note?: ReleaseNote; error?: string}> => {
      const payload = {
        title: note.title,
        body: note.body,
        kind: note.kind,
        audiences: note.audiences,
        hidden: note.hidden,
      }
      const res = (
        note.id
          ? await networkRef.current.Patch('/admin/release-notes', {
              id: note.id,
              ...payload,
            })
          : await networkRef.current.Post('/admin/release-notes', payload)
      ) as ListResponse
      if (res?.status === 'ok' && res.data && !('items' in res.data)) {
        return {note: res.data}
      }
      return {error: res?.error ?? 'request_failed'}
    },
    [],
  )

  const setHidden = React.useCallback(async (id: number, hidden: boolean) => {
    const res = (await networkRef.current.Patch('/admin/release-notes', {
      id,
      hidden,
    })) as ListResponse
    return res?.status === 'ok'
  }, [])

  return {listPublic, getPublic, listAdmin, saveAdmin, setHidden}
}
