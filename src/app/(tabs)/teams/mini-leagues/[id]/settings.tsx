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

type TeamCreatePermission = 'anyone' | 'members' | 'admins'

export default function MiniLeagueSettingsScreen() {
  const {id} = useLocalSearchParams<{id: string}>()
  const miniId = Number(id)
  const api = useMiniLeagues()
  const {colors} = useTheme()
  const {setCompetition, state} = useLeagueContext()
  const [loading, setLoading] = React.useState(true)
  const [mini, setMini] = React.useState<any>(null)
  const [name, setName] = React.useState('')
  const [status, setStatus] = React.useState('1')
  const [teamCreatePermission, setTeamCreatePermission] =
    React.useState<TeamCreatePermission>('admins')
  const [seasons, setSeasons] = React.useState<any[]>([])
  const [seasonName, setSeasonName] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [creatingSeason, setCreatingSeason] = React.useState(false)

  const refresh = React.useCallback(async () => {
    const [m, s] = await Promise.all([
      api.get(miniId),
      api.listSeasons(miniId),
    ])
    if (m?.status === 'ok') {
      setMini(m.data)
      setName(m.data.name || '')
      setStatus(String(m.data.status ?? 1))
      const permission = m.data.team_create_permission
      setTeamCreatePermission(
        permission === 'anyone' ||
          permission === 'members' ||
          permission === 'admins'
          ? permission
          : 'admins',
      )
    }
    if (s?.status === 'ok') setSeasons(s.data || [])
  }, [api, miniId])

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true)
      refresh().finally(() => setLoading(false))
    }, [refresh]),
  )

  async function onSave() {
    setSaving(true)
    try {
      const res = await api.update(miniId, {
        name: name.trim(),
        status: Number(status),
        team_create_permission: teamCreatePermission,
      })
      if (res?.status === 'ok') {
        await refresh()
        if (
          state.competition.type === 'mini' &&
          state.competition.id === miniId
        ) {
          await setCompetition({
            type: 'mini',
            id: miniId,
            name: name.trim() || mini?.name || 'Mini league',
          })
        }
        Alert.alert('Saved', 'Settings updated')
      } else {
        Alert.alert('Error', res?.error || 'Save failed')
      }
    } finally {
      setSaving(false)
    }
  }

  async function onCreateSeason() {
    const trimmed = seasonName.trim()
    if (!trimmed) return
    setCreatingSeason(true)
    try {
      const res = await api.createSeason(miniId, {
        name: trimmed,
        activate: true,
      })
      if (res?.status === 'ok') {
        setSeasonName('')
        await refresh()
      } else {
        Alert.alert('Error', res?.error || 'Could not create season')
      }
    } finally {
      setCreatingSeason(false)
    }
  }

  async function activateSeason(seasonId: number) {
    const res = await api.updateSeason(miniId, {
      season_id: seasonId,
      activate: true,
    })
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

  if (!(Boolean(mini?.is_admin) || isLeagueAdmin(state.user))) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text>Only admins can change settings.</Text>
      </View>
    )
  }

  const permissions: TeamCreatePermission[] = ['anyone', 'members', 'admins']

  return (
    <ScrollView className="flex-1 px-4 pb-10" style={{backgroundColor: colors.background}}>
      <Text className="font-semibold mt-4 mb-2">Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={{
          borderWidth: 1,
          borderColor: '#8884',
          borderRadius: 8,
          padding: 10,
          color: colors.text,
          marginBottom: 12,
        }}
      />

      <Text className="font-semibold mb-2">Status</Text>
      <View className="flex-row mb-4">
        {[
          {value: '1', label: 'Enabled'},
          {value: '0', label: 'Disabled'},
        ].map(opt => (
          <Pressable
            key={opt.value}
            onPress={() => setStatus(opt.value)}
            className="mr-3 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: status === opt.value ? colors.primary : '#8883',
            }}>
            <Text style={{color: '#fff'}}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text className="font-semibold mb-2">Who can create teams</Text>
      <View className="flex-row flex-wrap mb-4">
        {permissions.map(p => (
          <Pressable
            key={p}
            onPress={() => setTeamCreatePermission(p)}
            className="mr-2 mb-2 px-3 py-2 rounded-lg"
            style={{
              backgroundColor:
                teamCreatePermission === p ? colors.primary : '#8883',
            }}>
            <Text style={{color: '#fff'}}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <Button onPress={onSave} disabled={saving || !name.trim()}>
        <Text className="text-white">{saving ? 'Saving…' : 'Save settings'}</Text>
      </Button>

      <Text className="font-semibold mt-8 mb-2">Seasons</Text>
      {seasons.map(s => (
        <View
          key={s.id}
          className="py-3 border-b border-slate-200 dark:border-slate-700 flex-row justify-between items-center">
          <Text>
            {s.name}
            {s.is_active ? ' · active' : ''}
          </Text>
          {!s.is_active ? (
            <Pressable onPress={() => activateSeason(s.id)}>
              <Text style={{color: colors.primary}}>Activate</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <TextInput
        value={seasonName}
        onChangeText={setSeasonName}
        placeholder="New season name"
        placeholderTextColor={colors.text + '66'}
        style={{
          borderWidth: 1,
          borderColor: '#8884',
          borderRadius: 8,
          padding: 10,
          color: colors.text,
          marginTop: 12,
          marginBottom: 8,
        }}
      />
      <Button
        onPress={onCreateSeason}
        disabled={creatingSeason || !seasonName.trim()}>
        <Text className="text-white">
          {creatingSeason ? 'Creating…' : 'Create & activate season'}
        </Text>
      </Button>
    </ScrollView>
  )
}
