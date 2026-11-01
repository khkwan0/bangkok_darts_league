import ScanPlayerQr from '@/components/Teams/ScanPlayerQr'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView} from '@/components/ThemedView'
import Button from '@/components/Button'
import {
  usePlayerClaim,
  type ClaimableShell,
  type ClaimRequest,
} from '@/hooks/usePlayerClaim'
import {MaterialCommunityIcons} from '@expo/vector-icons'
import {useNavigation} from 'expo-router/react-navigation'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  TextInput,
  View,
} from 'react-native'

type Mode = 'search' | 'scan' | 'confirm' | 'mine'

function statusLabel(
  status: number,
  t: (k: string) => string,
): string {
  if (status === 0) return t('claim_status_pending')
  if (status === 1) return t('claim_status_approved')
  if (status === 2) return t('claim_status_denied')
  if (status === 3) return t('claim_status_cancelled')
  return String(status)
}

export default function ClaimProfileFlow() {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const navigation = useNavigation()
  const {
    search: searchShells,
    preview,
    create,
    listMine,
    cancel,
  } = usePlayerClaim()

  const [mode, setMode] = React.useState<Mode>('search')
  const [query, setQuery] = React.useState('')
  const [searching, setSearching] = React.useState(false)
  const [results, setResults] = React.useState<ClaimableShell[]>([])
  const [selected, setSelected] = React.useState<ClaimableShell | null>(null)
  const [needsAdmin, setNeedsAdmin] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [mine, setMine] = React.useState<ClaimRequest[]>([])
  const [loadingMine, setLoadingMine] = React.useState(false)

  React.useEffect(() => {
    navigation.setOptions({title: t('claim_existing_player')})
  }, [navigation, t])

  const runSearch = React.useCallback(
    async (q: string) => {
      const trimmed = q.trim()
      if (trimmed.length < 2) {
        setResults([])
        return
      }
      setSearching(true)
      try {
        const res = await searchShells(trimmed)
        setResults(res.data)
      } finally {
        setSearching(false)
      }
    },
    [searchShells],
  )

  React.useEffect(() => {
    const handle = setTimeout(() => {
      if (mode === 'search') void runSearch(query)
    }, 350)
    return () => clearTimeout(handle)
  }, [query, mode, runSearch])

  async function openConfirm(shellId: number) {
    setSubmitting(true)
    try {
      const res = await preview(shellId)
      if (res.error || !res.data) {
        Alert.alert(t('error'), t(`claim_error_${res.error}`) || t('claim_error_not_claimable'))
        return
      }
      setSelected(res.data.shell)
      setNeedsAdmin(Boolean(res.data.needs_admin))
      setMode('confirm')
    } finally {
      setSubmitting(false)
    }
  }

  const loadMine = React.useCallback(async () => {
    setLoadingMine(true)
    try {
      const res = await listMine()
      setMine(res.data)
    } finally {
      setLoadingMine(false)
    }
  }, [listMine])

  async function submitClaim() {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await create(selected.id)
      if (res.error) {
        Alert.alert(t('error'), t(`claim_error_${res.error}`) || res.error)
        return
      }
      Alert.alert(t('claim_submitted_title'), t('claim_submitted_body'))
      setMode('mine')
      await loadMine()
    } finally {
      setSubmitting(false)
    }
  }

  React.useEffect(() => {
    if (mode === 'mine') void loadMine()
  }, [mode, loadMine])

  async function cancelRequest(id: number) {
    const res = await cancel(id)
    if (res.status !== 'ok') {
      Alert.alert(t('error'), res.error || t('error'))
      return
    }
    await loadMine()
  }

  if (mode === 'scan') {
    return (
      <ThemedView className="flex-1">
        <ScanPlayerQr
          onConfirm={async player => {
            await openConfirm(player.id)
          }}
        />
        <View className="p-4">
          <Button onPress={() => setMode('search')}>{t('back')}</Button>
        </View>
      </ThemedView>
    )
  }

  if (mode === 'confirm' && selected) {
    return (
      <ThemedView className="flex-1 p-4">
        <Text className="text-xl font-semibold mb-2">{selected.nickname}</Text>
        {(selected.firstname || selected.lastname) && (
          <Text className="opacity-70 mb-2">
            {[selected.firstname, selected.lastname].filter(Boolean).join(' ')}
          </Text>
        )}
        <Text className="mb-1">
          {t('claim_games_played')}:{' '}
          {selected.frame_count + selected.darts_leg_count}
        </Text>
        {selected.teams.length > 0 ? (
          <Text className="mb-4">
            {t('teams')}: {selected.teams.map(tm => tm.name).join(', ')}
          </Text>
        ) : (
          <Text className="mb-4 opacity-70">{t('claim_no_current_team')}</Text>
        )}
        {needsAdmin ? (
          <Text className="mb-4 opacity-80">{t('claim_needs_admin_hint')}</Text>
        ) : (
          <Text className="mb-4 opacity-80">{t('claim_captain_will_approve')}</Text>
        )}
        <Button onPress={submitClaim} disabled={submitting}>
          {submitting ? t('loading') : t('claim_this_profile')}
        </Button>
        <View className="h-3" />
        <Button onPress={() => setMode('search')} type="outline">
          {t('back')}
        </Button>
      </ThemedView>
    )
  }

  if (mode === 'mine') {
    return (
      <ThemedView className="flex-1 p-4">
        {loadingMine ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={mine}
            keyExtractor={item => String(item.id)}
            ListEmptyComponent={
              <Text className="opacity-70">{t('claim_no_requests')}</Text>
            }
            renderItem={({item}) => (
              <View
                className="mb-3 p-3 rounded-lg"
                style={{backgroundColor: colors.card}}>
                <Text className="font-semibold">
                  {item.shell_nickname ?? `#${item.shell_player_id}`}
                </Text>
                <Text className="opacity-70 mt-1">
                  {statusLabel(item.status, t)}
                </Text>
                {item.status === 0 && (
                  <Pressable
                    className="mt-2"
                    onPress={() => void cancelRequest(item.id)}>
                    <Text style={{color: colors.primary}}>
                      {t('claim_cancel_request')}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          />
        )}
        <Button onPress={() => setMode('search')}>{t('back')}</Button>
      </ThemedView>
    )
  }

  return (
    <ThemedView className="flex-1 p-4">
      <Text className="mb-3 opacity-80">{t('claim_existing_player_hint')}</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('claim_search_placeholder')}
        placeholderTextColor={colors.border}
        autoCapitalize="none"
        autoCorrect={false}
        className="border rounded-lg px-3 py-3 mb-3"
        style={{
          color: colors.text,
          borderColor: colors.border,
          backgroundColor: colors.card,
        }}
      />
      <View className="flex-row gap-3 mb-4">
        <Pressable
          onPress={() => setMode('scan')}
          className="flex-row items-center gap-1">
          <MaterialCommunityIcons
            name="qrcode-scan"
            size={20}
            color={colors.primary}
          />
          <Text style={{color: colors.primary}}>{t('scan_player_qr')}</Text>
        </Pressable>
        <Pressable onPress={() => setMode('mine')}>
          <Text style={{color: colors.primary}}>{t('claim_my_requests')}</Text>
        </Pressable>
      </View>
      {searching ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => String(item.id)}
          ListEmptyComponent={
            query.trim().length >= 2 ? (
              <Text className="opacity-70">{t('claim_no_matches')}</Text>
            ) : null
          }
          renderItem={({item}) => (
            <Pressable
              onPress={() => void openConfirm(item.id)}
              className="mb-2 p-3 rounded-lg"
              style={{backgroundColor: colors.card}}>
              <Text className="font-semibold text-base">{item.nickname}</Text>
              <Text className="opacity-70 text-sm mt-1">
                ID {item.id}
                {item.teams.length
                  ? ` · ${item.teams.map(tm => tm.name).join(', ')}`
                  : ''}
                {` · ${t('claim_games_played')}: ${item.frame_count + item.darts_leg_count}`}
              </Text>
            </Pressable>
          )}
        />
      )}
      {submitting && (
        <View className="absolute inset-0 items-center justify-center bg-black/20">
          <ActivityIndicator size="large" />
        </View>
      )}
    </ThemedView>
  )
}
