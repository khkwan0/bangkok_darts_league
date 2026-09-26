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

export default function MiniLeagueCopyScreen() {
  const {id} = useLocalSearchParams<{id: string}>()
  const miniId = Number(id)
  const api = useMiniLeagues()
  const {colors} = useTheme()
  const {state} = useLeagueContext()
  const [loading, setLoading] = React.useState(true)
  const [mini, setMini] = React.useState<any>(null)
  const [canonicalTeams, setCanonicalTeams] = React.useState<any[]>([])
  const [canonicalFormats, setCanonicalFormats] = React.useState<any[]>([])
  const [canonicalPlayers, setCanonicalPlayers] = React.useState<any[]>([])
  const [playerQuery, setPlayerQuery] = React.useState('')

  const isAdmin =
    Boolean(mini?.is_admin) || isLeagueAdmin(state.user)

  const loadPickers = React.useCallback(async () => {
    const [ct, cf, cp] = await Promise.all([
      api.browseCanonical(miniId, 'teams'),
      api.browseCanonical(miniId, 'match_formats'),
      api.browseCanonical(miniId, 'players', playerQuery ? {q: playerQuery} : {}),
    ])
    if (ct?.status === 'ok') setCanonicalTeams(ct.data || [])
    if (cf?.status === 'ok') setCanonicalFormats(cf.data || [])
    if (cp?.status === 'ok') setCanonicalPlayers(cp.data || [])
  }, [api, miniId, playerQuery])

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true)
      ;(async () => {
        const m = await api.get(miniId)
        if (m?.status === 'ok') setMini(m.data)
        const canManage =
          Boolean(m?.data?.is_admin) || isLeagueAdmin(state.user)
        if (canManage) await loadPickers()
      })().finally(() => setLoading(false))
    }, [api, loadPickers, miniId, state.user]),
  )

  async function copyTeam(teamId: number) {
    const res = await api.copy(miniId, {kind: 'team', team_id: teamId})
    if (res?.status === 'ok') Alert.alert('Copied', 'Team added')
    else Alert.alert('Error', res?.error || 'Copy failed')
  }

  async function copyFormat(matchFormatId: number) {
    const res = await api.copy(miniId, {
      kind: 'match_format',
      match_format_id: matchFormatId,
    })
    if (res?.status === 'ok') Alert.alert('Copied', 'Match format added')
    else Alert.alert('Error', res?.error || 'Copy failed')
  }

  async function copyPlayer(playerId: number) {
    const res = await api.copy(miniId, {
      kind: 'players',
      player_ids: [playerId],
    })
    if (res?.status === 'ok') Alert.alert('Added', 'Player added')
    else Alert.alert('Error', res?.error || 'Copy failed')
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (!isAdmin) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text>Only admins can copy from the main league.</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 px-4 pb-10" style={{backgroundColor: colors.background}}>
      <Text className="opacity-70 my-3">
        Copy only what you select from the main league.
      </Text>
      <Text className="font-semibold mb-2">Teams</Text>
      {canonicalTeams.map(t => (
        <Pressable
          key={t.id}
          onPress={() => copyTeam(t.id)}
          className="py-2 border-b border-slate-200 dark:border-slate-700">
          <Text>{t.short_name || t.name}</Text>
          <Text className="text-xs opacity-60">Tap to copy</Text>
        </Pressable>
      ))}
      <Text className="font-semibold mt-6 mb-2">Match formats</Text>
      {canonicalFormats.map(f => (
        <Pressable
          key={f.id}
          onPress={() => copyFormat(f.id)}
          className="py-2 border-b border-slate-200 dark:border-slate-700">
          <Text>
            {f.name} ({f.game_type})
          </Text>
        </Pressable>
      ))}
      <Text className="font-semibold mt-6 mb-2">Players</Text>
      <TextInput
        value={playerQuery}
        onChangeText={setPlayerQuery}
        onSubmitEditing={loadPickers}
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
      <Pressable onPress={loadPickers} className="mb-2">
        <Text style={{color: colors.primary}}>Search</Text>
      </Pressable>
      {canonicalPlayers.map(p => (
        <Pressable
          key={p.id}
          onPress={() => copyPlayer(p.id)}
          className="py-2 border-b border-slate-200 dark:border-slate-700">
          <Text>{p.nickname}</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}
