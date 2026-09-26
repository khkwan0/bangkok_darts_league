/* eslint-disable react-hooks/exhaustive-deps */
import {useStatColors} from '@/components/PlayerStatistics/statUi'
import {MiniSeasonChips} from '@/components/mini-leagues/MiniSeasonChips'
import {Colors} from '@/constants/Colors'
import {useLeague} from '@/hooks'
import {useLeagueSeasonSelection} from '@/hooks/useLeagueSeasonSelection'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import type {DivisionData, Team} from '@/types'
import {Ionicons} from '@expo/vector-icons'
import {LinearGradient} from 'expo-linear-gradient'
import {router, usePathname} from 'expo-router'
import {useNavigation} from 'expo-router/react-navigation'
import React, {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  useColorScheme,
  View,
} from 'react-native'

type StandingMatch = {
  home: boolean
  vs: string
  pts: number
  frames: number
  matchId?: number
  won?: number
  lost?: number
}

const MEDALS = {
  1: {
    rim: '#8a6a12',
    face: ['#fff8dc', '#f6d365', '#d4a017', '#a16207'] as const,
    ink: '#5c4308',
  },
  2: {
    rim: '#6b7280',
    face: ['#ffffff', '#e5e7eb', '#b8bcc4', '#6b7280'] as const,
    ink: '#3f3f46',
  },
  3: {
    rim: '#7c4a1e',
    face: ['#f8e0c8', '#e0a36a', '#b87333', '#7c4a1e'] as const,
    ink: '#4a240c',
  },
}

function Medal({rank}: {rank: number}) {
  const colors = useStatColors()
  const metal = MEDALS[rank as 1 | 2 | 3]
  if (!metal) {
    return (
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.chip,
          marginRight: 12,
        }}>
        <Text style={{fontSize: 15, fontWeight: '800', color: colors.text}}>
          {String(rank)}
        </Text>
      </View>
    )
  }
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        padding: 2,
        marginRight: 12,
        backgroundColor: metal.rim,
      }}>
      <LinearGradient
        colors={metal.face}
        start={{x: 0.15, y: 0}}
        end={{x: 0.85, y: 1}}
        style={{
          flex: 1,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{fontSize: 15, fontWeight: '800', color: metal.ink}}>
          {String(rank)}
        </Text>
      </LinearGradient>
    </View>
  )
}

const SCORE_COL = 58

function MatchHeader() {
  const colors = useStatColors()
  const {t} = useTranslation()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingBottom: 2,
      }}>
      <View style={{flex: 1}} />
      <Text
        numberOfLines={1}
        style={{
          width: SCORE_COL,
          textAlign: 'right',
          fontSize: 12,
          fontWeight: '700',
          color: colors.muted,
        }}>
        {t('points')}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          width: SCORE_COL,
          textAlign: 'right',
          fontSize: 12,
          fontWeight: '700',
          color: colors.muted,
        }}>
        {t('frames')}
      </Text>
    </View>
  )
}

function MatchRow({match}: {match: StandingMatch}) {
  const colors = useStatColors()
  const {t} = useTranslation()
  const currentPath = usePathname()
  const resultColor =
    match.won === 1 ? '#16a34a' : match.lost === 1 ? '#dc2626' : colors.text

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!match.matchId}
      onPress={() => {
        if (!match.matchId) return
        router.push({
          pathname: currentPath + '/Match',
          params: {
            params: JSON.stringify({matchId: match.matchId}),
          },
        })
      }}
      style={({pressed}) => ({
        opacity: pressed && match.matchId ? 0.75 : 1,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: colors.track,
      })}>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <View
          style={{
            borderRadius: 999,
            backgroundColor: colors.chip,
            paddingHorizontal: 8,
            paddingVertical: 3,
            marginRight: 10,
          }}>
          <Text style={{fontSize: 11, fontWeight: '700', color: colors.muted}}>
            {match.home ? t('home') : t('away')}
          </Text>
        </View>
        <Text
          numberOfLines={2}
          style={{flex: 1, marginRight: 10, fontSize: 15, color: colors.text}}>
          {match.vs}
        </Text>
        <Text
          style={{
            width: SCORE_COL,
            textAlign: 'right',
            fontSize: 16,
            fontWeight: '700',
            color: resultColor,
          }}>
          {String(match.pts ?? '')}
        </Text>
        <Text
          style={{
            width: SCORE_COL,
            textAlign: 'right',
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
          }}>
          {String(match.frames ?? '')}
        </Text>
      </View>
    </Pressable>
  )
}

function TeamCard({team, rank}: {team: Team; rank: number}) {
  const colors = useStatColors()
  const {t} = useTranslation()
  const [open, setOpen] = useState(false)
  const matches = (team.matches || []) as StandingMatch[]

  return (
    <View style={{paddingHorizontal: 16, paddingBottom: 12}}>
      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: open ? 4 : 14,
        }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen(value => !value)}
          style={({pressed}) => ({opacity: pressed ? 0.75 : 1})}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Medal rank={rank} />
            <Text
              numberOfLines={2}
              style={{
                flex: 1,
                marginRight: 8,
                fontSize: 16,
                fontWeight: '700',
                color: colors.text,
              }}>
              {team.name}
            </Text>
            <Ionicons
              name={open ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.muted}
            />
          </View>
          <View style={{flexDirection: 'row', marginTop: 14}}>
            <Stat label={t('played')} value={team.played} />
            <Stat label={t('points')} value={team.points} emphasize />
            <Stat label={t('frames')} value={team.frames} />
          </View>
        </Pressable>
        {open ? (
          <>
            <MatchHeader />
            {matches.map((match, index) => (
              <MatchRow key={match.matchId ?? index} match={match} />
            ))}
          </>
        ) : null}
      </View>
    </View>
  )
}

function Stat({
  label,
  value,
  emphasize = false,
}: {
  label: string
  value: number
  emphasize?: boolean
}) {
  const colors = useStatColors()
  return (
    <View style={{flex: 1}}>
      <Text
        style={{
          fontSize: emphasize ? 22 : 18,
          fontWeight: '700',
          color: emphasize ? colors.accent : colors.text,
        }}>
        {String(value ?? 0)}
      </Text>
      <Text style={{marginTop: 2, fontSize: 12, color: colors.muted}}>
        {label}
      </Text>
    </View>
  )
}

function DivisionStandings({data}: {data: DivisionData}) {
  const colors = useStatColors()
  return (
    <View style={{paddingTop: 8}}>
      <Text
        style={{
          paddingHorizontal: 16,
          paddingBottom: 12,
          fontSize: 20,
          fontWeight: '800',
          color: colors.text,
        }}>
        {data.division}
      </Text>
      {data.teams.map((team, index) => (
        <TeamCard key={`${data.division}-${team.name}-${index}`} team={team} rank={index + 1} />
      ))}
    </View>
  )
}

export default function LeagueStandings() {
  const navigation = useNavigation()
  const {t} = useTranslation()
  const league = useLeague()
  const [standings, setStandings] = useState<DivisionData[]>([])
  const [ready, setReady] = useState(false)
  const {seasons, seasonId, setSeasonId, pastSeasonId} =
    useLeagueSeasonSelection()
  const [loadedSeasonId, setLoadedSeasonId] = useState<number | null>(null)
  const isLoading = ready && loadedSeasonId !== pastSeasonId
  const listContentStyle = useTabListContentContainerStyle({paddingTop: 8})
  const pageBg = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'].background

  React.useEffect(() => {
    navigation.setOptions({
      title: t('league_standings'),
      headerBackTitle: t('back'),
    })
  }, [])

  React.useEffect(() => {
    league
      .GetStandings(pastSeasonId)
      .then((next: DivisionData[]) => {
        setStandings(Array.isArray(next) ? next : [])
      })
      .finally(() => {
        setReady(true)
        setLoadedSeasonId(pastSeasonId)
      })
  }, [pastSeasonId])

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pageBg,
        }}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    )
  }

  return (
    <FlatList
      style={{flex: 1, backgroundColor: pageBg}}
      contentContainerStyle={listContentStyle}
      data={standings}
      keyExtractor={item => item.division}
      renderItem={({item}) => <DivisionStandings data={item} />}
      ListHeaderComponent={
        <View style={{paddingHorizontal: 16, paddingTop: 4}}>
          <MiniSeasonChips
            seasons={seasons}
            seasonId={seasonId}
            onSelect={setSeasonId}
          />
          {isLoading ? (
            <ActivityIndicator style={{marginBottom: 12}} color="#0a7ea4" />
          ) : null}
        </View>
      }
    />
  )
}
