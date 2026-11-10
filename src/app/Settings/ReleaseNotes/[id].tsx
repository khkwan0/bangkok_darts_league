import {ChatMarkdown} from '@/components/ChatMarkdown'
import {formatForumDate} from '@/components/Forums/formatForumDate'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {
  releaseNoteClientScope,
  releaseNoteSportScope,
  useReleaseNotes,
  type ReleaseNote,
} from '@/hooks/useReleaseNotes'
import {useLocalSearchParams, useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {ActivityIndicator, ScrollView, useColorScheme} from 'react-native'

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

export default function ReleaseNoteDetailScreen() {
  const {t, i18n} = useTranslation()
  const navigation = useNavigation()
  const params = useLocalSearchParams<{id: string}>()
  const id = parseInt(firstParam(params.id) ?? '', 10)
  const {getPublic} = useReleaseNotes()
  const colorScheme = useColorScheme()
  const textColor = colorScheme === 'dark' ? '#e5e7eb' : '#111827'
  const [note, setNote] = React.useState<ReleaseNote | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    navigation.setOptions({title: t('release_notes')})
  }, [navigation, t])

  React.useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false)
      return
    }
    let cancelled = false
    void getPublic(id).then(result => {
      if (cancelled) return
      setNote(result)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [getPublic, id])

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!note) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center opacity-70">{t('release_notes_not_found')}</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 px-4 pt-3" contentContainerClassName="pb-10">
      <Text className="text-xs font-semibold uppercase opacity-60">
        {t(`release_notes_kind_${note.kind}`)}
        {' · '}
        {t(`release_notes_sport_${releaseNoteSportScope(note.audiences)}`)}
        {' · '}
        {t(`release_notes_client_${releaseNoteClientScope(note.audiences)}`)}
      </Text>
      <Text className="mt-1 text-xl font-semibold">{note.title}</Text>
      <Text className="mt-1 text-xs opacity-50">
        {formatForumDate(note.created_at, i18n.language)}
      </Text>
      <View className="mt-4">
        <ChatMarkdown content={note.body} textColor={textColor} />
      </View>
    </ScrollView>
  )
}
