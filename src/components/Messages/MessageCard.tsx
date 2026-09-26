import { ThemedText as Text } from '@/components/ThemedText'
import { ThemedView as View } from '@/components/ThemedView'
import { useLeagueContext } from '@/context/LeagueContext'
import { useAccount } from '@/hooks/useAccount'
import { setAppBadgeCount } from '@/lib/notifications'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { router } from 'expo-router'
import {
  bangkokNowIso,
  formatMessageCardDate,
  formatMessageCardTime,
} from '@/lib/bangkokTime'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, TouchableOpacity } from 'react-native'
import { MessageCardProps } from './types'

export default function MessageCard({message, showAll}: MessageCardProps) {
  const messageDate = message.created_at
  const account = useAccount()
  const [isRead, setIsRead] = React.useState(message.read_at)
  const [isDeleted, setIsDeleted] = React.useState(false)
  const {t} = useTranslation()
  const {dispatch} = useLeagueContext()

  async function MarkMessageAsRead() {
    try {
      if (!isRead) {
        const res = await account.MarkMessageAsRead(message.id)
        if (res.status === 'ok') {
          setIsRead(formatMessageCardDate(bangkokNowIso()))
          const count = await account.GetUnreadMessageCount()
          dispatch({type: 'SET_MESSAGE_COUNT', payload: count})
          await setAppBadgeCount(count)
        }
      }
      router.push({
        pathname: `/messages/${message.from_player_id}` as any,
        params: {from: message.sender_nickname}
      })
    } catch (e) {
      console.log(e)
    }
  }

  async function handleDelete() {
    Alert.alert(t('delete_message'), t('confirm_delete_message'), [
      {
        text: t('cancel'),
        style: 'cancel',
      },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await account.DeleteMessage(message.id)
            if (res.status === 'ok') {
              setIsDeleted(true)
              const count = await account.GetUnreadMessageCount()
              dispatch({type: 'SET_MESSAGE_COUNT', payload: count})
              await setAppBadgeCount(count)
            }
          } catch (e) {
            console.log(e)
          }
        },
      },
    ])
  }

  if (isDeleted) {
    return null
  }

  if (!showAll && isRead) {
    return null
  }

  return (
    <TouchableOpacity
      onPress={() => {
        MarkMessageAsRead()
      }}
      className="py-2"
      activeOpacity={0.2}>
      <View className="rounded-xl mx-4 my-2" style={[styles.card]}>
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1 pr-4">
            <Text>{message.sender_nickname ? `From: ${message.sender_nickname}` : ''}</Text>
            <Text type="subtitle" style={styles.title}>
              {message.title || "No title"}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {!isRead && <View style={styles.unreadIndicator} />}
            {isRead && <MaterialIcons name="check" size={24} color="green" />}
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.deleteButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <MaterialIcons name="delete-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.content} numberOfLines={2}>
          {message.message}
        </Text>
        <Text style={styles.date}>
          {messageDate ? formatMessageCardDate(messageDate) : ''}
        </Text>
        <Text style={styles.time}>
          {messageDate ? formatMessageCardTime(messageDate) : ''}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  content: {
    fontSize: 15,
    opacity: 0.8,
    lineHeight: 20,
    marginBottom: 12,
  },
  date: {
    fontSize: 13,
    opacity: 0.5,
    textAlign: 'right',
  },
  time: {
    fontSize: 13,
    opacity: 0.5,
    textAlign: 'right',
  },
  deleteButton: {
    padding: 4,
  },
})
