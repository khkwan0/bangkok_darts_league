import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  useReleaseNotes,
  type ReleaseNote,
  type ReleaseNoteKind,
} from '@/hooks/useReleaseNotes'
import {isSuperAdminUser} from '@/lib/isLeagueAdmin'
import {useNavigation, useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View as RNView,
} from 'react-native'

const AUDIENCES = ['all', 'web', 'mobile', 'pool', 'darts'] as const
const KINDS: ReleaseNoteKind[] = ['feature', 'fix', 'change']

type Draft = {
  id: number | null
  title: string
  body: string
  kind: ReleaseNoteKind
  audiences: string[]
  hidden: boolean
}

const EMPTY: Draft = {
  id: null,
  title: '',
  body: '',
  kind: 'change',
  audiences: ['all'],
  hidden: false,
}

export default function AdminReleaseNotesScreen() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const {colors} = useTheme()
  const {state} = useLeagueContext()
  const {listAdmin, saveAdmin, setHidden} = useReleaseNotes()
  const [items, setItems] = React.useState<ReleaseNote[]>([])
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const allowed = isSuperAdminUser(state.user)

  React.useEffect(() => {
    navigation.setOptions({title: t('release_notes_admin')})
  }, [navigation, t])

  const load = React.useCallback(async () => {
    if (!allowed) {
      setLoading(false)
      return
    }
    const result = await listAdmin()
    setItems(result.items)
    setError(result.error === 'superadmin_required' ? t('release_notes_forbidden') : result.error ? t('release_notes_load_error') : null)
    setLoading(false)
  }, [allowed, listAdmin, t])

  React.useEffect(() => {
    void load()
  }, [load])

  function toggleAudience(tag: string) {
    setDraft(current => {
      if (!current) return current
      if (tag === 'all') return {...current, audiences: ['all']}
      const withoutAll = current.audiences.filter(item => item !== 'all')
      const next = withoutAll.includes(tag)
        ? withoutAll.filter(item => item !== tag)
        : [...withoutAll, tag]
      return {...current, audiences: next.length > 0 ? next : ['all']}
    })
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    setError(null)
    const result = await saveAdmin(draft)
    setSaving(false)
    if (result.error || !result.note) {
      setError(result.error === 'superadmin_required' ? t('release_notes_forbidden') : t('release_notes_save_error'))
      return
    }
    setDraft(null)
    setLoading(true)
    await load()
  }

  if (!allowed) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center opacity-70">{t('release_notes_forbidden')}</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (draft) {
    return (
      <ScrollView className="flex-1 px-4 pt-3" contentContainerClassName="pb-16">
        <Text className="text-lg font-semibold">
          {draft.id ? t('release_notes_edit') : t('release_notes_new')}
        </Text>
        <Text className="mt-4 text-sm opacity-70">{t('release_notes_title')}</Text>
        <TextInput
          value={draft.title}
          onChangeText={title => setDraft(current => (current ? {...current, title} : current))}
          style={{color: colors.text}}
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600"
        />
        <Text className="mt-4 text-sm opacity-70">{t('release_notes_kind')}</Text>
        <RNView className="mt-2 flex-row flex-wrap gap-2">
          {KINDS.map(kind => (
            <Pressable
              key={kind}
              onPress={() => setDraft(current => (current ? {...current, kind} : current))}
              className={`rounded-full px-3 py-1 ${draft.kind === kind ? 'bg-sky-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
              <Text className={draft.kind === kind ? 'text-white' : ''}>
                {t(`release_notes_kind_${kind}`)}
              </Text>
            </Pressable>
          ))}
        </RNView>
        <Text className="mt-4 text-sm opacity-70">{t('release_notes_audiences')}</Text>
        <RNView className="mt-2 flex-row flex-wrap gap-2">
          {AUDIENCES.map(tag => {
            const on = draft.audiences.includes(tag)
            return (
              <Pressable
                key={tag}
                onPress={() => toggleAudience(tag)}
                className={`rounded-full px-3 py-1 ${on ? 'bg-sky-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <Text className={on ? 'text-white' : ''}>{tag}</Text>
              </Pressable>
            )
          })}
        </RNView>
        <RNView className="mt-4 flex-row items-center justify-between">
          <Text>{t('release_notes_hidden')}</Text>
          <Switch
            value={draft.hidden}
            onValueChange={hidden => setDraft(current => (current ? {...current, hidden} : current))}
          />
        </RNView>
        <Text className="mt-4 text-sm opacity-70">{t('release_notes_body')}</Text>
        <TextInput
          value={draft.body}
          onChangeText={body => setDraft(current => (current ? {...current, body} : current))}
          multiline
          style={{color: colors.text, minHeight: 160, textAlignVertical: 'top'}}
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600"
        />
        {error ? <Text className="mt-3 text-red-500">{error}</Text> : null}
        <Pressable
          onPress={() => void save()}
          disabled={saving}
          className="mt-4 items-center rounded-lg bg-sky-600 py-3">
          <Text className="font-semibold text-white">
            {saving ? t('loading') : t('release_notes_save')}
          </Text>
        </Pressable>
        <Pressable onPress={() => setDraft(null)} className="mt-3 items-center py-2">
          <Text className="opacity-70">{t('back')}</Text>
        </Pressable>
      </ScrollView>
    )
  }

  return (
    <ScrollView className="flex-1 px-4 pt-3" contentContainerClassName="pb-16">
      {error ? <Text className="mb-3 text-red-500">{error}</Text> : null}
      <Pressable
        onPress={() => setDraft(EMPTY)}
        className="mb-4 items-center rounded-lg bg-sky-600 py-3">
        <Text className="font-semibold text-white">{t('release_notes_new')}</Text>
      </Pressable>
      {items.length === 0 ? (
        <Text className="text-center opacity-60">{t('release_notes_empty')}</Text>
      ) : (
        items.map(item => (
          <RNView key={item.id} className="mb-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <Pressable
              onPress={() =>
                setDraft({
                  id: item.id,
                  title: item.title,
                  body: item.body,
                  kind: item.kind,
                  audiences: item.audiences,
                  hidden: item.hidden,
                })
              }>
              <Text className="font-semibold">{item.title}</Text>
              <Text className="mt-1 text-xs opacity-60">
                {t(`release_notes_kind_${item.kind}`)}
                {item.hidden ? ` · ${t('release_notes_hidden')}` : ''}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void setHidden(item.id, !item.hidden).then(ok => {
                  if (ok) void load()
                })
              }}
              className="mt-2">
              <Text className="text-sm text-sky-700 dark:text-sky-300">
                {item.hidden ? t('release_notes_show') : t('release_notes_hide')}
              </Text>
            </Pressable>
          </RNView>
        ))
      )}
    </ScrollView>
  )
}
