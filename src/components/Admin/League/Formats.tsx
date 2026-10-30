import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  useAdminLeague,
  type AdminLeagueGameTypeOption,
  type AdminMatchFormat,
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

const DEFAULT_FORMAT_JSON = '[]'

export default function AdminLeagueFormats() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const {state} = useLeagueContext()
  const {
    listMatchFormats,
    listLeagueGameTypes,
    saveMatchFormat,
    deleteMatchFormat,
  } = useAdminLeague()

  const [rows, setRows] = React.useState<AdminMatchFormat[]>([])
  const [gameTypes, setGameTypes] = React.useState<
    AdminLeagueGameTypeOption[]
  >([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [editing, setEditing] = React.useState<AdminMatchFormat | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [name, setName] = React.useState('')
  const [gameType, setGameType] = React.useState('')
  const [formatJson, setFormatJson] = React.useState(DEFAULT_FORMAT_JSON)
  const [pointsPerWin, setPointsPerWin] = React.useState('2')
  const [pointsPerTie, setPointsPerTie] = React.useState('1')
  const [pointsPerLoss, setPointsPerLoss] = React.useState('0')

  const inputClass =
    'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-base text-gray-900 dark:text-gray-100'
  const cardClass =
    'mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4'
  const muted = isDark ? '#9CA3AF' : '#6B7280'

  React.useEffect(() => {
    navigation.setOptions({title: t('admin_league_formats')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings' as any)
    }
  }, [router, state.user])

  const load = React.useCallback(async () => {
    setError(null)
    const [fm, gt] = await Promise.all([
      listMatchFormats(),
      listLeagueGameTypes(),
    ])
    if (fm.error) setError(t('admin_league_load_failed'))
    setRows(fm.data)
    setGameTypes(gt.data)
  }, [listLeagueGameTypes, listMatchFormats, t])

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

  const defaultGameTypeCode =
    gameTypes[0]?.code ?? (state.sport === 'darts' ? 'dar' : '8b')

  const openCreate = () => {
    setEditing(null)
    setName('')
    setGameType(defaultGameTypeCode)
    setFormatJson(DEFAULT_FORMAT_JSON)
    setPointsPerWin('2')
    setPointsPerTie('1')
    setPointsPerLoss('0')
    setShowForm(true)
    setError(null)
    setSuccess(null)
  }

  const openEdit = (row: AdminMatchFormat) => {
    setEditing(row)
    setName(row.name)
    setGameType(row.game_type)
    setFormatJson(row.format || DEFAULT_FORMAT_JSON)
    setPointsPerWin(String(row.points_per_win ?? 2))
    setPointsPerTie(String(row.points_per_tie ?? 1))
    setPointsPerLoss(String(row.points_per_loss ?? 0))
    setShowForm(true)
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async () => {
    try {
      JSON.parse(formatJson)
    } catch {
      setError(t('admin_league_format_invalid_json'))
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    const payload = {
      name: name.trim(),
      game_type: (gameType || defaultGameTypeCode).trim(),
      format: formatJson,
      points_per_win: Number(pointsPerWin) || 0,
      points_per_tie: Number(pointsPerTie) || 0,
      points_per_loss: Number(pointsPerLoss) || 0,
    }
    const result = await saveMatchFormat(payload, editing?.id)
    if (result.status !== 'ok') {
      setError(result.error || t('admin_league_save_failed'))
    } else {
      setSuccess(
        editing
          ? t('admin_league_format_updated')
          : t('admin_league_format_created'),
      )
      setShowForm(false)
      setEditing(null)
      await load()
    }
    setSubmitting(false)
  }

  const handleDelete = (row: AdminMatchFormat) => {
    Alert.alert(
      t('admin_league_delete_title'),
      t('admin_league_format_delete_body'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const result = await deleteMatchFormat(row.id)
            if (result.status !== 'ok') {
              setError(result.error || t('admin_league_delete_failed'))
            } else {
              setSuccess(t('admin_league_format_deleted'))
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
          <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {t('admin_league_formats_help')}
          </Text>
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
                {t('admin_league_game_type')}
              </Text>
              {(gameTypes.length
                ? gameTypes
                : [{code: defaultGameTypeCode, label: defaultGameTypeCode}]
              ).map(gt => (
                <Pressable
                  key={gt.code}
                  onPress={() => setGameType(gt.code)}
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
                {t('admin_league_format_json')}
              </Text>
              <Text className="mb-1 text-xs text-gray-500">
                {t('admin_league_format_json_help')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3 min-h-[160px] font-mono text-sm`}
                value={formatJson}
                onChangeText={setFormatJson}
                editable={!submitting}
                multiline
                textAlignVertical="top"
                autoCapitalize="none"
                placeholderTextColor={muted}
              />
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_points_win')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={pointsPerWin}
                onChangeText={setPointsPerWin}
                keyboardType="decimal-pad"
                editable={!submitting}
                placeholderTextColor={muted}
              />
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_points_tie')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={pointsPerTie}
                onChangeText={setPointsPerTie}
                keyboardType="decimal-pad"
                editable={!submitting}
                placeholderTextColor={muted}
              />
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_points_loss')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={pointsPerLoss}
                onChangeText={setPointsPerLoss}
                keyboardType="decimal-pad"
                editable={!submitting}
                placeholderTextColor={muted}
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
              {t('admin_league_formats')} ({rows.length})
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
                  <Text className="font-medium">{row.name}</Text>
                  <Text className="mb-2 text-xs text-gray-500">
                    {row.game_type} · W{row.points_per_win}/T
                    {row.points_per_tie}/L{row.points_per_loss}
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
