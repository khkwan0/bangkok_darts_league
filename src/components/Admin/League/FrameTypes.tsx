import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  useAdminLeague,
  type AdminFrameType,
  type AdminGameType,
} from '@/hooks/useAdminLeague'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {useFocusEffect, useNavigation, useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'

export default function AdminLeagueFrameTypes() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const {state} = useLeagueContext()
  const {listFrameTypes, listGameTypes, saveFrameType, deleteFrameType} =
    useAdminLeague()

  const [rows, setRows] = React.useState<AdminFrameType[]>([])
  const [gameTypes, setGameTypes] = React.useState<AdminGameType[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [editing, setEditing] = React.useState<AdminFrameType | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [name, setName] = React.useState('')
  const [shortName, setShortName] = React.useState('')
  const [altName, setAltName] = React.useState('')
  const [noPlayers, setNoPlayers] = React.useState('1')
  const [maxPlayers, setMaxPlayers] = React.useState('1')
  const [defaultGames, setDefaultGames] = React.useState('1')
  const [gameTypeId, setGameTypeId] = React.useState<number | null>(null)

  const inputClass =
    'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-base text-gray-900 dark:text-gray-100'
  const cardClass =
    'mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4'
  const muted = isDark ? '#9CA3AF' : '#6B7280'

  React.useEffect(() => {
    navigation.setOptions({title: t('admin_league_frame_types')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings' as any)
    }
  }, [router, state.user])

  const load = React.useCallback(async () => {
    setError(null)
    const [ft, gt] = await Promise.all([listFrameTypes(), listGameTypes()])
    if (ft.error || gt.error) setError(t('admin_league_load_failed'))
    setRows(ft.data)
    setGameTypes(gt.data)
    setGameTypeId(prev => prev ?? gt.data[0]?.id ?? null)
  }, [listFrameTypes, listGameTypes, t])

  useFocusEffect(
    React.useCallback(() => {
      let active = true
      ;(async () => {
        setLoading(true)
        await load()
        if (active) setLoading(false)
      })()
      return () => {
        active = false
      }
    }, [load]),
  )

  const openCreate = () => {
    setEditing(null)
    setName('')
    setShortName('')
    setAltName('')
    setNoPlayers('1')
    setMaxPlayers('1')
    setDefaultGames('1')
    setGameTypeId(gameTypes[0]?.id ?? null)
    setShowForm(true)
    setError(null)
    setSuccess(null)
  }

  const openEdit = (row: AdminFrameType) => {
    setEditing(row)
    setName(row.name)
    setShortName(row.short_name)
    setAltName(row.alt_name || '')
    setNoPlayers(String(row.no_players ?? 1))
    setMaxPlayers(String(row.max_players ?? row.no_players ?? 1))
    setDefaultGames(String(row.default_games ?? 1))
    setGameTypeId(row.game_type_id)
    setShowForm(true)
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async () => {
    if (gameTypeId == null) {
      setError(t('admin_league_game_type_required'))
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    const payload = {
      name,
      short_name: shortName,
      alt_name: altName,
      no_players: Number(noPlayers) || 1,
      max_players: Number(maxPlayers) || 1,
      default_games: Number(defaultGames) || 1,
      default_series_mode: 'best_of' as const,
      track_tons: false,
      track_heavy_tons: false,
      track_closes: false,
      track_board_score: false,
      track_stats: false,
      game_type_id: gameTypeId,
    }
    const result = await saveFrameType(payload, editing?.id)
    if (result.status !== 'ok') {
      setError(result.error || t('admin_league_save_failed'))
    } else {
      setSuccess(
        editing
          ? t('admin_league_frame_type_updated')
          : t('admin_league_frame_type_created'),
      )
      setShowForm(false)
      setEditing(null)
      await load()
    }
    setSubmitting(false)
  }

  const handleDelete = (row: AdminFrameType) => {
    Alert.alert(
      t('admin_league_delete_title'),
      t('admin_league_frame_type_delete_body'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const result = await deleteFrameType(row.id)
            if (result.status !== 'ok') {
              setError(result.error || t('admin_league_delete_failed'))
            } else {
              setSuccess(t('admin_league_frame_type_deleted'))
              await load()
            }
          },
        },
      ],
    )
  }

  if (!isLeagueAdmin(state.user)) return null

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="p-4 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true)
            await load()
            setRefreshing(false)
          }}
        />
      }
      keyboardShouldPersistTaps="handled">
      {error ? (
        <View className="mb-3 rounded-lg bg-red-50 dark:bg-red-950/40 p-3">
          <Text className="text-sm text-red-800 dark:text-red-300">{error}</Text>
        </View>
      ) : null}
      {success ? (
        <View className="mb-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3">
          <Text className="text-sm text-emerald-800 dark:text-emerald-300">
            {success}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View className="items-center py-10">
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <Button onPress={openCreate}>{t('admin_league_add')}</Button>

          {showForm ? (
            <View className={`${cardClass} mt-4`}>
              <Text className="mb-3 text-lg font-semibold">
                {editing ? t('admin_league_edit') : t('admin_league_add')}
              </Text>
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_name')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={name}
                onChangeText={setName}
                editable={!submitting}
                placeholderTextColor={muted}
              />
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_short_name')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={shortName}
                onChangeText={setShortName}
                editable={
                  !submitting && !(editing && (editing.usage_count ?? 0) > 0)
                }
                placeholderTextColor={muted}
              />
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_alt_name')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={altName}
                onChangeText={setAltName}
                editable={!submitting}
                placeholderTextColor={muted}
              />
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_no_players')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={noPlayers}
                onChangeText={setNoPlayers}
                keyboardType="number-pad"
                editable={!submitting}
                placeholderTextColor={muted}
              />
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_max_players')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={maxPlayers}
                onChangeText={setMaxPlayers}
                keyboardType="number-pad"
                editable={!submitting}
                placeholderTextColor={muted}
              />
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_default_games')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={defaultGames}
                onChangeText={setDefaultGames}
                keyboardType="number-pad"
                editable={!submitting}
                placeholderTextColor={muted}
              />
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_game_type')}
              </Text>
              {gameTypes.map(gt => (
                <Pressable
                  key={gt.id}
                  onPress={() => setGameTypeId(gt.id)}
                  className={`mb-2 rounded-lg border px-3 py-2 ${
                    gameTypeId === gt.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  <Text>
                    {gt.label} ({gt.code})
                  </Text>
                </Pressable>
              ))}
              <View className="mt-2 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    disabled={submitting || !name.trim() || !shortName.trim()}
                    onPress={() => void handleSubmit()}>
                    {submitting
                      ? t('admin_league_working')
                      : t('admin_league_save')}
                  </Button>
                </View>
                <View className="flex-1">
                  <Pressable
                    onPress={() => {
                      setShowForm(false)
                      setEditing(null)
                    }}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-3 items-center">
                    <Text className="font-medium">{t('cancel')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          <View className={`${cardClass} mt-4`}>
            <Text className="mb-3 text-lg font-semibold">
              {t('admin_league_frame_types')} ({rows.length})
            </Text>
            {rows.length === 0 ? (
              <Text className="text-sm text-gray-500">
                {t('admin_league_empty')}
              </Text>
            ) : (
              rows.map(row => (
                <View
                  key={row.id}
                  className="mb-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                  <Text className="font-medium">
                    {row.name}{' '}
                    <Text className="font-normal text-gray-500">
                      ({row.short_name})
                    </Text>
                  </Text>
                  <View className="mt-2 flex-row gap-2">
                    <View className="flex-1">
                      <Button small onPress={() => openEdit(row)}>
                        {t('admin_league_edit')}
                      </Button>
                    </View>
                    <View className="flex-1">
                      <Pressable
                        onPress={() => handleDelete(row)}
                        className="rounded-lg bg-red-600 px-3 py-2 items-center">
                        <Text className="text-white text-sm font-medium">
                          {t('delete')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  )
}
