import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  useAdminLeague,
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
  Switch,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'

export default function AdminLeagueGameTypes() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const {state} = useLeagueContext()
  const isDarts = state.sport === 'darts'
  const {listGameTypes, saveGameType, deleteGameType} = useAdminLeague()

  const [rows, setRows] = React.useState<AdminGameType[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [editing, setEditing] = React.useState<AdminGameType | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [code, setCode] = React.useState('')
  const [label, setLabel] = React.useState('')
  const [frameTypePrefix, setFrameTypePrefix] = React.useState('')
  const [sortOrder, setSortOrder] = React.useState('0')
  const [showClose, setShowClose] = React.useState(false)
  const [showScore, setShowScore] = React.useState(false)
  const [showWin, setShowWin] = React.useState(false)

  const inputClass =
    'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-base text-gray-900 dark:text-gray-100'
  const cardClass =
    'mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4'
  const muted = isDark ? '#9CA3AF' : '#6B7280'

  React.useEffect(() => {
    navigation.setOptions({title: t('admin_league_game_types')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings' as any)
    }
  }, [router, state.user])

  const load = React.useCallback(async () => {
    setError(null)
    const res = await listGameTypes()
    if (res.error) setError(t('admin_league_load_failed'))
    setRows(res.data)
  }, [listGameTypes, t])

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

  const resetForm = () => {
    setCode('')
    setLabel('')
    setFrameTypePrefix('')
    setSortOrder(String((rows.length + 1) * 10))
    setShowClose(false)
    setShowScore(false)
    setShowWin(false)
  }

  const openCreate = () => {
    setEditing(null)
    resetForm()
    setShowForm(true)
    setError(null)
    setSuccess(null)
  }

  const openEdit = (row: AdminGameType) => {
    setEditing(row)
    setCode(row.code)
    setLabel(row.label)
    setFrameTypePrefix(row.frame_type_prefix || '')
    setSortOrder(String(row.sort_order ?? 0))
    setShowClose(Boolean(row.show_close))
    setShowScore(Boolean(row.show_score))
    setShowWin(Boolean(row.show_win))
    setShowForm(true)
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    const payload = {
      code: code.trim().toLowerCase(),
      label: label.trim(),
      frame_type_prefix: isDarts ? '' : frameTypePrefix.trim().toLowerCase(),
      sort_order: Number(sortOrder) || 0,
      show_close: isDarts ? showClose : false,
      show_score: isDarts ? showScore : false,
      show_win: isDarts ? showWin : false,
    }
    const result = await saveGameType(payload, editing?.id)
    if (result.status !== 'ok') {
      setError(result.error || t('admin_league_save_failed'))
    } else {
      setSuccess(
        editing
          ? t('admin_league_game_type_updated')
          : t('admin_league_game_type_created'),
      )
      setShowForm(false)
      setEditing(null)
      await load()
    }
    setSubmitting(false)
  }

  const handleDelete = (row: AdminGameType) => {
    Alert.alert(
      t('admin_league_delete_title'),
      t('admin_league_game_type_delete_body'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const result = await deleteGameType(row.id)
            if (result.status !== 'ok') {
              setError(result.error || t('admin_league_delete_failed'))
            } else {
              setSuccess(t('admin_league_game_type_deleted'))
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
                {editing
                  ? t('admin_league_edit')
                  : t('admin_league_add')}
              </Text>
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_code')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={code}
                onChangeText={setCode}
                editable={!submitting && !(editing && (editing.usage_count ?? 0) > 0)}
                placeholderTextColor={muted}
                autoCapitalize="none"
              />
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_label')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={label}
                onChangeText={setLabel}
                editable={!submitting}
                placeholderTextColor={muted}
              />
              {!isDarts ? (
                <>
                  <Text className="mb-1 text-sm font-medium">
                    {t('admin_league_frame_prefix')}
                  </Text>
                  <TextInput
                    className={`${inputClass} mb-3`}
                    value={frameTypePrefix}
                    onChangeText={setFrameTypePrefix}
                    editable={!submitting}
                    placeholderTextColor={muted}
                    autoCapitalize="none"
                  />
                </>
              ) : null}
              <Text className="mb-1 text-sm font-medium">
                {t('admin_league_sort_order')}
              </Text>
              <TextInput
                className={`${inputClass} mb-3`}
                value={sortOrder}
                onChangeText={setSortOrder}
                keyboardType="number-pad"
                editable={!submitting}
                placeholderTextColor={muted}
              />
              {isDarts ? (
                <>
                  {(
                    [
                      [showClose, setShowClose, t('admin_league_show_close')],
                      [showScore, setShowScore, t('admin_league_show_score')],
                      [showWin, setShowWin, t('admin_league_show_win')],
                    ] as const
                  ).map(([val, setVal, labelText], i) => (
                    <View
                      key={i}
                      className="mb-3 flex-row items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
                      <Text className="text-sm font-medium">{labelText}</Text>
                      <Switch value={val} onValueChange={setVal} />
                    </View>
                  ))}
                </>
              ) : null}
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    disabled={submitting || !code.trim() || !label.trim()}
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
              {t('admin_league_game_types')} ({rows.length})
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
                    {row.label}{' '}
                    <Text className="font-normal text-gray-500">
                      ({row.code})
                    </Text>
                  </Text>
                  <Text className="mb-2 text-xs text-gray-500">
                    {t('admin_league_sort_order')}: {row.sort_order}
                    {row.usage_count
                      ? ` · ${t('admin_league_usage', {n: row.usage_count})}`
                      : ''}
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
