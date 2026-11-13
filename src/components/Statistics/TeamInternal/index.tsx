/* eslint-disable react-hooks/exhaustive-deps */
import {
  EmptyNote,
  Surface,
  formatWinLabel,
  useStatColors,
  winRateColor,
  winRatePercent,
  WinRateBar,
} from '@/components/PlayerStatistics/statUi'
import StatsScopeChips from '@/components/Statistics/StatsScopeChips'
import {Colors} from '@/constants/Colors'
import {useStatsScope} from '@/context/StatsScopeContext'
import {useTeams} from '@/hooks'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import config from '@/config'
import {Image} from 'expo-image'
import {LinearGradient} from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import {usePathname, useRouter} from 'expo-router'
import {useNavigation} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native'

type SortKey = 'points' | 'won' | 'played' | 'perc'

type PlayerStat = {
  player_id: number
  nickname: string
  profile_picture: string | null
  played: number
  won: number
  points: number
  perc: number
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

function formatStat(value: number) {
  if (!Number.isFinite(value)) return '0'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
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

function Avatar({
  nickname,
  profilePicture,
}: {
  nickname: string
  profilePicture: string | null
}) {
  const colors = useStatColors()
  const uri = profilePicture ? config.profileUrl + profilePicture : null
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: colors.chip,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
      {uri ? (
        <Image
          source={{uri}}
          style={{width: 40, height: 40}}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text style={{fontWeight: '700', fontSize: 16, color: colors.muted}}>
          {(nickname || '?').slice(0, 1).toUpperCase()}
        </Text>
      )}
    </View>
  )
}

function SortChips({
  sortOption,
  onChange,
}: {
  sortOption: SortKey
  onChange: (option: SortKey) => void
}) {
  const {t} = useTranslation()
  const colors = useStatColors()
  const options: {id: SortKey; label: string}[] = [
    {id: 'points', label: t('points')},
    {id: 'won', label: t('won')},
    {id: 'played', label: t('played')},
    {id: 'perc', label: t('win_rate')},
  ]

  return (
    <View style={{marginBottom: 12}}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map(opt => {
          const active = sortOption === opt.id
          return (
            <Pressable
              key={opt.id}
              accessibilityRole="button"
              accessibilityState={{selected: active}}
              accessibilityLabel={opt.label}
              onPress={() => {
                if (process.env.EXPO_OS === 'ios') {
                  void Haptics.selectionAsync()
                }
                onChange(opt.id)
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                marginRight: 8,
                backgroundColor: active ? colors.accent : colors.card,
                borderWidth: 1,
                borderColor: active ? colors.accent : colors.border,
              }}>
              <Text
                style={{
                  color: active ? '#fff' : colors.text,
                  fontWeight: active ? '700' : '500',
                  fontSize: 13,
                }}>
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

function TeamSummary({stats}: {stats: PlayerStat[]}) {
  const {t} = useTranslation()
  const colors = useStatColors()
  const played = stats.reduce((sum, row) => sum + row.played, 0)
  const won = stats.reduce((sum, row) => sum + row.won, 0)
  const points = stats.reduce((sum, row) => sum + row.points, 0)
  const percent = winRatePercent(played, won, null)

  return (
    <Surface style={{padding: 14, marginBottom: 12}}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: colors.muted,
          marginBottom: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}>
        {t('internal_stats')}
      </Text>
      <View style={{flexDirection: 'row'}}>
        <SummaryStat label={t('played')} value={formatStat(played)} />
        <SummaryStat label={t('won')} value={formatStat(won)} />
        <SummaryStat label={t('points')} value={formatStat(points)} emphasize />
        <SummaryStat
          label={t('win_rate')}
          value={formatWinLabel(percent)}
          valueColor={winRateColor(percent)}
        />
      </View>
    </Surface>
  )
}

function SummaryStat({
  label,
  value,
  emphasize = false,
  valueColor,
}: {
  label: string
  value: string
  emphasize?: boolean
  valueColor?: string
}) {
  const colors = useStatColors()
  return (
    <View style={{flex: 1}}>
      <Text
        style={{
          fontSize: emphasize ? 20 : 18,
          fontWeight: '700',
          color: valueColor ?? (emphasize ? colors.accent : colors.text),
        }}>
        {value}
      </Text>
      <Text style={{marginTop: 2, fontSize: 12, color: colors.muted}}>
        {label}
      </Text>
    </View>
  )
}

function PlayerCard({item, index}: {item: PlayerStat; index: number}) {
  const router = useRouter()
  const pathname = usePathname()
  const colors = useStatColors()
  const {t} = useTranslation()
  const percent = winRatePercent(item.played, item.won, item.perc)

  function handlePress() {
    const base = pathname.replace(/\/Internal\/?$/, '')
    router.push({
      pathname: `${base}/Player` as any,
      params: {params: JSON.stringify({playerId: item.player_id})},
    })
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.nickname}
      onPress={handlePress}
      style={({pressed}) => ({
        opacity: pressed ? 0.75 : 1,
        paddingHorizontal: 16,
        paddingBottom: 12,
      })}>
      <Surface style={{padding: 14}}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Medal rank={index + 1} />
          <Avatar
            nickname={item.nickname}
            profilePicture={item.profile_picture}
          />
          <View style={{flex: 1, marginRight: 8}}>
            <Text
              numberOfLines={1}
              style={{fontSize: 16, fontWeight: '700', color: colors.text}}>
              {item.nickname}
            </Text>
            <Text style={{marginTop: 2, fontSize: 13, color: colors.muted}}>
              {`${t('played')} ${formatStat(item.played)}  ·  ${t('won')} ${formatStat(item.won)}  ·  ${t('points')} ${formatStat(item.points)}`}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: winRateColor(percent),
            }}>
            {formatWinLabel(percent)}
          </Text>
        </View>
        <View style={{marginTop: 12}}>
          <WinRateBar played={item.played} won={item.won} winp={item.perc} />
        </View>
      </Surface>
    </Pressable>
  )
}

export default function TeamInternal({
  teamId,
  teamName,
}: {
  teamId: number
  teamName: string
}) {
  const teams = useTeams()
  const {scope} = useStatsScope()
  const {t} = useTranslation()
  const navigation = useNavigation()
  const [stats, setStats] = React.useState<PlayerStat[]>([])
  const [sortOption, setSortOption] = React.useState<SortKey>('points')
  const [ready, setReady] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(false)
  const listContentStyle = useTabListContentContainerStyle({paddingTop: 8})
  const pageBg =
    Colors[useColorScheme() === 'dark' ? 'dark' : 'light'].background

  const sortedStats = [...stats].sort((a, b) => b[sortOption] - a[sortOption])

  async function getTeamInternalStats() {
    setLoading(true)
    setError(false)
    try {
      const res = (await teams.GetTeamInternalStats(teamId)) as {
        status?: string
        data?: any[]
      }
      if (res?.status !== 'ok' || !Array.isArray(res.data)) {
        setStats([])
        setError(true)
        return
      }
      const data: PlayerStat[] = res.data.map((item: any) => {
        const played = Number(item.played) || 0
        const won = Number(item.won) || 0
        const points = Number(item.points) || 0
        return {
          player_id: item.player_id,
          nickname: item.nickname ?? '',
          profile_picture: item.profile_picture ?? null,
          played,
          won,
          points,
          perc: winRatePercent(played, won, null) ?? 0,
        }
      })
      setStats(data)
    } catch (e) {
      console.log(e)
      setStats([])
      setError(true)
    } finally {
      setLoading(false)
      setReady(true)
    }
  }

  React.useEffect(() => {
    if (teamId) {
      getTeamInternalStats()
    }
  }, [scope, teamId])

  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: teamName || t('internal_stats'),
    })
  }, [navigation, teamName, t])

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
      contentInsetAdjustmentBehavior="automatic"
      data={sortedStats}
      keyExtractor={item => String(item.player_id)}
      renderItem={({item, index}) => <PlayerCard item={item} index={index} />}
      ListHeaderComponent={
        <View style={{paddingHorizontal: 16, paddingTop: 4}}>
          <StatsScopeChips />
          <SortChips sortOption={sortOption} onChange={setSortOption} />
          {loading ? (
            <ActivityIndicator style={{marginBottom: 12}} color="#0a7ea4" />
          ) : null}
          {!loading && !error && sortedStats.length > 0 ? (
            <TeamSummary stats={sortedStats} />
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={{paddingHorizontal: 16, paddingTop: 8}}>
          {error ? (
            <EmptyNote label="something_went_wrong" />
          ) : (
            <EmptyNote label="no_players_found" />
          )}
        </View>
      }
    />
  )
}
