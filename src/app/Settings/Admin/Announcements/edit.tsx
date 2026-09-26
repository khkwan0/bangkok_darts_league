import {AnnouncementImageAttachButton} from '@/components/Announcements/AnnouncementImageAttachButton'
import Button from '@/components/Button'
import {ChatMarkdown} from '@/components/ChatMarkdown'
import TextInput from '@/components/TextInput'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useAnnouncements} from '@/hooks/useAnnouncements'
import {useLeagueContext} from '@/context/LeagueContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {resolveAnnouncementContent} from '@/lib/announcementContent'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useLocalSearchParams, useNavigation, useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  useColorScheme,
} from 'react-native'

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

type MarkdownAction = {
  icon: React.ComponentProps<typeof MCI>['name']
  label: string
  snippet: string
}

export default function AdminAnnouncementEditScreen() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const params = useLocalSearchParams<{id?: string; new?: string}>()
  const isNew = firstParam(params.new) === '1'
  const editId = parseInt(firstParam(params.id) ?? '', 10)
  const {state, apiUrl} = useLeagueContext()
  const {adminGetAnnouncement, adminCreate, adminUpdate} = useAnnouncements()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const textColor = isDark ? '#e5e7eb' : '#111827'
  const accent = isDark ? '#60a5fa' : '#1565C0'

  const [loading, setLoading] = React.useState(!isNew)
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [showPreview, setShowPreview] = React.useState(false)

  React.useEffect(() => {
    navigation.setOptions({
      title: isNew ? t('announcements_create') : t('announcements_edit'),
    })
  }, [navigation, isNew, t])

  React.useEffect(() => {
    if (!isLeagueAdmin(state.user)) {
      router.replace('/Settings/Admin')
    }
  }, [state.user, router])

  React.useEffect(() => {
    if (isNew || !Number.isFinite(editId) || editId <= 0) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const data = await adminGetAnnouncement(editId)
        if (data) {
          setTitle(data.title)
          setContent(data.content)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [isNew, editId, adminGetAnnouncement])

  const markdownActions: MarkdownAction[] = [
    {icon: 'format-bold', label: 'Bold', snippet: '**text**'},
    {icon: 'format-italic', label: 'Italic', snippet: '*text*'},
    {icon: 'link-variant', label: 'Link', snippet: '[label](https://)'},
    {icon: 'format-list-bulleted', label: 'List', snippet: '\n- item\n'},
  ]

  function insertSnippet(snippet: string) {
    setContent(prev => (prev ? `${prev}${snippet}` : snippet.trim()))
  }

  async function handleSave() {
    if (!title.trim()) {
      setError(t('announcements_title_required'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const payload = {title: title.trim(), content: content ?? ''}
      const res = isNew
        ? await adminCreate(payload)
        : await adminUpdate({id: editId, ...payload})
      if (res.status === 'ok') {
        router.back()
        return
      }
      setError(t('something_went_wrong'))
    } catch (e) {
      console.error(e)
      setError(t('something_went_wrong'))
    } finally {
      setSubmitting(false)
    }
  }

  const previewContent = React.useMemo(() => {
    if (!apiUrl) return content
    return resolveAnnouncementContent(content, apiUrl)
  }, [content, apiUrl])

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{padding: 16, paddingBottom: 32}}
      keyboardShouldPersistTaps="handled">
      {error ? <Text className="mb-4 text-sm text-red-500">{error}</Text> : null}

      <Text className="mb-2 text-sm font-semibold">{t('announcements_title')}</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t('announcements_title')}
      />

      <Text className="mb-2 mt-4 text-sm font-semibold">
        {t('announcements_content')}
      </Text>
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder={t('announcements_content_placeholder')}
        multiline
        inputStyle={{
          minHeight: 160,
          paddingTop: 12,
          paddingBottom: 12,
          textAlignVertical: 'top',
        }}
      />

      <View className="mt-3 flex-row flex-wrap gap-2">
        {markdownActions.map(action => (
          <Pressable
            key={action.label}
            onPress={() => insertSnippet(action.snippet)}
            disabled={submitting}
            className="flex-row items-center rounded-full px-3 py-2"
            style={{
              backgroundColor: isDark
                ? 'rgba(148, 163, 184, 0.12)'
                : 'rgba(148, 163, 184, 0.14)',
              opacity: submitting ? 0.55 : 1,
            }}>
            <MCI name={action.icon} size={16} color={accent} style={{marginRight: 6}} />
            <Text className="text-xs font-semibold" style={{color: accent}}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mt-2">
        <AnnouncementImageAttachButton
          disabled={submitting}
          onInsert={insertSnippet}
        />
      </View>

      <Pressable
        onPress={() => setShowPreview(prev => !prev)}
        className="mt-4 self-start">
        <Text className="text-sm font-semibold" style={{color: accent}}>
          {showPreview ? t('announcements_hide_preview') : t('announcements_show_preview')}
        </Text>
      </Pressable>

      {showPreview ? (
        <View
          className="mt-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
          style={{backgroundColor: isDark ? 'rgba(148,163,184,0.08)' : '#f8fafc'}}>
          <Text type="defaultSemiBold" className="mb-3">
            {title.trim() || t('announcements_title')}
          </Text>
          <ChatMarkdown content={previewContent} textColor={textColor} />
        </View>
      ) : null}

      <View className="mt-6 flex-row gap-3">
        <View className="flex-1">
          <Button onPress={handleSave} disabled={submitting || !title.trim()}>
            {submitting ? t('submitting') : t('save')}
          </Button>
        </View>
        <View className="flex-1">
          <Button onPress={() => router.back()} disabled={submitting} type="outline">
            {t('cancel')}
          </Button>
        </View>
      </View>
    </ScrollView>
  )
}
