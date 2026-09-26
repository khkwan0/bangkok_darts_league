import {cardAccent, ResultScore} from '@/components/Completed/CompletedMatch'
import {useStatColors} from '@/components/PlayerStatistics/statUi'
import {formatBangkokDateMed} from '@/lib/bangkokTime'
import {Ionicons} from '@expo/vector-icons'
import {router} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, Text, View} from 'react-native'

type MatchDateItemProps = {
  date: {
    date: string
    matches: {
      match_id: number
      match_status_id: number
      match_date: string
      home_team_name: string
      away_team_name: string
      home_frames: number
      away_frames: number
      division_name?: string
    }[]
  }
}

export default function MatchDateItem({date}: MatchDateItemProps) {
  const dateLabel = formatBangkokDateMed(date.date)
  const [show, setShow] = React.useState(false)
  const colors = useStatColors()
  const {t} = useTranslation()
  const count = date.matches.length

  return (
    <View style={{paddingHorizontal: 16, paddingBottom: 28}}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${dateLabel}, ${count} ${count === 1 ? t('match') : t('matches')}`}
        onPress={() => setShow(open => !open)}
        style={({pressed}) => ({opacity: pressed ? 0.75 : 1})}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 14,
          }}>
          <Ionicons name="calendar-outline" size={18} color={colors.accent} />
          <Text
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 16,
              fontWeight: '700',
              color: colors.text,
            }}>
            {dateLabel}
          </Text>
          <View
            style={{
              minWidth: 28,
              alignItems: 'center',
              borderRadius: 999,
              backgroundColor: colors.chip,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginRight: 8,
            }}>
            <Text style={{fontSize: 12, fontWeight: '700', color: colors.text}}>
              {String(count)}
            </Text>
          </View>
          <Ionicons
            name={show ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.muted}
          />
        </View>
      </Pressable>
      {show
        ? date.matches.map((match, index) => {
            const final = match.match_status_id === 3
            return (
              <Pressable
                key={`${match.match_id}`}
                accessibilityRole="button"
                onPress={() => {
                  if (final) {
                    router.push({
                      pathname: '/completed/Match',
                      params: {
                        params: JSON.stringify({
                          matchId: match.match_id,
                        }),
                      },
                    })
                  } else {
                    router.push({
                      pathname: '/Match',
                      params: {
                        params: JSON.stringify(match),
                      },
                    })
                  }
                }}
                style={({pressed}) => ({
                  marginTop: 20,
                  opacity: pressed ? 0.75 : 1,
                })}>
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderLeftWidth: 4,
                    borderLeftColor: cardAccent(index),
                    borderRadius: 16,
                    padding: 14,
                  }}>
                  {match.division_name ? (
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: colors.muted,
                        marginBottom: 8,
                      }}>
                      {match.division_name}
                    </Text>
                  ) : null}
                  <ResultScore
                    homeName={match.home_team_name}
                    awayName={match.away_team_name}
                    homeFrames={match.home_frames}
                    awayFrames={match.away_frames}
                    final={final}
                  />
                </View>
              </Pressable>
            )
          })
        : null}
    </View>
  )
}
