import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import type {ForumPoll} from '@/types/forums'
import {useTheme} from "expo-router/react-navigation"
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useColorScheme, StyleSheet} from 'react-native'

type ForumPollResultsProps = {
  poll: ForumPoll
}

export default function ForumPollResults({poll}: ForumPollResultsProps) {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const trackColor = isDark ? '#334155' : '#e2e8f0'
  const barDefault = isDark ? '#64748b' : '#94a3b8'
  const barSelected = isDark ? '#2563eb' : '#2563eb'

  return (
    <View
      className="mt-3 rounded-xl p-4"
      style={{
        backgroundColor: colors.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.35)',
      }}>
      <Text className="mb-3 font-semibold">{poll.question}</Text>

      {poll.is_closed ? (
        <Text className="mb-3 text-xs opacity-60">{t('forums_poll_closed')}</Text>
      ) : null}

      {poll.options.map(option => {
        const isUserVote = poll.user_votes.includes(option.id)
        const width = Math.max(0, Math.min(100, option.percentage))

        return (
          <View key={option.id} className="mb-3">
            <View className="mb-1 flex-row items-center justify-between gap-2">
              <View className="flex-1 flex-row flex-wrap items-center">
                <Text
                  className="text-sm"
                  style={isUserVote ? {fontWeight: '600', color: '#2563eb'} : undefined}>
                  {option.label}
                </Text>
                {isUserVote ? (
                  <Text className="text-xs opacity-80">
                    {' '}
                    ({t('forums_poll_your_vote')})
                  </Text>
                ) : null}
              </View>
              <Text className="shrink-0 text-xs opacity-60">
                {option.percentage}% ({option.vote_count})
              </Text>
            </View>
            <View
              className="h-2 overflow-hidden rounded-full"
              style={{backgroundColor: trackColor}}>
              <View
                className="h-full rounded-full"
                style={{
                  width: `${width}%`,
                  backgroundColor: isUserVote ? barSelected : barDefault,
                }}
              />
            </View>
          </View>
        )
      })}

      <Text className="mt-1 text-xs opacity-60">
        {t('forums_poll_voter_count', {count: poll.voter_count})}
      </Text>
    </View>
  )
}
