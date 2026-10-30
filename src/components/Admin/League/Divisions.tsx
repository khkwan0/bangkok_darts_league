import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  useAdminLeague,
  type AdminDivision,
  type AdminLeagueGameTypeOption,
  type AdminMatchFormat,
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
  Switch,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'

const DAYS = [
  {id: 1, label: 'Mon'},
  {id: 2, label: 'Tue'},
  {id: 3, label: 'Wed'},
  {id: 4, label: 'Thu'},
  {id: 5, label: 'Fri'},
  {id: 6, label: 'Sat'},
  {id: 7, label: 'Sun'},
]

export default function AdminLeagueDivisions() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const {state} = useLeagueContext()
  const isDarts = state.sport === 'darts'
  const {
    listSeasons,
    getCurrentSeason,
    listDivisions,
    listMatchFormats,
    listLeagueGameTypes,
    saveDivision,
    deleteDivision,
  } = useAdminLeague()

  const [seasons, setSeasons] = React.useState<AdminSeason[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = React.useState<number | null>(
    null,
  )
  const [divisions, setDivisions] = React.useState<AdminDivision[]>([])
  const [formats, setFormats] = React.useState<AdminMatchFormat[]>([])
  const [gameTypes, setGameTypes] = React.useState<
    AdminLeagueGameTypeOption[]
  >([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [editing, setEditing] = React.useState<AdminDivision | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [name, setName] = React.useState('')
  const [shortName, setShortName] = React.useState('')
  const [gameType, setGameType] = React.useState('8b')
  const [formatId, setFormatId] = React.useState<number | null>(null)
  const [dayId, setDayId] = React.useState(1)
  const [starttime, setStarttime] = React.useState('')
  const [sortorder, setSortorder] = React.useState('0')
  const [handicapped, setHandicapped] = React.useState(false)
  const [primaryRanking, setPrimaryRanking] = React.useState('points')
  const [secondaryRanking, setSecondaryRanking] = React.useState('frames')

  const inputClass =
    'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-base text-gray-900 dark:text-gray-100'
  const cardClass =
    'mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4'
  const muted = isDark ? '#9CA3AF' : '#6B7280'
  const defaultGameTypeCode = gameTypes[0]?.code ?? '8b'

  React.useEffect(() => {
    navigation.setOptions({title: t('admin_league_divisions')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings' as any)
    }
  }, [router, state.user])

  const loadMeta = React.useCallback(async () => {
    const [seasonsRes, currentRes, formatsRes, gtRes] = await Promise.all([
      listSeasons(),
      getCurrentSeason(),
      listMatchFormats(),
      listLeagueGameTypes(),
    ])
    setSeasons(seasonsRes.data)
    setFormats(formatsRes.data)
    setGameTypes(gtRes.data)
    const currentId = Number(
      currentRes.data?.id || currentRes.data?.season || 0,
    )
    if (Number.isFinite(currentId) && currentId > 0) {
      setSelectedSeasonId(currentId)
    } else if (seasonsRes.data[0]) {
      setSelectedSeasonId(seasonsRes.data[0].id)
    }
  }, [getCurrentSeason, listLeagueGameTypes, listMatchFormats, listSeasons])

  const loadDivisions = React.useCallback(async () => {
    if (!selectedSeasonId) {
      setDivisions([])
      return
    }
    setError(null)
    const res = await listDivisions(selectedSeasonId)
    if (res.error) setError(t('admin_league_load_failed'))
    setDivisions(res.data)
  }, [listDivisions, selectedSeasonId, t])

  useFocusEffect(
    React.useCallback(() => {
      let active = true
      ;(async () => {
        setLoading(true)
        await loadMeta()
        if (active) setLoading(false)
      })()
      return () => {
        active = false
      }
    }, [loadMeta]),
  )

  React.useEffect(() => {
    void loadDivisions()
  }, [loadDivisions])

  const formatsForGameType = (gt: string) =>
    isDarts
      ? formats
      : formats.filter(row => row.game_type.trim() === String(gt).trim())

  const openCreate = () => {
    if (!selectedSeasonId) {
      setError(t('admin_league_select_season'))
      return
    }
    const gt = isDarts ? 'dar' : defaultGameTypeCode
    setEditing(null)
    setName('')
    setShortName('')
    setGameType(gt)
    setFormatId(isDarts ? null : formatsForGameType(gt)[0]?.id ?? null)
    setDayId(1)
    setStarttime('')
    setSortorder('0')
    setHandicapped(false)
    setPrimaryRanking('points')
    setSecondaryRanking('frames')
    setShowForm(true)
    setError(null)
    setSuccess(null)
  }

  const openEdit = (row: AdminDivision) => {
    setEditing(row)
    setName(row.name)
    setShortName(row.short_name)
    setGameType(String(row.game_type ?? '8b').trim())
    setFormatId(row.format_id)
    setDayId(row.day_id || 1)
    setStarttime(row.starttime || '')
    setSortorder(String(row.sortorder ?? 0))
    setHandicapped(Boolean(row.handicapped))
    setPrimaryRanking(row.primary_ranking || 'points')
    setSecondaryRanking(row.secondary_ranking || 'frames')
    setShowForm(true)
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async () => {
    if (!formatId && !isDarts) {
      setError(t('admin_league_format_required'))
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    const division = {
      name,
      short_name: shortName,
      game_type: isDarts ? 'dar' : gameType,
      league_id: 0,
      handicapped: handicapped ? 1 : 0,
      handicap_difference: 0,
      primary_ranking: primaryRanking,
      secondary_ranking: secondaryRanking,
      format_id: isDarts ? null : formatId,
      description: null,
      sortorder: Number(sortorder) || 0,
      starttime,
      day_id: dayId,
      ...(editing ? {} : {season_id: selectedSeasonId}),
    }
    const result = await saveDivision(division, editing?.id)
    if (result.status !== 'ok') {
      setError(result.error || t('admin_league_save_failed'))
    } else {
      setSuccess(
        editing
          ? t('admin_league_division_updated')
          : t('admin_league_division_created'),
      )
      setShowForm(false)
      setEditing(null)
      await loadDivisions()
    }
    setSubmitting(false)
  }

  const handleDelete = (row: AdminDivision) => {
    Alert.alert(
      t('admin_league_delete_title'),
      t('admin_league_division_delete_body'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const result = await deleteDivision(row.id)
            if (result.status !== 'ok') {
              setError(result.error || t('admin_league_delete_failed'))
            } else {
              setSuccess(t('admin_league_division_deleted'))
              await loadDivisions()
            }
          },
        },
      ],
    )
  }

  if (!isLeagueAdmin(state.user)) return null

  const filteredFormats = formatsForGameType(gameType)

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="p-4 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true)
            await loadDivisions()
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
          <View className={cardClass}>
            <Text className="mb-2 text-sm font-medium">
              {t('admin_league_season')}
            </Text>
            {seasons.map(s => (
              <Pressable
                key={s.id}
                onPress={() => setSelectedSeasonId(s.id)}
                className={`mb-2 rounded-lg border px-3 py-2 ${
                  selectedSeasonId === s.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-gray-200 dark:border-gray-700'
                }`}>
                <Text>
                  {s.name || `Season ${s.identifier}`}
                  {s.status_id === 1
                    ? ` (${t('admin_league_season_active')})`
                    : ''}
                </Text>
              </Pressable>
            ))}
          </View>

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
                editable={!submitting}
                placeholderTextColor={muted}
              />
              {!isDarts ? (
                <>
                  <Text className="mb-1 text-sm font-medium">
                    {t('admin_league_game_type')}
                  </Text>
                  {(gameTypes.length
                    ? gameTypes
                    : [{code: defaultGameTypeCode, label: defaultGameTypeCode}]
                  ).map(gt => (
                    <Pressable
                      key={gt.code}
                      onPress={() => {
                        setGameType(gt.code)
                        setFormatId(
                          formatsForGameType(gt.code)[0]?.id ?? null,
                        )
                      }}
                      className={`mb-2 rounded-lg border px-3 py-2 ${
                        gameType === gt.code
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}>
                      <Text>
                        {gt.label} ({gt.code})
                      </Text>
                    </Pressable>
                  ))}
                  <Text className="mb-1 mt-2 text-sm font-medium">
                    {t('admin_league_format')}
                  </Text>
                  {filteredFormats.length === 0 ? (
                    <Text className="mb-3 text-sm text-gray-500">
                      {t('admin_league_no_formats')}
                    </Text>
                  ) : (
                    filteredFormats.map(f => (
                      <Pressable
                        key={f.id}
                        onPress={() => setFormatId(f.id)}
                        className={`mb-2 rounded-lg border px-3 py-2 ${
                          formatId === f.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}>
                        <Text>{f.name}</Text>
                      </Pressable>
                    ))
                  )}
                </>
              ) : null}
              <Text className="mb-1 mt-2 text-sm font-medium">
                {t('admin_league_day')}
              </Text>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {DAYS.map(d => (
                  <Pressable
                    key={d.id}
                    onPress={() => setDayId(d.id)}
                    className={`rounded-lg border px-3 py-1.5 ${
                      dayId === d.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}>
                    <Text className="text-xs">{d.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_starttime')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={starttime}
                onChangeText={setStarttime}
                placeholder="19:00"
                editable={!submitting}
                placeholderTextColor={muted}
              />
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_sort_order')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={sortorder}
                onChangeText={setSortorder}
                keyboardType="number-pad"
                editable={!submitting}
                placeholderTextColor={muted}
              />
              <View className="mb-3 flex-row items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
                <Text className="text-sm font-medium">
                  {t('admin_league_handicapped')}
                </Text>
                <Switch value={handicapped} onValueChange={setHandicapped} />
              </View>
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_primary_ranking')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={primaryRanking}
                onChangeText={setPrimaryRanking}
                editable={!submitting}
                placeholderTextColor={muted}
                autoCapitalize="none"
              />
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_secondary_ranking')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={secondaryRanking}
                onChangeText={setSecondaryRanking}
                editable={!submitting}
                placeholderTextColor={muted}
                autoCapitalize="none"
              />
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    disabled={submitting || !name.trim()}
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
              {t('admin_league_divisions')} ({divisions.length})
            </Text>
            {divisions.length === 0 ? (
              <Text className="text-sm text-gray-500">
                {t('admin_league_empty')}
              </Text>
            ) : (
              divisions.map(row => (
                <View
                  key={row.id}
                  className="mb-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                  <Text className="font-medium">
                    {row.name}{' '}
                    <Text className="font-normal text-gray-500">
                      ({row.short_name})
                    </Text>
                  </Text>
                  <Text className="mb-2 text-xs text-gray-500">
                    {row.game_type}
                    {row.format_name ? ` · ${row.format_name}` : ''}
                  </Text>
                  <View className="flex-row gap-2">
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
