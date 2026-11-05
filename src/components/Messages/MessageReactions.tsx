import {ThemedText as Text} from '@/components/ThemedText'
import {useColorScheme} from '@/hooks/useColorScheme'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {ActivityIndicator, Pressable, View} from 'react-native'

export const STANDARD_MESSAGE_EMOJIS = [
  '👍',
  '❤️',
  '😂',
  '😮',
  '😢',
  '🙏',
] as const

export type MessageReactionSummary = {
  emoji: string
  count: number
  mine: boolean
}

export default function MessageReactions({
  messageId,
  reactions,
  alignEnd,
  onReact,
}: {
  messageId: number
  reactions: MessageReactionSummary[]
  alignEnd: boolean
  onReact: (
    messageId: number,
    emoji: string,
  ) => Promise<MessageReactionSummary[] | null>
}) {
  const {t} = useTranslation()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function react(emoji: string) {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const next = await onReact(messageId, emoji)
      if (!next) {
        setError(t('message_reaction_failed'))
        return
      }
      setOpen(false)
    } catch {
      setError(t('message_reaction_failed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <View
      style={{
        marginTop: 4,
        alignItems: alignEnd ? 'flex-end' : 'flex-start',
        gap: 4,
      }}>
      {open ? (
        <View
          style={{
            flexDirection: 'row',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: isDark ? '#475569' : '#e2e8f0',
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            paddingHorizontal: 4,
            paddingVertical: 2,
          }}>
          {STANDARD_MESSAGE_EMOJIS.map(emoji => (
            <Pressable
              key={emoji}
              disabled={pending}
              onPress={() => void react(emoji)}
              accessibilityRole="button"
              accessibilityLabel={t('message_react_with', {emoji})}
              style={{paddingHorizontal: 6, paddingVertical: 4}}>
              <Text style={{fontSize: 18}}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 4}}>
        {reactions.map(reaction => (
          <Pressable
            key={reaction.emoji}
            disabled={pending}
            onPress={() => void react(reaction.emoji)}
            accessibilityRole="button"
            accessibilityState={{selected: reaction.mine}}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 999,
              borderWidth: 1,
              borderColor: reaction.mine
                ? isDark
                  ? '#60a5fa'
                  : '#3b82f6'
                : isDark
                  ? '#475569'
                  : '#e2e8f0',
              backgroundColor: reaction.mine
                ? isDark
                  ? 'rgba(37, 99, 235, 0.35)'
                  : 'rgba(59, 130, 246, 0.12)'
                : isDark
                  ? '#0f172a'
                  : '#ffffff',
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}>
            <Text style={{fontSize: 14}}>{reaction.emoji}</Text>
            <Text
              style={{
                marginLeft: 4,
                fontSize: 12,
                fontWeight: '600',
                color: reaction.mine
                  ? isDark
                    ? '#bfdbfe'
                    : '#1d4ed8'
                  : isDark
                    ? '#cbd5e1'
                    : '#475569',
              }}>
              {reaction.count}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setOpen(value => !value)}
          accessibilityRole="button"
          accessibilityLabel={t('message_react')}
          accessibilityState={{expanded: open}}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: isDark ? '#475569' : '#e2e8f0',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
          }}>
          {pending ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text style={{fontSize: 14, color: isDark ? '#cbd5e1' : '#64748b'}}>
              ☺
            </Text>
          )}
        </Pressable>
      </View>
      {error ? (
        <Text className="text-xs text-red-500">{error}</Text>
      ) : null}
    </View>
  )
}
