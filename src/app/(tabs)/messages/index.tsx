/* eslint-disable react-hooks/exhaustive-deps */
import {AdaptiveSplit} from '@/components/layout/AdaptiveSplit'
import {EmptySplitDetail} from '@/components/layout/EmptySplitDetail'
import Messages from '@/components/Messages'
import {Thread} from '@/components/Messages/types'
import {useLeagueContext} from '@/context/LeagueContext'
import {useAccount} from '@/hooks/useAccount'
import {useIsRegularLayout} from '@/hooks/useLayoutMode'
import {setAppBadgeCount} from '@/lib/notifications'
import {useFocusEffect, useNavigation} from "expo-router/react-navigation"
import {router} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Alert} from 'react-native'
import MessagesThread from './[playerId]/index'

export default function MessagesScreen() {
  const account = useAccount()
  const {state, dispatch} = useLeagueContext()
  const [threads, setThreads] = React.useState<Thread[]>(
    state.messageThreads || [],
  )
  const [loading, setLoading] = React.useState(
    state.messageThreads.length === 0,
  )
  const {t} = useTranslation()
  const navigation = useNavigation()
  const isRegular = useIsRegularLayout()
  const accountRef = React.useRef(account)
  const dispatchRef = React.useRef(dispatch)
  const hasFetchedRef = React.useRef(false)
  const [footerBusy, setFooterBusy] = React.useState(false)
  const [selectedThread, setSelectedThread] = React.useState<{
    playerId: number
    from: string
  } | null>(null)

  // Keep refs updated
  React.useEffect(() => {
    accountRef.current = account
    dispatchRef.current = dispatch
  }, [account, dispatch])

  // Update local threads when context threads change
  React.useEffect(() => {
    if (state.messageThreads.length > 0) {
      setThreads(state.messageThreads)
      setLoading(false)
    }
  }, [state.messageThreads])

  React.useEffect(() => {
    navigation.setOptions({
      title: t('messages'),
    })
  }, [navigation, t])

  // Update badge whenever messageCount changes
  React.useEffect(() => {
    setAppBadgeCount(state.messageCount)
  }, [state.messageCount])

  // Initial fetch on mount if no cached data
  React.useEffect(() => {
    if (state.messageThreads.length === 0 && !hasFetchedRef.current) {
      const fetchInitialData = async () => {
        try {
          setLoading(true)
          const res = await account.GetMessageThreads()
          if (res.status === 'ok' && Array.isArray(res.data)) {
            setThreads(res.data)
            dispatch({type: 'SET_MESSAGE_THREADS', payload: res.data})
            hasFetchedRef.current = true
          }
        } catch (e) {
          console.error('fetchThreads', e)
        } finally {
          setLoading(false)
        }
      }
      fetchInitialData()
    }
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      // Refresh threads in background when screen comes into focus
      // but only if we already have cached data (to avoid flicker)
      if (state.messageThreads.length > 0) {
        const refreshData = async () => {
          try {
            const res = await accountRef.current.GetMessageThreads()
            if (res.status === 'ok' && Array.isArray(res.data)) {
              setThreads(res.data)
              dispatchRef.current({
                type: 'SET_MESSAGE_THREADS',
                payload: res.data,
              })
            }
          } catch (e) {
            console.error('refreshThreads', e)
          }
        }
        refreshData()
      }
    }, [state.messageThreads.length]),
  )

  const handleThreadPress = (thread: Thread) => {
    const threadId = thread.other_player_id
    const from =
      thread.participant_name ||
      thread.participant_nickname ||
      thread.from ||
      thread.sender_nickname ||
      ''

    if (!threadId) return

    if (isRegular) {
      setSelectedThread({playerId: threadId, from})
      return
    }

    router.push({
      pathname: `/messages/${threadId}` as any,
      params: {from},
    })
  }

  // Folding closed / compact: keep hierarchy via stack push.
  const selectedThreadRef = React.useRef(selectedThread)
  React.useEffect(() => {
    selectedThreadRef.current = selectedThread
  }, [selectedThread])
  React.useEffect(() => {
    if (isRegular) return
    const sel = selectedThreadRef.current
    if (sel == null) return
    setSelectedThread(null)
    router.push({
      pathname: `/messages/${sel.playerId}` as any,
      params: {from: sel.from},
    })
  }, [isRegular])

  const handleThreadDelete = (thread: Thread) => {
    const otherPlayerId = thread.other_player_id
    if (otherPlayerId == null) return
    const next = threads.filter(t => t.other_player_id !== otherPlayerId)
    // setThreads(next)
    account.DeleteThread(otherPlayerId)
    dispatch({type: 'SET_MESSAGE_THREADS', payload: next})
  }

  const handleThreadMarkAllRead = async (thread: Thread) => {
    const otherPlayerId = thread.other_player_id
    if (otherPlayerId == null) return
    try {
      const res = await account.GetMessageHistory(String(otherPlayerId))
      if (res.status === 'ok' && Array.isArray(res.data)) {
        const unread = res.data.filter(
          (msg: {read_at?: string | null}) => !msg.read_at,
        )
        for (const msg of unread) {
          await account.MarkMessageAsRead(msg.id)
        }
        const threadsRes = await account.GetMessageThreads()
        if (threadsRes.status === 'ok' && Array.isArray(threadsRes.data)) {
          setThreads(threadsRes.data)
          dispatch({type: 'SET_MESSAGE_THREADS', payload: threadsRes.data})
        }
        const count = await account.GetUnreadMessageCount()
        if (count != null) {
          dispatch({type: 'SET_MESSAGE_COUNT', payload: count})
        }
        await setAppBadgeCount(count ?? 0)
      }
    } catch (e) {
      console.error('handleThreadMarkAllRead', e)
    }
  }

  const updateBadgeFromCount = (count: number | null | undefined) => {
    setAppBadgeCount(count ?? 0)
  }

  const handleMarkAllThreadsRead = async () => {
    setFooterBusy(true)
    try {
      await account.MarkAllMessagesAsRead()
      const threadsRes = await account.GetMessageThreads()
      if (threadsRes.status === 'ok' && Array.isArray(threadsRes.data)) {
        setThreads(threadsRes.data)
        dispatch({type: 'SET_MESSAGE_THREADS', payload: threadsRes.data})
      }
      const count = await account.GetUnreadMessageCount()
      if (count != null) {
        dispatch({type: 'SET_MESSAGE_COUNT', payload: count})
      }
      updateBadgeFromCount(count)
    } catch (e) {
      console.error('handleMarkAllThreadsRead', e)
    } finally {
      setFooterBusy(false)
    }
  }

  const handleDeleteAllThreads = () => {
    if (threads.length === 0) return
    Alert.alert(t('delete_all_threads'), t('delete_all_threads_confirm'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          setFooterBusy(true)
          try {
            for (const thread of threads) {
              if (thread.other_player_id != null) {
                await account.DeleteThread(thread.other_player_id)
              }
            }
            setThreads([])
            dispatch({type: 'SET_MESSAGE_THREADS', payload: []})
            const count = await account.GetUnreadMessageCount()
            if (count != null) {
              dispatch({type: 'SET_MESSAGE_COUNT', payload: count})
            }
            updateBadgeFromCount(count ?? 0)
          } catch (e) {
            console.error('handleDeleteAllThreads', e)
          } finally {
            setFooterBusy(false)
          }
        },
      },
    ])
  }

  const list = (
    <Messages
      threads={threads}
      loading={loading}
      onThreadPress={handleThreadPress}
      onThreadDelete={handleThreadDelete}
      onThreadMarkAllRead={handleThreadMarkAllRead}
      onMarkAllThreadsRead={handleMarkAllThreadsRead}
      onDeleteAllThreads={handleDeleteAllThreads}
      footerBusy={footerBusy}
    />
  )

  return (
    <AdaptiveSplit
      list={list}
      detail={
        selectedThread ? (
          <MessagesThread
            key={selectedThread.playerId}
            embedPlayerId={selectedThread.playerId}
            embedFrom={selectedThread.from}
            embedded
          />
        ) : null
      }
      emptyDetail={
        <EmptySplitDetail message={t('select_a_conversation')} />
      }
    />
  )
}
