import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  useAdminLeague,
  type AdminDivision,
  type AdminSeason,
  type AdminTeam,
  type AdminVenue,
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

export default function AdminLeagueTeams() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const {state} = useLeagueContext()
  const {
    listSeasons,
    getCurrentSeason,
    listTeams,
    listVenues,
    listDivisions,
    saveTeam,
    deleteTeam,
  } = useAdminLeague()

  const [seasons, setSeasons] = React.useState<AdminSeason[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = React.useState<number | null>(
    null,
  )
  const [currentSeasonId, setCurrentSeasonId] = React.useState<number | null>(
    null,
  )
  const [teams, setTeams] = React.useState<AdminTeam[]>([])
  const [venues, setVenues] = React.useState<AdminVenue[]>([])
  const [divisions, setDivisions] = React.useState<AdminDivision[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [editing, setEditing] = React.useState<AdminTeam | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [name, setName] = React.useState('')
  const [shortName, setShortName] = React.useState('')
  const [veryShortName, setVeryShortName] = React.useState('')
  const [venueId, setVenueId] = React.useState<number | null>(null)
  const [divisionId, setDivisionId] = React.useState<number | null>(null)
  const [advantage, setAdvantage] = React.useState('0')
  const [feePaid, setFeePaid] = React.useState(false)
  const [newTeam, setNewTeam] = React.useState(false)
  const [topTeam, setTopTeam] = React.useState(false)

  const inputClass =
    'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-base text-gray-900 dark:text-gray-100'
  const cardClass =
    'mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4'
  const muted = isDark ? '#9CA3AF' : '#6B7280'

  const isReadonly =
    currentSeasonId != null &&
    selectedSeasonId != null &&
    Number(selectedSeasonId) !== Number(currentSeasonId)

  React.useEffect(() => {
    navigation.setOptions({title: t('admin_league_teams')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings' as any)
    }
  }, [router, state.user])

  const loadMeta = React.useCallback(async () => {
    const [seasonsRes, currentRes, venuesRes] = await Promise.all([
      listSeasons(),
      getCurrentSeason(),
      listVenues(),
    ])
    setSeasons(seasonsRes.data)
    setVenues(venuesRes.data)
    const currentId = Number(
      currentRes.data?.id || currentRes.data?.season || 0,
    )
    if (Number.isFinite(currentId) && currentId > 0) {
      setCurrentSeasonId(currentId)
      setSelectedSeasonId(currentId)
    } else if (seasonsRes.data[0]) {
      setSelectedSeasonId(seasonsRes.data[0].id)
    }
  }, [getCurrentSeason, listSeasons, listVenues])

  const loadSeasonData = React.useCallback(async () => {
    if (!selectedSeasonId) {
      setTeams([])
      setDivisions([])
      return
    }
    setError(null)
    const [teamsRes, divRes] = await Promise.all([
      listTeams(selectedSeasonId),
      listDivisions(selectedSeasonId),
    ])
    if (teamsRes.error) setError(t('admin_league_load_failed'))
    setTeams(teamsRes.data)
    setDivisions(
      [...divRes.data].sort(
        (a, b) =>
          (a.sortorder ?? 9999) - (b.sortorder ?? 9999) ||
          a.name.localeCompare(b.name),
      ),
    )
  }, [listDivisions, listTeams, selectedSeasonId, t])

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
    void loadSeasonData()
  }, [loadSeasonData])

  const openCreate = () => {
    if (!selectedSeasonId) {
      setError(t('admin_league_select_season'))
      return
    }
    if (isReadonly) {
      setError(t('admin_league_teams_readonly'))
      return
    }
    setEditing(null)
    setName('')
    setShortName('')
    setVeryShortName('')
    setVenueId(venues[0]?.id ?? null)
    setDivisionId(null)
    setAdvantage('0')
    setFeePaid(false)
    setNewTeam(false)
    setTopTeam(false)
    setShowForm(true)
    setError(null)
    setSuccess(null)
  }

  const openEdit = (row: AdminTeam) => {
    if (isReadonly) {
      setError(t('admin_league_teams_readonly'))
      return
    }
    setEditing(row)
    setName(row.name)
    setShortName(row.short_name || '')
    setVeryShortName(row.very_short_name || '')
    setVenueId(row.venue_id)
    setDivisionId(row.division_id)
    setAdvantage(String(row.advantage ?? 0))
    setFeePaid(Boolean(row.fee_paid))
    setNewTeam(Boolean(row.new_team))
    setTopTeam(Boolean(row.top_team))
    setShowForm(true)
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async () => {
    if (!selectedSeasonId || venueId == null) {
      setError(t('admin_league_venue_required'))
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    const team = {
      name,
      short_name: shortName,
      very_short_name: veryShortName,
      venue_id: venueId,
      division_id: divisionId,
      advantage: Number(advantage) || 0,
      fee_paid: feePaid ? 1 : 0,
      new_team: newTeam ? 1 : 0,
      top_team: topTeam ? 1 : 0,
      line_groupid_team: null,
      logo: null,
      season_id: selectedSeasonId,
    }
    const result = await saveTeam(team, editing?.id)
    if (result.status !== 'ok') {
      setError(result.error || t('admin_league_save_failed'))
    } else {
      setSuccess(
        editing
          ? t('admin_league_team_updated')
          : t('admin_league_team_created'),
      )
      setShowForm(false)
      setEditing(null)
      await loadSeasonData()
    }
    setSubmitting(false)
  }

  const handleDelete = (row: AdminTeam) => {
    if (isReadonly) {
      setError(t('admin_league_teams_readonly'))
      return
    }
    Alert.alert(
      t('admin_league_delete_title'),
      t('admin_league_team_delete_body'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const result = await deleteTeam(row.id)
            if (result.status !== 'ok') {
              setError(result.error || t('admin_league_delete_failed'))
            } else {
              setSuccess(t('admin_league_team_deleted'))
              await loadSeasonData()
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
            await loadSeasonData()
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
            {isReadonly ? (
              <Text className="mb-2 text-xs text-amber-700 dark:text-amber-300">
                {t('admin_league_teams_readonly')}
              </Text>
            ) : null}
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

          <Button disabled={isReadonly} onPress={openCreate}>
            {t('admin_league_add')}
          </Button>

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
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_very_short_name')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={veryShortName}
                onChangeText={setVeryShortName}
                editable={!submitting}
                placeholderTextColor={muted}
              />
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_venue')}
              </Text>
              {venues.map(v => (
                <Pressable
                  key={v.id}
                  onPress={() => setVenueId(v.id)}
                  className={`mb-2 rounded-lg border px-3 py-2 ${
                    venueId === v.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  <Text>{v.name}</Text>
                </Pressable>
              ))}
              <Text className="mb-1 mt-2 text-sm font-medium">
                {t('admin_league_division')}
              </Text>
              <Pressable
                onPress={() => setDivisionId(null)}
                className={`mb-2 rounded-lg border px-3 py-2 ${
                  divisionId == null
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-gray-200 dark:border-gray-700'
                }`}>
                <Text>{t('admin_league_no_division')}</Text>
              </Pressable>
              {divisions.map(d => (
                <Pressable
                  key={d.id}
                  onPress={() => setDivisionId(d.id)}
                  className={`mb-2 rounded-lg border px-3 py-2 ${
                    divisionId === d.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  <Text>{d.name}</Text>
                </Pressable>
              ))}
              <Text className="mb-1 mt-2 text-sm font-medium">
                {t('admin_league_advantage')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={advantage}
                onChangeText={setAdvantage}
                keyboardType="number-pad"
                editable={!submitting}
                placeholderTextColor={muted}
              />
              {(
                [
                  [feePaid, setFeePaid, t('admin_league_fee_paid')],
                  [newTeam, setNewTeam, t('admin_league_new_team')],
                  [topTeam, setTopTeam, t('admin_league_top_team')],
                ] as const
              ).map(([val, setVal, label], i) => (
                <View
                  key={i}
                  className="mb-3 flex-row items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
                  <Text className="text-sm font-medium">{label}</Text>
                  <Switch value={val} onValueChange={setVal} />
                </View>
              ))}
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
              {t('admin_league_teams')} ({teams.length})
            </Text>
            {teams.length === 0 ? (
              <Text className="text-sm text-gray-500">
                {t('admin_league_empty')}
              </Text>
            ) : (
              teams.map(row => (
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
                    {t('admin_league_status')}: {row.status_id}
                    {row.division_id
                      ? ` · div #${row.division_id}`
                      : ` · ${t('admin_league_no_division')}`}
                  </Text>
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Button
                        small
                        disabled={isReadonly}
                        onPress={() => openEdit(row)}>
                        {t('admin_league_edit')}
                      </Button>
                    </View>
                    <View className="flex-1">
                      <Pressable
                        disabled={isReadonly}
                        onPress={() => handleDelete(row)}
                        className="rounded-lg bg-red-600 px-3 py-2 items-center disabled:opacity-50">
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
