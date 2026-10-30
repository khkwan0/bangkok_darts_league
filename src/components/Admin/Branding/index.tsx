import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  useAdminBranding,
  type AdminLeagueDetail,
  type AdminLeagueListItem,
} from '@/hooks/useAdminBranding'
import {
  availablePanels,
  PANEL_ADMIN_LABEL,
  sportDefaultPanels,
  type HomePanelId,
  type HomePanelSport,
} from '@/lib/homePanels'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import * as ImagePicker from 'expo-image-picker'
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

function emptyDetail(): AdminLeagueDetail {
  return {
    id: 0,
    name: '',
    slug: '',
    short_name: '',
    tagline: null,
    primary_domain: '',
    domain_aliases: [],
    logo_url: null,
    favicon_url: null,
    og_image_url: null,
    sport: 'pool',
    colors: {
      primary: '#1565C0',
      secondary: '#0D47A1',
      accent: '#42A5F5',
      background: '#FFFFFF',
      text: '#111111',
    },
    support_email: null,
    noreply_email: null,
    support_url: null,
    welcome_enabled: false,
    welcome_blurb: null,
    welcome_image_url: null,
    welcome_background_color: '#FFFFFF',
    welcome_text_color: '#111111',
    welcome_revision: 0,
    admins: [],
  }
}

export default function AdminBranding() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'
  const {state} = useLeagueContext()
  const {
    listLeagues,
    getLeague,
    saveBranding,
    grantAdmin,
    revokeAdmin,
    uploadWelcomeImage,
  } = useAdminBranding()

  const [leagues, setLeagues] = React.useState<AdminLeagueListItem[]>([])
  const [selectedId, setSelectedId] = React.useState<number | null>(null)
  const [detail, setDetail] = React.useState<AdminLeagueDetail | null>(null)
  const [aliasesText, setAliasesText] = React.useState('')
  const [homePanels, setHomePanels] = React.useState<HomePanelId[]>([])
  const [adminPlayerId, setAdminPlayerId] = React.useState('')
  const [isSuperadmin, setIsSuperadmin] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const inputClass =
    'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-base text-gray-900 dark:text-gray-100'
  const cardClass =
    'mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4'
  const muted = isDark ? '#9CA3AF' : '#6B7280'

  React.useEffect(() => {
    navigation.setOptions({title: t('admin_branding')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings' as any)
    }
  }, [router, state.user])

  const loadList = React.useCallback(async () => {
    const res = await listLeagues()
    if (res.error) {
      setError(t('admin_branding_load_failed'))
      return null
    }
    setLeagues(res.data)
    setIsSuperadmin(res.is_superadmin)
    return res
  }, [listLeagues, t])

  const loadDetail = React.useCallback(
    async (id: number) => {
      const res = await getLeague(id)
      if (res.error || !res.data) {
        setError(t('admin_branding_load_failed'))
        setDetail(null)
        return
      }
      const sport: HomePanelSport =
        res.data.sport === 'darts' ? 'darts' : 'pool'
      const next: AdminLeagueDetail = {
        ...emptyDetail(),
        ...res.data,
        sport,
        welcome_enabled: Boolean(res.data.welcome_enabled),
        welcome_blurb: res.data.welcome_blurb ?? null,
        welcome_image_url: res.data.welcome_image_url ?? null,
        welcome_background_color:
          res.data.welcome_background_color || '#FFFFFF',
        welcome_text_color: res.data.welcome_text_color || '#111111',
        welcome_revision: Number(res.data.welcome_revision) || 0,
        colors: {
          primary: res.data.colors?.primary || '#1565C0',
          secondary: res.data.colors?.secondary || '#0D47A1',
          accent: res.data.colors?.accent || '#42A5F5',
          background: res.data.colors?.background || '#FFFFFF',
          text: res.data.colors?.text || '#111111',
        },
        admins: res.data.admins || [],
      }
      setDetail(next)
      setAliasesText((res.data.domain_aliases || []).join(', '))
      setHomePanels(
        Array.isArray(res.data.home_panels) && res.data.home_panels.length
          ? res.data.home_panels
          : sportDefaultPanels(sport),
      )
    },
    [getLeague, t],
  )

  const selectedIdRef = React.useRef(selectedId)
  selectedIdRef.current = selectedId

  useFocusEffect(
    React.useCallback(() => {
      let active = true
      ;(async () => {
        setLoading(true)
        setError(null)
        const list = await loadList()
        if (!active) return
        if (!list) {
          setLoading(false)
          return
        }
        const hostId = Number(list.host_league_id)
        const first =
          list.data.find(l => l.id === hostId) || list.data[0] || null
        const prev = selectedIdRef.current
        const nextId =
          prev && list.data.some(l => l.id === prev)
            ? prev
            : (first?.id ?? null)
        setSelectedId(nextId)
        if (nextId) await loadDetail(nextId)
        if (active) setLoading(false)
      })()
      return () => {
        active = false
      }
    }, [loadDetail, loadList]),
  )

  React.useEffect(() => {
    if (!selectedId) return
    // Skip duplicate fetch when focus effect already loaded this id
    void loadDetail(selectedId)
  }, [selectedId, loadDetail])

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await loadList()
    if (selectedId) await loadDetail(selectedId)
    setRefreshing(false)
  }, [loadDetail, loadList, selectedId])

  const updateDetail = <K extends keyof AdminLeagueDetail>(
    key: K,
    value: AdminLeagueDetail[K],
  ) => {
    setDetail(prev => (prev ? {...prev, [key]: value} : prev))
  }

  const togglePanel = (id: HomePanelId) => {
    setHomePanels(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id],
    )
  }

  const movePanel = (id: HomePanelId, dir: -1 | 1) => {
    setHomePanels(prev => {
      const idx = prev.indexOf(id)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[next]] = [copy[next]!, copy[idx]!]
      return copy
    })
  }

  const handleSave = async () => {
    if (!detail || !selectedId) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    const result = await saveBranding(selectedId, {
      name: detail.name,
      slug: detail.slug,
      short_name: detail.short_name,
      tagline: detail.tagline,
      primary_domain: detail.primary_domain,
      domain_aliases: aliasesText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      logo_url: detail.logo_url?.trim() ? detail.logo_url.trim() : null,
      favicon_url: detail.favicon_url?.trim()
        ? detail.favicon_url.trim()
        : null,
      og_image_url: detail.og_image_url?.trim()
        ? detail.og_image_url.trim()
        : null,
      primary_color: detail.colors.primary,
      secondary_color: detail.colors.secondary,
      accent_color: detail.colors.accent,
      background_color: detail.colors.background,
      text_color: detail.colors.text,
      support_email: detail.support_email,
      noreply_email: detail.noreply_email,
      support_url: detail.support_url,
      sport: detail.sport || 'pool',
      home_panels: homePanels,
      welcome_enabled: Boolean(detail.welcome_enabled),
      welcome_blurb: detail.welcome_blurb?.trim()
        ? detail.welcome_blurb.trim()
        : null,
      welcome_image_url: detail.welcome_image_url?.trim()
        ? detail.welcome_image_url.trim()
        : null,
      welcome_background_color:
        detail.welcome_background_color || '#FFFFFF',
      welcome_text_color: detail.welcome_text_color || '#111111',
    })
    if (result.status !== 'ok') {
      setError(result.error || t('admin_branding_save_failed'))
    } else {
      setSuccess(t('admin_branding_save_ok'))
      if (result.data?.home_panels) setHomePanels(result.data.home_panels)
      if (result.data) {
        setDetail(prev =>
          prev
            ? {
                ...prev,
                welcome_enabled: Boolean(result.data!.welcome_enabled),
                welcome_blurb: result.data!.welcome_blurb ?? null,
                welcome_image_url: result.data!.welcome_image_url ?? null,
                welcome_background_color:
                  result.data!.welcome_background_color || '#FFFFFF',
                welcome_text_color:
                  result.data!.welcome_text_color || '#111111',
                welcome_revision:
                  Number(result.data!.welcome_revision) || 0,
              }
            : prev,
        )
      }
    }
    setSaving(false)
  }

  const handleGrant = async () => {
    if (!selectedId) return
    const pid = Number(adminPlayerId)
    if (!Number.isFinite(pid) || pid <= 0) {
      setError(t('admin_branding_invalid_player'))
      return
    }
    setError(null)
    setSuccess(null)
    const result = await grantAdmin(selectedId, pid)
    if (result.status !== 'ok') {
      setError(result.error || t('admin_branding_grant_failed'))
    } else {
      setSuccess(t('admin_branding_grant_ok'))
      setAdminPlayerId('')
      if (result.admins) {
        setDetail(prev => (prev ? {...prev, admins: result.admins!} : prev))
      }
    }
  }

  const handleRevoke = (playerId: number) => {
    if (!selectedId || !isSuperadmin) return
    Alert.alert(
      t('admin_branding_revoke_title'),
      t('admin_branding_revoke_body', {id: playerId}),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('admin_branding_revoke'),
          style: 'destructive',
          onPress: async () => {
            setError(null)
            setSuccess(null)
            const result = await revokeAdmin(selectedId, playerId)
            if (result.status !== 'ok') {
              setError(result.error || t('admin_branding_revoke_failed'))
            } else {
              setSuccess(t('admin_branding_revoke_ok'))
              if (result.admins) {
                setDetail(prev =>
                  prev ? {...prev, admins: result.admins!} : prev,
                )
              }
            }
          },
        },
      ],
    )
  }

  const handlePickWelcomeImage = async () => {
    if (!selectedId) return
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(
        t('admin_branding_upload_permission_title'),
        t('admin_branding_upload_permission_body'),
      )
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    })
    if (result.canceled || !result.assets?.[0]?.uri) return
    setUploading(true)
    setError(null)
    setSuccess(null)
    const upload = await uploadWelcomeImage(selectedId, result.assets[0].uri)
    if (upload.status !== 'ok') {
      setError(upload.error || t('admin_branding_upload_failed'))
    } else {
      setSuccess(t('admin_branding_upload_ok'))
      setDetail(prev =>
        prev
          ? {
              ...prev,
              welcome_image_url: upload.url ?? prev.welcome_image_url,
              welcome_revision:
                upload.welcome_revision ?? prev.welcome_revision,
            }
          : prev,
      )
    }
    setUploading(false)
  }

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: {locked?: boolean; multiline?: boolean; placeholder?: string},
  ) => (
    <View className="mb-3">
      <Text className="mb-1 text-sm font-medium">{label}</Text>
      <TextInput
        className={`${inputClass}${opts?.multiline ? ' min-h-[88px]' : ''}`}
        value={value}
        onChangeText={onChange}
        editable={!opts?.locked && !saving}
        multiline={opts?.multiline}
        textAlignVertical={opts?.multiline ? 'top' : 'center'}
        placeholder={opts?.placeholder}
        placeholderTextColor={muted}
      />
      {opts?.locked ? (
        <Text className="mt-1 text-xs text-gray-500">
          {t('admin_branding_superadmin_only')}
        </Text>
      ) : null}
    </View>
  )

  if (!isLeagueAdmin(state.user)) {
    return null
  }

  const catalog = availablePanels(detail?.sport || 'pool')
  const selectedPanels = new Set(homePanels)

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
            <Text className="mb-2 text-lg font-semibold">
              {t('admin_branding_league')}
            </Text>
            {isSuperadmin ? (
              <Text className="mb-3 text-xs text-amber-700 dark:text-amber-300">
                {t('admin_branding_superadmin_banner')}
              </Text>
            ) : null}
            {leagues.map(l => {
              const selected = selectedId === l.id
              return (
                <Pressable
                  key={l.id}
                  onPress={() => setSelectedId(l.id)}
                  className={`mb-2 rounded-lg border px-3 py-2.5 ${
                    selected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  <Text className="font-medium">
                    {l.name}
                    {l.is_default ? ` (${t('admin_branding_default')})` : ''}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {detail ? (
            <>
              <View className={cardClass}>
                <Text className="mb-3 text-lg font-semibold">
                  {t('admin_branding_identity')}
                </Text>
                {field(t('admin_branding_name'), detail.name, v =>
                  updateDetail('name', v),
                )}
                {field(
                  t('admin_branding_slug'),
                  detail.slug,
                  v => updateDetail('slug', v),
                  {locked: !isSuperadmin},
                )}
                {field(
                  t('admin_branding_short_name'),
                  detail.short_name,
                  v => updateDetail('short_name', v),
                )}
                {field(
                  t('admin_branding_tagline'),
                  detail.tagline ?? '',
                  v => updateDetail('tagline', v || null),
                )}
                {field(
                  t('admin_branding_primary_domain'),
                  detail.primary_domain,
                  v => updateDetail('primary_domain', v),
                  {locked: !isSuperadmin},
                )}
                {field(
                  t('admin_branding_aliases'),
                  aliasesText,
                  setAliasesText,
                  {
                    locked: !isSuperadmin,
                    placeholder: 'alias1.com, alias2.com',
                  },
                )}
                {field(
                  t('admin_branding_logo_url'),
                  detail.logo_url ?? '',
                  v => updateDetail('logo_url', v || null),
                )}
                {field(
                  t('admin_branding_favicon_url'),
                  detail.favicon_url ?? '',
                  v => updateDetail('favicon_url', v || null),
                )}
                {field(
                  t('admin_branding_og_url'),
                  detail.og_image_url ?? '',
                  v => updateDetail('og_image_url', v || null),
                )}
                <Text className="mb-1 text-sm font-medium">
                  {t('admin_branding_sport')}
                </Text>
                <View className="mb-1 flex-row gap-2">
                  {(['pool', 'darts'] as const).map(sport => (
                    <Pressable
                      key={sport}
                      onPress={() => {
                        updateDetail('sport', sport)
                        setHomePanels(sportDefaultPanels(sport))
                      }}
                      className={`flex-1 rounded-lg border px-3 py-2.5 items-center ${
                        detail.sport === sport
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}>
                      <Text className="font-medium">
                        {sport === 'pool'
                          ? t('admin_branding_sport_pool')
                          : t('admin_branding_sport_darts')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className={cardClass}>
                <Text className="mb-3 text-lg font-semibold">
                  {t('admin_branding_colors')}
                </Text>
                {(
                  [
                    ['primary', t('admin_branding_color_primary')],
                    ['secondary', t('admin_branding_color_secondary')],
                    ['accent', t('admin_branding_color_accent')],
                    ['background', t('admin_branding_color_background')],
                    ['text', t('admin_branding_color_text')],
                  ] as const
                ).map(([key, label]) =>
                  field(label, detail.colors[key], v =>
                    setDetail({
                      ...detail,
                      colors: {...detail.colors, [key]: v},
                    }),
                  ),
                )}
              </View>

              <View className={cardClass}>
                <Text className="mb-3 text-lg font-semibold">
                  {t('admin_branding_contact')}
                </Text>
                {field(
                  t('admin_branding_support_email'),
                  detail.support_email ?? '',
                  v => updateDetail('support_email', v || null),
                )}
                {field(
                  t('admin_branding_noreply_email'),
                  detail.noreply_email ?? '',
                  v => updateDetail('noreply_email', v || null),
                )}
                {field(
                  t('admin_branding_support_url'),
                  detail.support_url ?? '',
                  v => updateDetail('support_url', v || null),
                )}
              </View>

              <View className={cardClass}>
                <Text className="mb-1 text-lg font-semibold">
                  {t('admin_branding_home_panels')}
                </Text>
                <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                  {t('admin_branding_home_panels_help')}
                </Text>
                {homePanels.map((id, index) => (
                  <View
                    key={id}
                    className="mb-2 flex-row items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                    <Text className="flex-1 font-medium">
                      {PANEL_ADMIN_LABEL[id]}
                    </Text>
                    <Pressable
                      disabled={index === 0}
                      onPress={() => movePanel(id, -1)}
                      className="rounded px-2 py-1 disabled:opacity-40">
                      <Text className="text-xs text-blue-600">
                        {t('admin_branding_up')}
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={index === homePanels.length - 1}
                      onPress={() => movePanel(id, 1)}
                      className="rounded px-2 py-1 disabled:opacity-40">
                      <Text className="text-xs text-blue-600">
                        {t('admin_branding_down')}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => togglePanel(id)}>
                      <Text className="text-xs text-red-600">
                        {t('admin_branding_hide')}
                      </Text>
                    </Pressable>
                  </View>
                ))}
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {catalog
                    .filter(id => !selectedPanels.has(id))
                    .map(id => (
                      <Pressable
                        key={id}
                        onPress={() => togglePanel(id)}
                        className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-1.5">
                        <Text className="text-xs">
                          + {PANEL_ADMIN_LABEL[id]}
                        </Text>
                      </Pressable>
                    ))}
                </View>
                <Pressable
                  className="mt-3"
                  onPress={() =>
                    setHomePanels(sportDefaultPanels(detail.sport || 'pool'))
                  }>
                  <Text className="text-sm text-blue-600">
                    {t('admin_branding_reset_panels')}
                  </Text>
                </Pressable>
              </View>

              <View className={cardClass}>
                <Text className="mb-1 text-lg font-semibold">
                  {t('admin_branding_welcome')}
                </Text>
                <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                  {t('admin_branding_welcome_help')}
                </Text>
                <View className="mb-4 flex-row items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
                  <Text className="flex-1 text-sm font-medium">
                    {t('admin_branding_welcome_enabled')}
                  </Text>
                  <Switch
                    value={Boolean(detail.welcome_enabled)}
                    onValueChange={v => updateDetail('welcome_enabled', v)}
                    disabled={saving}
                  />
                </View>
                {field(
                  t('admin_branding_welcome_blurb'),
                  detail.welcome_blurb ?? '',
                  v => updateDetail('welcome_blurb', v || null),
                  {multiline: true},
                )}
                {field(
                  t('admin_branding_welcome_image_url'),
                  detail.welcome_image_url ?? '',
                  v => updateDetail('welcome_image_url', v || null),
                )}
                <View className="mb-3 flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      small
                      disabled={uploading || saving}
                      onPress={() => void handlePickWelcomeImage()}>
                      {uploading
                        ? t('admin_branding_uploading')
                        : t('admin_branding_upload_image')}
                    </Button>
                  </View>
                  <View className="flex-1">
                    <Pressable
                      onPress={() =>
                        updateDetail('welcome_image_url', null)
                      }
                      className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 items-center">
                      <Text className="text-sm font-medium">
                        {t('admin_branding_clear_image')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                {field(
                  t('admin_branding_welcome_bg'),
                  detail.welcome_background_color || '#FFFFFF',
                  v => updateDetail('welcome_background_color', v),
                )}
                {field(
                  t('admin_branding_welcome_text'),
                  detail.welcome_text_color || '#111111',
                  v => updateDetail('welcome_text_color', v),
                )}
                <Text className="text-xs text-gray-500">
                  {t('admin_branding_welcome_revision', {
                    n: detail.welcome_revision ?? 0,
                  })}
                </Text>
              </View>

              <Button disabled={saving} onPress={() => void handleSave()}>
                {saving
                  ? t('admin_branding_saving')
                  : t('admin_branding_save')}
              </Button>

              <View className={`${cardClass} mt-4`}>
                <Text className="mb-1 text-lg font-semibold">
                  {t('admin_branding_admins')}
                </Text>
                <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                  {t('admin_branding_admins_help')}
                </Text>
                {(detail.admins || []).length === 0 ? (
                  <Text className="mb-3 text-sm text-gray-500">
                    {t('admin_branding_admins_empty')}
                  </Text>
                ) : (
                  detail.admins.map(admin => (
                    <View
                      key={admin.id}
                      className="mb-2 flex-row items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2">
                      <Text className="flex-1 font-medium">
                        {admin.nickname}{' '}
                        <Text className="font-normal text-gray-500">
                          #{admin.id}
                        </Text>
                      </Text>
                      {isSuperadmin ? (
                        <Pressable onPress={() => handleRevoke(admin.id)}>
                          <Text className="text-sm text-red-600">
                            {t('admin_branding_revoke')}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))
                )}
                <Text className="mb-1 mt-2 text-sm font-medium">
                  {t('admin_branding_player_id')}
                </Text>
                <TextInput
                  className={`${inputClass} mb-3`}
                  value={adminPlayerId}
                  onChangeText={setAdminPlayerId}
                  keyboardType="number-pad"
                  placeholder="e.g. 1001"
                  placeholderTextColor={muted}
                />
                <Button
                  disabled={!adminPlayerId.trim()}
                  onPress={() => void handleGrant()}>
                  {t('admin_branding_grant')}
                </Button>
              </View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  )
}
