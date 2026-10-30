import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  useAdminLeague,
  type AdminSeason,
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

function seasonNumber(season: AdminSeason | null | undefined): number {
  return Number(season?.identifier || season?.id || 0) || 0
}

export default function AdminLeagueSeasons() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const {state} = useLeagueContext()
  const {listSeasons, createSeason, activateSeason, undoSeason} =
    useAdminLeague()

  const [seasons, setSeasons] = React.useState<AdminSeason[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const [seasonName, setSeasonName] = React.useState('')
  const [identifier, setIdentifier] = React.useState('')
  const [creating, setCreating] = React.useState(false)

  const [activateId, setActivateId] = React.useState<number | null>(null)
  const [activating, setActivating] = React.useState(false)

  const [undoId, setUndoId] = React.useState<number | null>(null)
  const [undoing, setUndoing] = React.useState(false)

  const inputClass =
    'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-base text-gray-900 dark:text-gray-100'
  const cardClass =
    'mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4'
  const muted = isDark ? '#9CA3AF' : '#6B7280'

  React.useEffect(() => {
    navigation.setOptions({title: t('admin_league_seasons')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings' as any)
    }
  }, [router, state.user])

  const load = React.useCallback(async () => {
    setError(null)
    const res = await listSeasons()
    if (res.error) setError(t('admin_league_load_failed'))
    const list = res.data
    setSeasons(list)
    const active = list.find(s => s.status_id === 1)
    if (active) setActivateId(active.id)
    const latest = list.reduce<AdminSeason | null>((max, s) => {
      if (!max || seasonNumber(s) > seasonNumber(max)) return s
      return max
    }, null)
    if (latest) {
      setIdentifier(String(seasonNumber(latest) + 1))
    } else {
      setIdentifier('')
    }
  }, [listSeasons, t])

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

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const activeSeason = seasons.find(s => s.status_id === 1) || null

  const handleCreate = async () => {
    if (!seasonName.trim()) return
    setCreating(true)
    setError(null)
    setSuccess(null)
    const idNum = identifier.trim() ? Number(identifier) : undefined
    const result = await createSeason({
      name: seasonName.trim(),
      identifier:
        idNum != null && Number.isFinite(idNum) ? idNum : undefined,
    })
    if (result.status !== 'ok') {
      setError(result.error || t('admin_league_season_create_failed'))
    } else {
      setSuccess(
        result.activated
          ? t('admin_league_season_create_activated')
          : t('admin_league_season_create_ok', {
              divisions: result.divisionsMigrated || 0,
              teams: result.teamsMigrated || 0,
            }),
      )
      setSeasonName('')
      await load()
    }
    setCreating(false)
  }

  const handleActivate = async () => {
    if (activateId == null) return
    if (activateId === activeSeason?.id) {
      setError(t('admin_league_season_already_active'))
      return
    }
    setActivating(true)
    setError(null)
    setSuccess(null)
    const result = await activateSeason(activateId)
    if (result.status !== 'ok') {
      setError(result.error || t('admin_league_season_activate_failed'))
    } else {
      setSuccess(t('admin_league_season_activate_ok'))
      await load()
    }
    setActivating(false)
  }

  const confirmUndo = () => {
    if (undoId == null) return
    const selected = seasons.find(s => s.id === undoId)
    if (!selected || selected.status_id === 1) {
      setError(t('admin_league_season_undo_active'))
      return
    }
    Alert.alert(
      t('admin_league_season_undo_title'),
      t('admin_league_season_undo_body', {
        name: selected.name || `Season ${selected.identifier}`,
      }),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('admin_league_season_undo'),
          style: 'destructive',
          onPress: async () => {
            setUndoing(true)
            setError(null)
            setSuccess(null)
            const result = await undoSeason(undoId)
            if (result.status !== 'ok') {
              setError(result.error || t('admin_league_season_undo_failed'))
            } else {
              setSuccess(
                t('admin_league_season_undo_ok', {
                  teams: result.teamsDeleted || 0,
                  divisions: result.divisionsDeleted || 0,
                }),
              )
              setUndoId(null)
              await load()
            }
            setUndoing(false)
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
          <View className={cardClass}>
            <Text className="mb-1 text-lg font-semibold">
              {t('admin_league_season_create')}
            </Text>
            <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {t('admin_league_season_create_help')}
            </Text>
            {activeSeason ? (
              <Text className="mb-3 text-sm text-gray-500">
                {t('admin_league_season_current')}: {activeSeason.name} (#
                {activeSeason.identifier})
              </Text>
            ) : null}
            <Text className="mb-1 text-sm font-medium">
              {t('admin_league_season_name')}
            </Text>
            <TextInput
              className={`${inputClass} mb-3`}
              value={seasonName}
              onChangeText={setSeasonName}
              placeholderTextColor={muted}
              editable={!creating}
            />
            <Text className="mb-1 text-sm font-medium">
              {t('admin_league_season_identifier')}
            </Text>
            <TextInput
              className={`${inputClass} mb-3`}
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType="number-pad"
              placeholderTextColor={muted}
              editable={!creating}
            />
            <Button
              disabled={creating || !seasonName.trim()}
              onPress={() => void handleCreate()}>
              {creating
                ? t('admin_league_working')
                : t('admin_league_season_create')}
            </Button>
          </View>

          <View className={cardClass}>
            <Text className="mb-1 text-lg font-semibold">
              {t('admin_league_season_activate')}
            </Text>
            <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {t('admin_league_season_activate_help')}
            </Text>
            {seasons.map(s => {
              const selected = activateId === s.id
              return (
                <Pressable
                  key={`a-${s.id}`}
                  onPress={() => setActivateId(s.id)}
                  className={`mb-2 rounded-lg border px-3 py-2.5 ${
                    selected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  <Text className="font-medium">
                    {s.name || `Season ${s.identifier}`}
                    {s.status_id === 1
                      ? ` (${t('admin_league_season_active')})`
                      : ''}
                  </Text>
                </Pressable>
              )
            })}
            <Button
              disabled={
                activating ||
                activateId == null ||
                activateId === activeSeason?.id
              }
              onPress={() => void handleActivate()}>
              {activating
                ? t('admin_league_working')
                : t('admin_league_season_activate')}
            </Button>
          </View>

          <View className={cardClass}>
            <Text className="mb-1 text-lg font-semibold">
              {t('admin_league_season_undo')}
            </Text>
            <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {t('admin_league_season_undo_help')}
            </Text>
            {seasons.map(s => {
              const selected = undoId === s.id
              const disabled = s.status_id === 1
              return (
                <Pressable
                  key={`u-${s.id}`}
                  disabled={disabled}
                  onPress={() => setUndoId(s.id)}
                  className={`mb-2 rounded-lg border px-3 py-2.5 ${
                    disabled ? 'opacity-50' : ''
                  } ${
                    selected
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/40'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  <Text className="font-medium">
                    {s.name || `Season ${s.identifier}`}
                    {disabled
                      ? ` (${t('admin_league_season_active')})`
                      : ''}
                  </Text>
                </Pressable>
              )
            })}
            <Pressable
              disabled={undoing || undoId == null}
              onPress={confirmUndo}
              className="rounded-lg bg-red-600 px-4 py-3 items-center disabled:opacity-50">
              <Text className="text-white font-medium">
                {undoing
                  ? t('admin_league_working')
                  : t('admin_league_season_undo')}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  )
}
