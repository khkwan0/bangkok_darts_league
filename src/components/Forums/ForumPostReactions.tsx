import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import type {
  ForumPostReactionState,
  ForumReactionIcon,
} from '@/types/forums'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {ActivityIndicator, Pressable, useColorScheme} from 'react-native'

type ForumPostReactionsProps = {
  icons: ForumReactionIcon[]
  reactions: ForumPostReactionState
  onReact: (iconId: number) => void
  submittingIconId?: number | null
  error?: string | null
}

export default function ForumPostReactions({
  icons,
  reactions,
  onReact,
  submittingIconId = null,
  error = null,
}: ForumPostReactionsProps) {
  const {t} = useTranslation()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const hasReacted = reactions.userIconId != null

  if (icons.length === 0) return null

  return (
    <View className="mt-3 items-end">
      {error ? (
        <Text className="mb-1 text-xs text-red-500">{error}</Text>
      ) : null}
      <View className="flex-row flex-wrap justify-end gap-1.5">
        {icons.map(icon => {
          const count = reactions.counts[icon.id] ?? 0
          const isSelected = reactions.userIconId === icon.id
          const disabled =
            hasReacted || (submittingIconId != null && !isSelected)

          return (
            <Pressable
              key={icon.id}
              onPress={() => onReact(icon.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{selected: isSelected, disabled}}
              accessibilityLabel={t('forums_reaction_aria', {
                name: icon.name,
                count,
              })}
              className="flex-row items-center rounded-full px-2.5 py-1"
              style={{
                borderWidth: 1,
                borderColor: isSelected
                  ? isDark
                    ? '#60a5fa'
                    : '#3b82f6'
                  : isDark
                    ? '#475569'
                    : '#e2e8f0',
                backgroundColor: isSelected
                  ? isDark
                    ? 'rgba(37, 99, 235, 0.35)'
                    : 'rgba(59, 130, 246, 0.12)'
                  : disabled
                    ? isDark
                      ? 'rgba(30, 41, 59, 0.6)'
                      : '#f8fafc'
                    : isDark
                      ? '#0f172a'
                      : '#ffffff',
                opacity: submittingIconId === icon.id ? 0.6 : 1,
              }}>
              {submittingIconId === icon.id ? (
                <ActivityIndicator
                  size="small"
                  style={{marginRight: 4, transform: [{scale: 0.75}]}}
                />
              ) : (
                <Text className="text-base">{icon.emoji}</Text>
              )}
              <Text
                className="ml-1 min-w-[12px] text-xs font-semibold tabular-nums"
                style={{
                  color: isSelected
                    ? isDark
                      ? '#bfdbfe'
                      : '#1d4ed8'
                    : isDark
                      ? '#cbd5e1'
                      : '#475569',
                }}>
                {count}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
