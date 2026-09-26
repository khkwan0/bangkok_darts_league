import { Message } from '@/components/Messages/types'
import TextInput from '@/components/TextInput'
import { ThemedText as Text } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import config, { domain } from '@/config'
import { useLeagueContext } from '@/context/LeagueContext'
import { useAccount } from '@/hooks/useAccount'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useLeague } from '@/hooks/useLeague'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useNavigation } from "expo-router/react-navigation"
import { useLocalSearchParams } from 'expo-router'
import {
  bangkokDayStart,
  formatMessageDateSeparator,
  formatMessageTimestamp,
  minutesBetweenIso,
} from '@/lib/bangkokTime'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Image, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { io } from 'socket.io-client'

function ResponseInput({
  keyboardHeight,
  onLayout,
  onSend,
  disabled,
}: {
  keyboardHeight: number
  onLayout: (height: number) => void
  onSend: (message: string) => void
  disabled: boolean
}) {
  const [replyMessage, setReplyMessage] = React.useState('')
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  // On Android with keyboard, add extra padding for spacing above keyboard
  // On iOS or when keyboard is hidden, use safe area insets
  const bottomPadding = Platform.OS === 'android' && keyboardHeight > 0
    ? 16
    : insets.bottom

  const handleSend = () => {
    if (replyMessage.trim() && !disabled) {
      onSend(replyMessage.trim())
      setReplyMessage('')
    }
  }

  const canSend = replyMessage.trim().length > 0 && !disabled

  return (
    <View
      onLayout={(e) => {
        const {height} = e.nativeEvent.layout
        onLayout(height)
      }}
      style={[
        styles.inputContainer,
        {
          backgroundColor: isDark ? '#000000' : '#EFEFF4',
          paddingBottom: bottomPadding,
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      ]}>
      <View style={styles.inputRow}>
        <TextInput
          placeholder="Type your message here"
          value={replyMessage}
          onChangeText={(text: string) => setReplyMessage(text)}
          containerStyle={styles.textInputContainer}
          style={styles.textInput}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          style={[
            styles.sendButton,
            {
              backgroundColor: canSend ? '#0B84FE' : (isDark ? '#2C2C2E' : '#E5E5EA'),
            },
          ]}>
          <Ionicons
            name="send"
            size={20}
            color={canSend ? '#FFFFFF' : (isDark ? '#8E8E93' : '#8E8E93')}
          />
        </TouchableOpacity>
      </View>
    </View>
  )
}

function DateSeparator({ date }: { date: string }) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const formattedDate = formatMessageDateSeparator(date)

  return (
    <View style={styles.dateSeparator}>
      <View style={[
        styles.dateSeparatorLine,
        { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }
      ]} />
      <Text style={[
        styles.dateSeparatorText,
        { color: isDark ? '#8E8E93' : '#8E8E93' }
      ]}>
        {formattedDate}
      </Text>
      <View style={[
        styles.dateSeparatorLine,
        { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }
      ]} />
    </View>
  )
}

function MessageLine({
  message,
  nextMessage,
}: {
  message: Message
  nextMessage?: Message
}) {
  const {state} = useLeagueContext()
  const userId = state.user.id
  const isUserMessage = message.from_player_id === userId
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const bubbleColor = isUserMessage
    ? '#0B84FE'
    : isDark ? '#2C2C2E' : '#E5E5EA'

  const messageStyle = [
    styles.messageContainer,
    isUserMessage ? styles.userBubble : styles.otherBubble,
    {backgroundColor: bubbleColor},
  ]

  const textStyle = isUserMessage
    ? styles.userMessageText
    : {color: isDark ? '#FFFFFF' : '#000000'}

  const timestampStyle = {
    fontSize: 11,
    color: isDark ? '#8E8E93' : '#8E8E93',
    marginTop: 4,
    paddingHorizontal: 4,
  }

  // Check if we should show the timestamp
  // Show if: no next message OR next message is more than 1 minute away
  const shouldShowTimestamp =
    !nextMessage ||
    minutesBetweenIso(message.created_at, nextMessage.created_at) >= 1

  const formattedTimestamp = shouldShowTimestamp
    ? formatMessageTimestamp(message.created_at)
    : null

  return (
    <View style={[styles.messageWrapper, isUserMessage ? styles.userMessageWrapper : styles.otherMessageWrapper]}>
      <View style={messageStyle}>
        <Text style={textStyle}>{message.message}</Text>
      </View>
      {formattedTimestamp && (
        <Text style={timestampStyle}>{formattedTimestamp}</Text>
      )}
    </View>
  )
}

export default function MessagesThread() {
  
  const { threadId, from } = useLocalSearchParams()
  const { t } = useTranslation()
  const navigation = useNavigation()
  const [messages, setMessages] = useState<Message[]>([])
  const [roomName, setRoomName] = useState<string | null>(null)
  const account = useAccount()
  const league = useLeague()

  useEffect(() => {
    navigation.setOptions({
      title: from ? `${from}` : t('messages'),
    })
  }, [navigation, t])


  const {state} = useLeagueContext()
  const userId = state.user.id
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const backgroundColor = isDark ? '#000000' : '#EFEFF4'
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [inputContainerHeight, setInputContainerHeight] = useState(0)
  const [sending, setSending] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const fetchMessages = async (preserveOptimistic?: Message) => {
    const res = await account.GetMessageHistory(threadId)
    if (res.status === 'ok') {
      if (preserveOptimistic) {
        // Check if the optimistic message is already in the server response
        const optimisticInResponse = res.data.some(
          (msg: Message) =>
            msg.message === preserveOptimistic.message &&
            msg.from_player_id === preserveOptimistic.from_player_id &&
            Math.abs(
              DateTime.fromISO(msg.created_at).diff(
                DateTime.fromISO(preserveOptimistic.created_at),
                'seconds',
              ).seconds,
            ) < 5, // Within 5 seconds
        )
        
        if (!optimisticInResponse) {
          // Keep the optimistic message if it's not in the server response yet
          setMessages([...res.data, preserveOptimistic])
          return
        }
      }
      setMessages(res.data)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [threadId])

  useEffect(() => {
    if (messages.length > 0) {
      const fromId = messages[0].from_player_id
      const toId = messages[0].to_player_id
      const roomName = fromId < toId ? `pm:${fromId}:${toId}` : `pm:${toId}:${fromId}`
      setRoomName(roomName)
    }
  }, [messages])

  const socketRef = useRef<ReturnType<typeof io> | null>(null)

  useEffect(() => {
    if (!roomName) return

    // Create socket if it doesn't exist
    if (!socketRef.current) {
      socketRef.current = io('https://' + domain, {autoConnect: false})
    }

    const socket = socketRef.current

    const handleConnect = () => {
      // console.log('Socket connected, joining room:', roomName)
      JoinRoom()
    }

    const handleDisconnect = () => {
      // console.log('Socket disconnected')
    }

    function JoinRoom() {
      if (socket && socket.connected && roomName) {
        socket.emit('join', roomName, (joinStatus: {status: string}) => {
          if (joinStatus.status === 'ok') {
            // console.log('Joined room:', roomName)
          }
        })
      }
    }

    const handleMessage = (data: any) => {
      // console.log('Received message event:', data)
      
      // Convert socket data to Message format
      const newMessage: Message = {
        id: data.id || data.message_id || Date.now(),
        title: data.title || '',
        message: data.message || data.text || '',
        created_at: data.created_at || data.timestamp || new Date().toISOString(),
        read_at: data.read_at || '',
        sender_nickname: data.sender_nickname || data.nickname || data.sender?.nickname || '',
        from_player_id: data.from_player_id || data.from_id || data.sender?.id || 0,
        to_player_id: data.to_player_id || data.to_id || data.recipient?.id || 0,
        root_id: data.root_id || data.rootId || 0,
        reply_to: data.reply_to || data.replyTo || 0,
      }

      // Check if message already exists (avoid duplicates from optimistic updates)
      setMessages((prev) => {
        const messageExists = prev.some(
          (msg) =>
            msg.id === newMessage.id ||
            (msg.message === newMessage.message &&
              msg.from_player_id === newMessage.from_player_id &&
              Math.abs(
                DateTime.fromISO(msg.created_at).diff(
                  DateTime.fromISO(newMessage.created_at),
                  'seconds',
                ).seconds,
              ) < 5), // Within 5 seconds
        )

        if (messageExists) {
          // Replace optimistic message with real one if it exists
          return prev.map((msg) =>
            msg.id < 0 && // Optimistic message
            msg.message === newMessage.message &&
            msg.from_player_id === newMessage.from_player_id &&
            Math.abs(
              DateTime.fromISO(msg.created_at).diff(
                DateTime.fromISO(newMessage.created_at),
                'seconds',
              ).seconds,
            ) < 5
              ? newMessage
              : msg,
          )
        }

        // Add new message at the beginning (list is inverted)
        return [newMessage, ...prev]
      })
    }

    // Set up event listeners
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('message', handleMessage)

    // Connect to socket
    if (!socket.connected) {
      socket.connect()
    } else {
      // If already connected, join room immediately
      JoinRoom()
    }

    // Cleanup on unmount or roomName change
    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('message', handleMessage)
    }
  }, [roomName])

  // Cleanup socket on component unmount
  useEffect(() => {
    return () => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || sending || !userId) return

    // Determine recipient ID from messages
    const recipientId = messages.length > 0
      ? messages[0].from_player_id === userId
        ? messages[0].to_player_id
        : messages[0].from_player_id
      : null

    if (!recipientId) return

    // Get root_id from existing messages
    let rootId = 0
    if (messages.length > 0) {
      rootId = messages[0].root_id || messages[0].id
    } else {
      const threadIdNum = Array.isArray(threadId) 
        ? parseInt(threadId[0] || '0', 10)
        : typeof threadId === 'string'
        ? parseInt(threadId, 10)
        : threadId || 0
      rootId = isNaN(threadIdNum) ? 0 : threadIdNum
    }

    try {
      setSending(true)
      const res = await account.SendMessage(
        userId,
        recipientId,
        '', // No title for replies
        messageText.trim(),
        rootId as any,
      )

      Keyboard.dismiss()

      if (res.status === 'ok') {
        const optimisticMessage: Message = {
          id: -Date.now(), // Temporary negative ID
          title: '',
          message: messageText.trim(),
          created_at: new Date().toISOString(),
          read_at: '',
          sender_nickname: state.user.nickname || '',
          from_player_id: userId,
          to_player_id: recipientId,
          root_id: rootId,
          reply_to: 0,
        }
        setMessages((prev) => {
          const updated = [optimisticMessage, ...prev]
          
          // Scroll to bottom after adding message (for inverted list, index 0 is the newest)
          setTimeout(() => {
            if (flatListRef.current) {
              try {
                flatListRef.current.scrollToIndex({index: 0, animated: true})
              } catch (error) {
                // Fallback if scrollToIndex fails
                flatListRef.current.scrollToEnd({animated: true})
              }
            }
          }, 150)
          
          return updated
        })

        // Emit 'message' event to the socket room with the same body sent to backend
        if (socketRef.current && socketRef.current.connected && roomName) {
          const messageBody = {
            room: roomName,
            to_player_id: recipientId,
            from_player_id: userId,
            senderId: userId,
            recipientId: recipientId,
            title: '', // No title for replies
            message: messageText.trim(),
            root_id: rootId,
          }
          socketRef.current.emit('message', messageBody)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (Platform.OS === 'android') {
      const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
        // Calculate total padding needed: keyboard height + (input container height / 2)
        setKeyboardHeight(e.endCoordinates.height + inputContainerHeight / 2)
      })
      const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0)
      })

      return () => {
        showSubscription.remove()
        hideSubscription.remove()
      }
    }
  }, [inputContainerHeight])

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // For inverted FlatList, scroll to index 0 to show the newest message (bottom)
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({index: 0, animated: true})
      }, 100)
    }
  }, [messages])

  // Get sender name and ID from messages or from param
  const { senderName, senderId } = (() => {
    if (from) {
      // If we have the name from params, try to find the sender ID from messages
      if (messages.length > 0) {
        const firstMessage = messages[0]
        const senderId = firstMessage.from_player_id === userId
          ? firstMessage.to_player_id
          : firstMessage.from_player_id
        return { senderName: from, senderId }
      }
      return { senderName: from, senderId: null }
    }
    if (messages.length > 0) {
      const firstMessage = messages[0]
      if (firstMessage.from_player_id === userId) {
        // Find the other participant
        const otherMessage = messages.find(msg => msg.from_player_id !== userId)
        return {
          senderName: otherMessage?.sender_nickname || '',
          senderId: otherMessage?.from_player_id || firstMessage.to_player_id,
        }
      }
      return {
        senderName: firstMessage.sender_nickname || '',
        senderId: firstMessage.from_player_id,
      }
    }
    return { senderName: '', senderId: null }
  })()

  // Get sender profile picture
  const [senderProfilePicture, setSenderProfilePicture] = useState<string | null>(null)

  useEffect(() => {
    if (!senderId) return

    // Check if sender is the current user
    if (senderId === userId && state.user.profile_picture) {
      setSenderProfilePicture(state.user.profile_picture)
      return
    }

    // Fetch sender's profile picture from API
    const fetchSenderProfile = async () => {
      try {
        const playerInfo = await league.GetPlayerStatsInfo(senderId)
        if (playerInfo && (playerInfo.profile_picture || playerInfo.pic)) {
          setSenderProfilePicture(playerInfo.profile_picture || playerInfo.pic)
        } else {
          setSenderProfilePicture(null)
        }
      } catch (error) {
        console.error('Error fetching sender profile picture:', error)
        setSenderProfilePicture(null)
      }
    }

    fetchSenderProfile()
  }, [senderId, userId, state.user.profile_picture, league])

  const ListHeaderComponent = () => {
    if (!senderName) return null

    // Construct avatar URL
    const avatarUrl = senderProfilePicture
      ? config.profileUrl + senderProfilePicture
      : null

    return (
      <View style={[
        styles.stickyHeader,
        {
          backgroundColor: isDark ? '#000000' : '#EFEFF4',
          borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }
      ]}>
        <View style={styles.headerContent}>
          {avatarUrl && (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
            />
          )}
          {!avatarUrl && (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
              <Text style={[styles.avatarText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                {typeof senderName === 'string' && senderName.length > 0 ? senderName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <Text style={[
            styles.headerText,
            { color: isDark ? '#FFFFFF' : '#000000' }
          ]}>
            {senderName}
          </Text>
        </View>
      </View>
    )
  }

  const content = (
    <View style={[styles.contentContainer, Platform.OS === 'android' && keyboardHeight > 0 && {paddingBottom: keyboardHeight}]}>
      <ListHeaderComponent />
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({item, index}) => {
          const isOldestMessage = index === messages.length - 1 // Last in array = oldest (first chronologically)
          
          return (
            <View key={item.id}>
              {/* Show date only before the very first message (oldest, first chronologically) */}
              {isOldestMessage && (
                <DateSeparator date={item.created_at} />
              )}
              <MessageLine
                message={item}
                nextMessage={messages[index + 1]}
              />
            </View>
          )
        }}
        inverted={true}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 100,
        }}
        onScrollToIndexFailed={(info) => {
          // Fallback to scrollToEnd if scrollToIndex fails
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({animated: true})
          }, 100)
        }}
        style={[styles.list, {backgroundColor}]}
        contentContainerStyle={[
          styles.listContent,
          {backgroundColor},
          messages.length === 0 && styles.emptyListContent,
        ]}
        keyboardShouldPersistTaps="handled"
      />
      <ResponseInput
        keyboardHeight={keyboardHeight}
        onLayout={setInputContainerHeight}
        onSend={handleSendMessage}
        disabled={sending}
      />
    </View>
  )

  return (
    <ThemedView
      lightColor="#EFEFF4"
      darkColor="#000000"
      style={styles.container}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior="padding"
          keyboardVerticalOffset={90}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.keyboardAvoidingView}>
          {content}
        </View>
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  inputContainer: {
    paddingHorizontal: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInputContainer: {
    marginBottom: 0,
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageWrapper: {
    marginVertical: 4,
    marginHorizontal: 24,
    maxWidth: '80%',
  },
  userMessageWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageContainer: {
    padding: 12,
  },
  userBubble: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 0,
  },
  otherBubble: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 18,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  stickyHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 24,
  },
  dateSeparatorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 12,
  },
})