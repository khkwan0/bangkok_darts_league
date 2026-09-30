import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {useMiniLeagues} from '@/hooks/useMiniLeagues'
import {useThemeColor} from '@/hooks/useThemeColor'
import {validateCompetition} from '@/lib/competitionValidation'
import {
  CANONICAL_COMPETITION,
  getMiniLeaguePalette,
  type Competition,
} from '@/types/competition'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {router} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

const MAIN = '#37003C'
const MAIN_SOFT_LIGHT = '#F3E8F5'
const MAIN_SOFT_DARK = '#2A1530'

type MiniRow = {
  id: number
  name: string
  is_admin?: boolean
  member_status?: string | null
  created_by?: number | null
  browsable?: boolean
}

function Radio({
  selected,
  color,
}: {
  selected: boolean
  color: string
}) {
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: selected ? color : '#94A3B8',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? color : 'transparent',
        marginTop: 2,
      }}>
      {selected ? (
        <MCI
          name="check"
          size={15}
          color="#fff"
          style={{marginTop: 1}}
        />
      ) : null}
    </View>
  )
}

function OptionRow({
  selected,
  onPress,
  disabled,
  radioColor,
  title,
  subtitle,
  titleColor,
  subtitleColor,
  backgroundColor,
  borderColor,
  borderWidth = 1,
  footer,
}: {
  selected: boolean
  onPress: () => void
  disabled?: boolean
  radioColor: string
  title: string
  subtitle: string
  titleColor: string
  subtitleColor: string
  backgroundColor: string
  borderColor: string
  borderWidth?: number
  footer?: React.ReactNode
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{selected}}
      style={({pressed}) => ({
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor,
        borderWidth,
        borderColor,
        opacity: disabled ? 0.85 : pressed ? 0.92 : 1,
      })}>
      <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
        <Radio selected={selected} color={radioColor} />
        <View style={{flex: 1, marginLeft: 14, paddingTop: 1}}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '800',
              lineHeight: 22,
              color: titleColor,
            }}>
            {title}
          </Text>
          <Text
            style={{
              fontSize: 13,
              lineHeight: 18,
              marginTop: 6,
              color: subtitleColor,
            }}>
            {subtitle}
          </Text>
        </View>
      </View>
      {footer ? <View style={{marginTop: 14, marginLeft: 40}}>{footer}</View> : null}
    </Pressable>
  )
}

export function CompetitionPickerModal() {
  const {t} = useTranslation()
  const {state, setCompetition, closeCompetitionPicker, apiUrl} =
    useLeagueContext()
  const api = useMiniLeagues()
  const apiRef = React.useRef(api)
  apiRef.current = api
  const screenBg = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text')
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const insets = useSafeAreaInsets()
  const visible = state.competitionPickerOpen
  const [items, setItems] = React.useState<MiniRow[]>([])
  const [others, setOthers] = React.useState<MiniRow[]>([])
  const [showOthers, setShowOthers] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [showCreate, setShowCreate] = React.useState(false)
  const [name, setName] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [othersError, setOthersError] = React.useState<string | null>(null)
  const [keyboardHeight, setKeyboardHeight] = React.useState(0)
  const scrollRef = React.useRef<ScrollView>(null)
  const userId = state.user?.id ?? null
  const userIdRef = React.useRef(userId)
  userIdRef.current = userId

  const scrollCreateIntoView = React.useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({animated: true})
    })
  }, [])

  const competitionRef = React.useRef(state.competition)
  competitionRef.current = state.competition
  const isCanonical = state.competition.type === 'canonical'
  const activeMiniId =
    state.competition.type === 'mini' ? state.competition.id : null
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF'
  const border = isDark ? '#333' : '#E2E8F0'
  const muted = isDark ? '#A8A29E' : '#64748B'
  const mainSectionBg = isDark ? MAIN_SOFT_DARK : MAIN_SOFT_LIGHT
  const activeMiniPalette =
    activeMiniId != null ? getMiniLeaguePalette(activeMiniId) : null
  const miniSectionAccent =
    activeMiniPalette?.accent ?? getMiniLeaguePalette(1).accent
  const miniSectionBg = activeMiniPalette
    ? isDark
      ? activeMiniPalette.softDark
      : activeMiniPalette.soft
    : isDark
      ? '#1E1E1E'
      : '#F8FAFC'
  const miniSectionBorder = activeMiniPalette
    ? isDark
      ? activeMiniPalette.borderDark
      : activeMiniPalette.border
    : border

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setOthersError(null)
    try {
      const [res, activeRes] = await Promise.all([
        apiRef.current.list(),
        apiRef.current.listActive(),
      ])
      const uid = userIdRef.current
      let mine: MiniRow[] = []
      if (res?.status === 'ok' && Array.isArray(res.data)) {
        mine = (res.data as MiniRow[]).filter(item => {
          if (
            item.member_status === 'active' ||
            item.member_status === 'pending'
          ) {
            return true
          }
          return (
            uid != null &&
            item.created_by != null &&
            Number(item.created_by) === Number(uid)
          )
        })
        setItems(mine)
      } else {
        setItems([])
        setError(
          res?.error === 'unauthorized'
            ? t('mini_leagues_sign_in')
            : res?.error || t('mini_leagues_load_error'),
        )
      }

      const mineIds = new Set(mine.map(item => Number(item.id)))
      let browsable: MiniRow[] = []
      if (activeRes?.status === 'ok' && Array.isArray(activeRes.data)) {
        browsable = (activeRes.data as MiniRow[])
          .filter(item => !mineIds.has(Number(item.id)))
          .map(item => ({
            id: Number(item.id),
            name: item.name,
            browsable: true,
          }))
        setOthers(browsable)
      } else {
        setOthers([])
        setOthersError(t('mini_leagues_load_error'))
      }

      if (res?.status === 'ok' && Array.isArray(res.data)) {
        const current = competitionRef.current
        const validated = validateCompetition(
          current,
          [
            ...mine,
            ...browsable.map(item => ({...item, browsable: true as const})),
          ],
          uid,
        )
        if (
          current.type === 'mini' &&
          browsable.some(item => item.id === current.id)
        ) {
          setShowOthers(true)
        }
        if (
          validated.type !== current.type ||
          (validated.type === 'mini' &&
            current.type === 'mini' &&
            (validated.id !== current.id || validated.name !== current.name))
        ) {
          await setCompetition(validated)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [setCompetition, t])

  React.useEffect(() => {
    if (visible) {
      setShowCreate(false)
      setName('')
      setShowOthers(false)
      setKeyboardHeight(0)
      load()
    }
  }, [visible, load, apiUrl])

  React.useEffect(() => {
    if (!visible) return
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const showSub = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates.height)
      if (showCreate) scrollCreateIntoView()
    })
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0)
    })
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [visible, showCreate, scrollCreateIntoView])

  React.useEffect(() => {
    if (showCreate) scrollCreateIntoView()
  }, [showCreate, scrollCreateIntoView])

  async function select(competition: Competition) {
    await setCompetition(competition)
    closeCompetitionPicker()
    router.navigate('/(tabs)/(index)' as any)
  }

  async function onCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    setCreating(true)
    setError(null)
    try {
      const res = await apiRef.current.create(trimmed)
      if (res?.status === 'ok' && res.data?.id) {
        setName('')
        setShowCreate(false)
        await setCompetition({
          type: 'mini',
          id: Number(res.data.id),
          name: res.data.name || trimmed,
        })
        closeCompetitionPicker()
        router.push({
          pathname: '/teams/mini-leagues/[id]',
          params: {id: String(res.data.id)},
        })
      } else {
        Alert.alert(
          t('error'),
          res?.error === 'already_created_mini_league'
            ? t('already_created_mini_league')
            : res?.error || t('mini_league_create_error'),
        )
      }
    } finally {
      setCreating(false)
    }
  }

  function leagueSubtitle(item: MiniRow) {
    if (item.member_status === 'pending') return t('invite_pending')
    const createdByUser =
      userId != null &&
      item.created_by != null &&
      Number(item.created_by) === Number(userId)
    if (createdByUser && item.member_status !== 'active') {
      return t('you_created_this_league')
    }
    if (item.browsable) return t('other_mini_league')
    if (item.is_admin) return t('you_admin_this_group')
    return t('private_mini_league')
  }

  function renderLeague(item: MiniRow, isLast: boolean) {
    const selected = activeMiniId === item.id
    const pending = item.member_status === 'pending'
    const itemPalette = getMiniLeaguePalette(item.id)
    return (
      <View
        key={item.id}
        style={{marginBottom: isLast ? 0 : 12}}>
        <OptionRow
          selected={selected}
          disabled={pending}
          onPress={() =>
            select({
              type: 'mini',
              id: item.id,
              name: item.name,
            })
          }
          radioColor={itemPalette.accent}
          title={item.name}
          subtitle={leagueSubtitle(item)}
          titleColor={textColor}
          subtitleColor={muted}
          backgroundColor={
            selected ? (isDark ? itemPalette.dark : '#fff') : cardBg
          }
          borderColor={selected ? itemPalette.accent : border}
          borderWidth={selected ? 2 : 1}
          footer={
            pending ? (
              <View style={{flexDirection: 'row', gap: 8}}>
                <Button onPress={() => onRespond(item.id, 'accept')}>
                  <Text className="text-white">{t('accept')}</Text>
                </Button>
                <Button
                  type="outline"
                  onPress={() => onRespond(item.id, 'decline')}>
                  decline
                </Button>
              </View>
            ) : null
          }
        />
      </View>
    )
  }

  async function onRespond(id: number, action: 'accept' | 'decline') {
    const res = await apiRef.current.respondInvite(id, action)
    if (res?.status === 'ok') {
      await load()
      if (action === 'accept') {
        const row = items.find(i => i.id === id)
        await select({
          type: 'mini',
          id,
          name: row?.name || t('mini_league'),
        })
      }
    } else {
      Alert.alert(t('error'), res?.error || t('request_failed'))
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeCompetitionPicker}>
      <KeyboardAvoidingView
        style={{flex: 1, backgroundColor: screenBg}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: 8,
          }}>
          <Text style={{fontSize: 22, fontWeight: '800', flex: 1, paddingRight: 12}}>
            {t('competition_picker_title')}
          </Text>
          <Pressable
            onPress={closeCompetitionPicker}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            hitSlop={12}
            style={({pressed}) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8',
              opacity: pressed ? 0.7 : 1,
            })}>
            <MCI name="close" size={22} color={textColor} />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{flex: 1}}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom:
              Math.max(insets.bottom, 20) +
              16 +
              // Android Modal dialogs don't resize with the keyboard; pad instead.
              (Platform.OS === 'android' ? keyboardHeight : 0),
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
          <Text
            style={{
              fontSize: 14,
              color: muted,
              lineHeight: 21,
              marginBottom: 20,
              paddingHorizontal: 4,
            }}>
            {t('competition_picker_hint')}
          </Text>

          {/* Main league section */}
          <View
            style={{
              backgroundColor: mainSectionBg,
              borderRadius: 20,
              paddingTop: 20,
              paddingBottom: 20,
              paddingHorizontal: 18,
              borderWidth: 1,
              borderColor: isDark ? '#4A2A55' : '#E4D4EA',
            }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: MAIN,
                letterSpacing: 0.8,
                lineHeight: 16,
                marginBottom: 8,
              }}>
              {t('main_league').toUpperCase()}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: muted,
                lineHeight: 20,
                marginBottom: 18,
              }}>
              {t('main_league_description')}
            </Text>

            <OptionRow
              selected={isCanonical}
              onPress={() => select(CANONICAL_COMPETITION)}
              radioColor={isCanonical ? '#FFD54F' : MAIN}
              title={t('bangkok_darts_league')}
              subtitle={t('official_season_table')}
              titleColor={isCanonical ? '#fff' : textColor}
              subtitleColor={
                isCanonical ? 'rgba(255,255,255,0.75)' : muted
              }
              backgroundColor={isCanonical ? MAIN : cardBg}
              borderColor={border}
              borderWidth={isCanonical ? 0 : 1}
            />
          </View>

          {/* Separation */}
          <View style={{height: 28}} />

          {/* Mini leagues section */}
          <View
            style={{
              backgroundColor: miniSectionBg,
              borderRadius: 20,
              paddingTop: 20,
              paddingBottom: 20,
              paddingHorizontal: 18,
              borderWidth: 1,
              borderColor: miniSectionBorder,
              minHeight: 200,
            }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: miniSectionAccent,
                letterSpacing: 0.8,
                lineHeight: 16,
                marginBottom: 8,
              }}>
              {t('mini_leagues').toUpperCase()}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: muted,
                lineHeight: 20,
                marginBottom: 18,
              }}>
              {t('mini_leagues_section_description')}
            </Text>

            {loading && items.length === 0 ? (
              <ActivityIndicator
                color={miniSectionAccent}
                style={{marginVertical: 24}}
              />
            ) : null}

            {!loading && items.length === 0 && !error ? (
              <Text
                style={{
                  color: muted,
                  marginBottom: 18,
                  lineHeight: 20,
                  fontSize: 14,
                }}>
                {t('mini_leagues_none_yet')}
              </Text>
            ) : null}

            {items.map((item, index) =>
              renderLeague(item, index === items.length - 1),
            )}

            {!loading && !error ? (
              <Pressable
                onPress={() => setShowOthers(open => !open)}
                accessibilityRole="button"
                accessibilityState={{expanded: showOthers}}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  marginTop: items.length ? 8 : 0,
                }}>
                <MCI
                  name={showOthers ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={miniSectionAccent}
                  style={{marginRight: 8}}
                />
                <Text
                  style={{
                    color: miniSectionAccent,
                    fontWeight: '700',
                    fontSize: 15,
                    lineHeight: 20,
                  }}>
                  {showOthers
                    ? t('hide_other_mini_leagues')
                    : t('show_other_mini_leagues')}
                  {others.length ? ` (${others.length})` : ''}
                </Text>
              </Pressable>
            ) : null}

            {showOthers ? (
              <View style={{marginTop: 4}}>
                {othersError ? (
                  <Text
                    style={{
                      color: '#dc2626',
                      fontSize: 13,
                      textAlign: 'center',
                      marginBottom: 12,
                    }}>
                    {othersError}
                  </Text>
                ) : others.length === 0 ? (
                  <Text
                    style={{
                      color: muted,
                      marginBottom: 12,
                      lineHeight: 20,
                      fontSize: 14,
                      textAlign: 'center',
                    }}>
                    {t('other_mini_leagues_empty')}
                  </Text>
                ) : (
                  others.map((item, index) =>
                    renderLeague(item, index === others.length - 1),
                  )
                )}
              </View>
            ) : null}

            <View style={{height: 16}} />

            {!showCreate ? (
              <Pressable
                onPress={() => setShowCreate(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                }}>
                <MCI
                  name="plus"
                  size={18}
                  color={miniSectionAccent}
                  style={{marginRight: 8}}
                />
                <Text
                  style={{
                    color: miniSectionAccent,
                    fontWeight: '700',
                    fontSize: 15,
                    lineHeight: 20,
                  }}>
                  {t('create_a_mini_league')}
                </Text>
              </Pressable>
            ) : (
              <View
                style={{
                  padding: 16,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: border,
                  backgroundColor: cardBg,
                }}>
                <Text style={{fontWeight: '700', marginBottom: 10, fontSize: 15}}>
                  {t('new_mini_league')}
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  onFocus={scrollCreateIntoView}
                  placeholder={t('name')}
                  placeholderTextColor={muted}
                  style={{
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: textColor,
                    marginBottom: 12,
                  }}
                />
                <View style={{flexDirection: 'row'}}>
                  <View style={{flex: 1, marginRight: 8}}>
                    <Button
                      type="outline"
                      onPress={() => {
                        setShowCreate(false)
                        setName('')
                      }}>
                      cancel
                    </Button>
                  </View>
                  <View style={{flex: 1}}>
                    <Button
                      onPress={onCreate}
                      disabled={creating || !name.trim()}>
                      <Text className="text-white">
                        {creating ? t('creating') : t('create')}
                      </Text>
                    </Button>
                  </View>
                </View>
              </View>
            )}

            {error ? (
              <Text
                style={{
                  color: '#dc2626',
                  fontSize: 13,
                  textAlign: 'center',
                  marginTop: 12,
                }}>
                {error}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}
