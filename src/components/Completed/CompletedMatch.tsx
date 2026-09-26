import {useStatColors} from '@/components/PlayerStatistics/statUi'
import {formatBangkokDateMed} from '@/lib/bangkokTime'
import {Ionicons} from '@expo/vector-icons'
import {router} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, Text, View} from 'react-native'

type CompletedMatchProps = {
  item: {
    match_id: number
    home_team_name: string
    away_team_name: string
    home_frames: number
    away_frames: number
    date: string
    original_date: string
  }
}

const WIN = '#16a34a'

const CARD_ACCENTS = ['#0a7ea4', '#16a34a', '#c8960c', '#7c3aed', '#2563eb']

export function cardAccent(index: number) {
  return CARD_ACCENTS[index % CARD_ACCENTS.length]
}

export function ResultScore({
  homeName,
  awayName,
  homeFrames,
  awayFrames,
  final = true,
}: {
  homeName: string
  awayName: string
  homeFrames: number
  awayFrames: number
  final?: boolean
}) {
  const colors = useStatColors()
  const {t} = useTranslation()
  const home = Number(homeFrames) || 0
  const away = Number(awayFrames) || 0
  const showScores = final || home > 0 || away > 0
  const homeWon = final && home > away
  const awayWon = final && away > home

  if (!showScores) {
    return (
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <Text
          numberOfLines={2}
          style={{flex: 1, fontSize: 16, fontWeight: '600', color: colors.text}}>
          {homeName}
        </Text>
        <Text style={{fontSize: 12, fontWeight: '700', color: colors.muted}}>
          {t('vs')}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            textAlign: 'right',
          }}>
          {awayName}
        </Text>
      </View>
    )
  }

  return (
    <View>
      <ScoreLine
        name={homeName}
        score={home}
        won={homeWon}
        dim={awayWon}
      />
      <View
        style={{
          height: 1,
          backgroundColor: colors.track,
          marginVertical: 8,
        }}
      />
      <ScoreLine
        name={awayName}
        score={away}
        won={awayWon}
        dim={homeWon}
      />
    </View>
  )
}

function ScoreLine({
  name,
  score,
  won,
  dim,
}: {
  name: string
  score: number
  won: boolean
  dim: boolean
}) {
  const colors = useStatColors()
  return (
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      <Text
        numberOfLines={2}
        style={{
          flex: 1,
          marginRight: 12,
          fontSize: 16,
          fontWeight: won ? '700' : '500',
          color: dim ? colors.muted : colors.text,
        }}>
        {name}
      </Text>
      <Text
        style={{
          minWidth: 28,
          textAlign: 'right',
          fontSize: 22,
          fontWeight: '700',
          color: won ? WIN : dim ? colors.muted : colors.text,
        }}>
        {String(score)}
      </Text>
    </View>
  )
}

export default function CompletedMatch({
  item,
  index = 0,
}: CompletedMatchProps & {index?: number}) {
  const colors = useStatColors()
  const accent = cardAccent(index)
  const matchDate = formatBangkokDateMed(item.date)
  const originalDate = item.original_date
    ? formatBangkokDateMed(item.original_date)
    : null
  const postponed = originalDate && originalDate !== matchDate

  function handlePress() {
    router.push({
      pathname: '/completed/Match',
      params: {
        params: JSON.stringify({
          matchId: item.match_id,
        }),
      },
    })
  }

  return (
    <View style={{paddingHorizontal: 16, paddingBottom: 28}}>
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={({pressed}) => ({
        opacity: pressed ? 0.75 : 1,
      })}>
      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderLeftWidth: 4,
          borderLeftColor: accent,
          borderRadius: 16,
          padding: 14,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: postponed ? 2 : 12,
          }}>
          <Ionicons name="calendar-outline" size={16} color={colors.muted} />
          <Text
            style={{
              flex: 1,
              marginLeft: 6,
              fontSize: 13,
              fontWeight: '600',
              color: colors.muted,
            }}>
            {matchDate}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </View>
        {postponed ? (
          <Text style={{fontSize: 12, color: colors.muted, marginBottom: 12}}>
            {`(${originalDate})`}
          </Text>
        ) : null}
        <ResultScore
          homeName={item.home_team_name}
          awayName={item.away_team_name}
          homeFrames={item.home_frames}
          awayFrames={item.away_frames}
        />
      </View>
    </Pressable>
    </View>
  )
}
