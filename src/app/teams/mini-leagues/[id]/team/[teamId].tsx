import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useMiniLeagues} from '@/hooks/useMiniLeagues'
import {useTheme} from 'expo-router/react-navigation'
import {useFocusEffect, useLocalSearchParams} from 'expo-router'
import React from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native'

export default function MiniLeagueTeamRosterScreen() {
  const {id, teamId} = useLocalSearchParams<{id: string; teamId: string}>()
  const miniId = Number(id)
  const tid = Number(teamId)
  const api = useMiniLeagues()
  const {colors} = useTheme()
  const [loading, setLoading] = React.useState(true)
  const [team, setTeam] = React.useState<any>(null)
  const [players, setPlayers] = React.useState<any[]>([])
  const [members, setMembers] = React.useState<any[]>([])
  const [playerIdInput, setPlayerIdInput] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const refresh = React.useCallback(async () => {
    const [roster, mem] = await Promise.all([
      api.listTeamRoster(miniId, tid),
      api.listMembers(miniId),
    ])
    if (roster?.status === 'ok') {
      setTeam(roster.data?.team || null)
      setPlayers(roster.data?.players || [])
    }
    if (mem?.status === 'ok') setMembers(mem.data || [])
  }, [api, miniId, tid])

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true)
      refresh().finally(() => setLoading(false))
    }, [refresh]),
  )

  async function onAdd(playerId: number) {
    setBusy(true)
    try {
      const res = await api.addTeamPlayer(miniId, tid, playerId)
      if (res?.status === 'ok') {
        setPlayerIdInput('')
        setTeam(res.data?.team || team)
        setPlayers(res.data?.players || [])
      } else {
        Alert.alert('Error', res?.error || 'Could not add player')
      }
    } finally {
      setBusy(false)
    }
  }

  async function onRemove(playerId: number) {
    setBusy(true)
    try {
      const res = await api.removeTeamPlayer(miniId, tid, playerId)
      if (res?.status === 'ok') {
        setPlayers(res.data?.players || [])
      } else {
        Alert.alert('Error', res?.error || 'Could not remove player')
      }
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  const onRoster = new Set(players.map(p => Number(p.player_id)))
  const addable = (members || []).filter(
    m =>
      m.status === 'active' &&
      !onRoster.has(Number(m.player_id)) &&
      Number(m.player_id) > 0,
  )

  return (
    <ScrollView
      className="flex-1 px-4"
      style={{backgroundColor: colors.background}}>
      <Text className="text-xl font-bold mt-4 mb-2">
        {team?.short_name || team?.name || 'Team'}
      </Text>
      <Text className="opacity-60 mb-4">{team?.name}</Text>

      <Text className="font-semibold mb-2">Roster</Text>
      {players.length === 0 ? (
        <Text className="opacity-60 mb-4">No players on this team.</Text>
      ) : (
        players.map(p => (
          <View
            key={p.player_id}
            className="flex-row items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <View className="flex-1 pr-2">
              <Text className="font-medium">{p.nickname}</Text>
              <Text className="text-xs opacity-60">
                {Number(p.team_role_id) === 2
                  ? 'Captain'
                  : Number(p.team_role_id) === 1
                    ? 'Assistant'
                    : 'Player'}
              </Text>
            </View>
            <Pressable onPress={() => onRemove(Number(p.player_id))} disabled={busy}>
              <Text style={{color: '#dc2626'}}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}

      <Text className="font-semibold mt-6 mb-2">Add member</Text>
      <Text className="text-sm opacity-60 mb-2">
        Player must already be an active mini-league member.
      </Text>
      {addable.slice(0, 20).map(m => (
        <Pressable
          key={m.player_id}
          className="py-2"
          disabled={busy}
          onPress={() => onAdd(Number(m.player_id))}>
          <Text style={{color: colors.primary}}>
            + {m.nickname || `Player ${m.player_id}`}
          </Text>
        </Pressable>
      ))}

      <View className="mt-4 mb-10 flex-row items-center gap-2">
        <TextInput
          value={playerIdInput}
          onChangeText={setPlayerIdInput}
          placeholder="Player id"
          keyboardType="number-pad"
          placeholderTextColor={colors.text + '66'}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#8884',
            borderRadius: 8,
            padding: 10,
            color: colors.text,
          }}
        />
        <Button
          onPress={() => onAdd(Number(playerIdInput))}
          disabled={busy || !Number(playerIdInput)}>
          <Text className="text-white">Add</Text>
        </Button>
      </View>
    </ScrollView>
  )
}
