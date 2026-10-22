import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
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

export default function MiniLeaguePlayersScreen() {
  const {id} = useLocalSearchParams<{id: string}>()
  const miniId = Number(id)
  const api = useMiniLeagues()
  const {colors} = useTheme()
  const {state} = useLeagueContext()
  const [loading, setLoading] = React.useState(true)
  const [mini, setMini] = React.useState<any>(null)
  const [members, setMembers] = React.useState<any[]>([])
  const [inviteIds, setInviteIds] = React.useState('')
  const [inviting, setInviting] = React.useState(false)
  const [playerQuery, setPlayerQuery] = React.useState('')
  const [canonicalPlayers, setCanonicalPlayers] = React.useState<any[]>([])

  const isAdmin =
    Boolean(mini?.is_admin) || isLeagueAdmin(state.user)

  const refresh = React.useCallback(async () => {
    const [m, mem] = await Promise.all([
      api.get(miniId),
      api.listMembers(miniId),
    ])
    if (m?.status === 'ok') setMini(m.data)
    if (mem?.status === 'ok') setMembers(mem.data || [])
  }, [api, miniId])

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true)
      refresh().finally(() => setLoading(false))
    }, [refresh]),
  )

  async function searchPlayers() {
    const res = await api.browseCanonical(
      miniId,
      'players',
      playerQuery ? {q: playerQuery} : {},
    )
    if (res?.status === 'ok') setCanonicalPlayers(res.data || [])
  }

  async function inviteByIds() {
    const ids = inviteIds
      .split(/[,\s]+/)
      .map(s => Number(s.trim()))
      .filter(n => n > 0)
    if (ids.length === 0) {
      Alert.alert('Enter player IDs', 'Comma-separated player ids')
      return
    }
    setInviting(true)
    try {
      const res = await api.inviteMembers(miniId, ids)
      if (res?.status === 'ok') {
        setInviteIds('')
        await refresh()
        Alert.alert('Invited', 'Players invited')
      } else {
        Alert.alert('Error', res?.error || 'Invite failed')
      }
    } finally {
      setInviting(false)
    }
  }

  async function invitePlayer(playerId: number) {
    const res = await api.inviteMembers(miniId, [playerId])
    if (res?.status === 'ok') {
      await refresh()
      Alert.alert('Invited', 'Player invited')
    } else {
      Alert.alert('Error', res?.error || 'Invite failed')
    }
  }

  async function promoteAdmin(playerId: number) {
    const res = await api.addAdmin(miniId, playerId)
    if (res?.status === 'ok') await refresh()
    else Alert.alert('Error', res?.error || 'Failed')
  }

  async function demoteAdmin(playerId: number) {
    const res = await api.removeAdmin(miniId, playerId)
    if (res?.status === 'ok') await refresh()
    else Alert.alert('Error', res?.error || 'Failed')
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 px-4" style={{backgroundColor: colors.background}}>
      <Text className="font-semibold mt-4 mb-2">Members</Text>
      {members.map(m => (
        <View
          key={m.player_id}
          className="flex-row justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700">
          <View className="flex-1 pr-2">
            <Text>
              {m.nickname}
              {m.is_admin ? ' · admin' : ''}
              {m.status !== 'active' ? ` · ${m.status}` : ''}
            </Text>
          </View>
          {isAdmin && m.status === 'active' ? (
            m.is_admin ? (
              Number(mini?.created_by) !== Number(m.player_id) ? (
                <Pressable onPress={() => demoteAdmin(m.player_id)}>
                  <Text style={{color: colors.primary}}>Remove admin</Text>
                </Pressable>
              ) : null
            ) : (
              <Pressable onPress={() => promoteAdmin(m.player_id)}>
                <Text style={{color: colors.primary}}>Make admin</Text>
              </Pressable>
            )
          ) : null}
        </View>
      ))}

      {isAdmin ? (
        <View className="mt-6 pb-10">
          <Text className="font-semibold mb-2">Invite by player ID</Text>
          <TextInput
            value={inviteIds}
            onChangeText={setInviteIds}
            placeholder="e.g. 12, 34"
            placeholderTextColor={colors.text + '66'}
            style={{
              borderWidth: 1,
              borderColor: '#8884',
              borderRadius: 8,
              padding: 10,
              color: colors.text,
              marginBottom: 8,
            }}
          />
          <Button onPress={inviteByIds} disabled={inviting}>
            <Text className="text-white">
              {inviting ? 'Inviting…' : 'Invite'}
            </Text>
          </Button>

          <Text className="font-semibold mt-6 mb-2">Search main league</Text>
          <TextInput
            value={playerQuery}
            onChangeText={setPlayerQuery}
            onSubmitEditing={searchPlayers}
            placeholder="Search players"
            placeholderTextColor={colors.text + '66'}
            style={{
              borderWidth: 1,
              borderColor: '#8884',
              borderRadius: 8,
              padding: 10,
              color: colors.text,
              marginBottom: 8,
            }}
          />
          <Pressable onPress={searchPlayers} className="mb-2">
            <Text style={{color: colors.primary}}>Search</Text>
          </Pressable>
          {canonicalPlayers.map(p => (
            <Pressable
              key={p.id}
              onPress={() => invitePlayer(p.id)}
              className="py-2 border-b border-slate-200 dark:border-slate-700">
              <Text>{p.nickname}</Text>
              <Text className="text-xs opacity-60">Tap to invite</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View className="h-8" />
      )}
    </ScrollView>
  )
}
