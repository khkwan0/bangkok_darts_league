import {ThemedText as Text} from '@/components/ThemedText'
import {Colors} from '@/constants/Colors'
import {router} from 'expo-router'
import React from 'react'
import {Pressable, useColorScheme, View} from 'react-native'
import {useTranslation} from 'react-i18next'

type Props = {
  match: Record<string, unknown>
  onOpenScoresheet?: () => void
}

/** Regular-width home detail: match summary + open live scoresheet. */
export function MatchPreviewDetail({match, onOpenScoresheet}: Props) {
  const {t} = useTranslation()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  const home = String(match.home_team_name ?? match.home_team ?? '')
  const away = String(match.away_team_name ?? match.away_team ?? '')
  const date = String(match.date ?? match.original_date ?? '')

  const open = () => {
    if (onOpenScoresheet) {
      onOpenScoresheet()
      return
    }
    router.push({pathname: '/Match', params: match as any})
  }

  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}>
      {date ? (
        <Text style={{opacity: 0.55, marginBottom: 8, textAlign: 'center'}}>
          {date}
        </Text>
      ) : null}
      <Text
        style={{
          fontSize: 22,
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: 8,
        }}>
        {home || '—'}
      </Text>
      <Text style={{textAlign: 'center', opacity: 0.5, marginBottom: 8}}>
        vs
      </Text>
      <Text
        style={{
          fontSize: 22,
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: 28,
        }}>
        {away || '—'}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={open}
        style={{
          alignSelf: 'center',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: colors.buttonBackground,
        }}>
        <Text style={{color: '#fff', fontWeight: '700'}}>
          {t('open_scoresheet')}
        </Text>
      </Pressable>
    </View>
  )
}
