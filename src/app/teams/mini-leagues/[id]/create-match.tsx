import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {useLeague} from '@/hooks'
import {useMiniLeagues} from '@/hooks/useMiniLeagues'
import {useTheme} from 'expo-router/react-navigation'
import {router, useFocusEffect, useLocalSearchParams} from 'expo-router'
import React from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native'

function matchInfoFromResponse(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== 'object') return null
  const payload = res as {status?: string; data?: unknown; match_id?: unknown}
  if (payload.status === 'ok' && payload.data && typeof payload.data === 'object') {
    return payload.data as Record<string, unknown>
  }
  if (typeof payload.match_id !== 'undefined') {
    return payload as Record<string, unknown>
  }
  return null
}

export default function MiniLeagueCreateMatchScreen() {
  const {id} = useLocalSearchParams<{id: string}>()
  const miniId = Number(id)
  const api = useMiniLeagues()
  const league = useLeague()
  const {colors} = useTheme()
  const {state} = useLeagueContext()
  const [loading, setLoading] = React.useState(true)
  const [mini, setMini] = React.useState<any>(null)
  const [members, setMembers] = React.useState<any[]>([])
  const [teams, setTeams] = React.useState<any[]>([])
  const [formats, setFormats] = React.useState<any[]>([])
  const [canonicalFormats, setCanonicalFormats] = React.useState<any[]>([])
  const [homeTeamId, setHomeTeamId] = React.useState<number | null>(null)
  const [awayTeamId, setAwayTeamId] = React.useState<number | null>(null)
  const [formatId, setFormatId] = React.useState<number | null>(null)
  const [matchDate, setMatchDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  )
  const [selectedHomePlayers, setSelectedHomePlayers] = React.useState<number[]>(
    [],
  )
  const [selectedAwayPlayers, setSelectedAwayPlayers] = React.useState<number[]>(
    [],
  )
  const [matchMode, setMatchMode] = React.useState<'teams' | 'pickup'>('teams')
  const [creating, setCreating] = React.useState(false)

  const refresh = React.useCallback(async () => {
    const [m, mem, t, f, cf] = await Promise.all([
      api.get(miniId),
      api.listMembers(miniId),
      api.listTeams(miniId),
      api.listMatchFormats(miniId),
      api.browseCanonical(miniId, 'match_formats'),
    ])
    if (m?.status === 'ok') setMini(m.data)
    if (mem?.status === 'ok') setMembers(mem.data || [])
    if (t?.status === 'ok') setTeams(t.data || [])
    if (f?.status === 'ok') setFormats(f.data || [])
    if (cf?.status === 'ok') setCanonicalFormats(cf.data || [])
  }, [api, miniId])

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true)
      refresh().finally(() => setLoading(false))
    }, [refresh]),
  )

  function togglePlayer(
    list: number[],
    setList: (v: number[]) => void,
    playerId: number,
  ) {
    setList(
      list.includes(playerId)
        ? list.filter(id => id !== playerId)
        : [...list, playerId],
    )
  }

  async function createMatch() {
    const payload: any = {
      date: matchDate,
      match_format_id: formatId,
    }
    if (matchMode === 'teams') {
      payload.home_team_id = homeTeamId
      payload.away_team_id = awayTeamId
    } else {
      payload.home_player_ids = selectedHomePlayers
      payload.away_player_ids = selectedAwayPlayers
    }
    if (!payload.match_format_id) {
      Alert.alert('Missing format', 'Select a match format')
      return
    }
    setCreating(true)
    try {
      const res = await api.createMatch(miniId, payload)
      if (res?.status === 'ok' && res.data?.id) {
        // @ts-expect-error runtime
        const full = await league.GetMatchById(res.data.id)
        const matchInfo = matchInfoFromResponse(full)
        if (matchInfo) {
          router.push({
            pathname: '/Match',
            params: {params: JSON.stringify(matchInfo)},
          })
        } else {
          router.push({
            pathname: '/Match',
            params: {
              params: JSON.stringify({match_id: res.data.id}),
            },
          })
        }
      } else {
        Alert.alert('Error', res?.error || 'Could not create match')
      }
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (!(Boolean(mini?.is_admin) || isLeagueAdmin(state.user))) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text>Only admins can create matches.</Text>
      </View>
    )
  }

  const formatOptions = [
    ...formats,
    ...canonicalFormats.filter(
      cf => !formats.some((f: any) => f.copied_from_id === cf.id),
    ),
  ]

  return (
    <ScrollView className="flex-1 px-4" style={{backgroundColor: colors.background}}>
      <View className="flex-row my-4">
        <Pressable
          onPress={() => setMatchMode('teams')}
          className="mr-3 px-3 py-2 rounded-lg"
          style={{
            backgroundColor: matchMode === 'teams' ? colors.primary : '#8883',
          }}>
          <Text style={{color: '#fff'}}>Team vs team</Text>
        </Pressable>
        <Pressable
          onPress={() => setMatchMode('pickup')}
          className="px-3 py-2 rounded-lg"
          style={{
            backgroundColor: matchMode === 'pickup' ? colors.primary : '#8883',
          }}>
          <Text style={{color: '#fff'}}>Pickup sides</Text>
        </Pressable>
      </View>

      <Text className="mb-1">Date (YYYY-MM-DD)</Text>
      <TextInput
        value={matchDate}
        onChangeText={setMatchDate}
        style={{
          borderWidth: 1,
          borderColor: '#8884',
          borderRadius: 8,
          padding: 10,
          color: colors.text,
          marginBottom: 12,
        }}
      />

      <Text className="font-semibold mb-2">Format</Text>
      {formatOptions.map(f => (
        <Pressable key={`fmt-${f.id}`} onPress={() => setFormatId(f.id)} className="py-2">
          <Text>
            {formatId === f.id ? '✓ ' : ''}
            {f.name} ({f.game_type})
          </Text>
        </Pressable>
      ))}

      {matchMode === 'teams' ? (
        <>
          <Text className="font-semibold mt-4 mb-2">Home team</Text>
          {teams.map(t => (
            <Pressable key={`h-${t.id}`} onPress={() => setHomeTeamId(t.id)}>
              <Text>
                {homeTeamId === t.id ? '✓ ' : ''}
                {t.short_name || t.name}
              </Text>
            </Pressable>
          ))}
          <Text className="font-semibold mt-4 mb-2">Away team</Text>
          {teams.map(t => (
            <Pressable key={`a-${t.id}`} onPress={() => setAwayTeamId(t.id)}>
              <Text>
                {awayTeamId === t.id ? '✓ ' : ''}
                {t.short_name || t.name}
              </Text>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Text className="font-semibold mt-4 mb-2">Home players</Text>
          {members
            .filter(m => m.status === 'active')
            .map(m => (
              <Pressable
                key={`hp-${m.player_id}`}
                onPress={() =>
                  togglePlayer(
                    selectedHomePlayers,
                    setSelectedHomePlayers,
                    m.player_id,
                  )
                }>
                <Text>
                  {selectedHomePlayers.includes(m.player_id) ? '✓ ' : ''}
                  {m.nickname}
                </Text>
              </Pressable>
            ))}
          <Text className="font-semibold mt-4 mb-2">Away players</Text>
          {members
            .filter(m => m.status === 'active')
            .map(m => (
              <Pressable
                key={`ap-${m.player_id}`}
                onPress={() =>
                  togglePlayer(
                    selectedAwayPlayers,
                    setSelectedAwayPlayers,
                    m.player_id,
                  )
                }>
                <Text>
                  {selectedAwayPlayers.includes(m.player_id) ? '✓ ' : ''}
                  {m.nickname}
                </Text>
              </Pressable>
            ))}
        </>
      )}

      <View className="mt-6 mb-10">
        <Button onPress={createMatch} disabled={creating}>
          <Text className="text-white">
            {creating ? 'Creating…' : 'Create & open scoresheet'}
          </Text>
        </Button>
      </View>
    </ScrollView>
  )
}
