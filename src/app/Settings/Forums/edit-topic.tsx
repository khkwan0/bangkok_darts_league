import AppSwitch from '@/components/AppSwitch'
import Button from '@/components/Button'
import TextInput from '@/components/TextInput'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {ForumCharCounter} from '@/components/Forums/ForumCharCounter'
import {ForumContentInput} from '@/components/Forums/ForumContentInput'
import {useForumSettings, forumLengthErrorKey} from '@/hooks/useForumSettings'
import {useForums} from '@/hooks/useForums'
import type {ForumTopicDetail} from '@/types/forums'
import {useTheme} from "expo-router/react-navigation"
import {useLocalSearchParams, useRouter, Stack} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  ScrollView,
  useColorScheme,
} from 'react-native'

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

export default function ForumEditTopic() {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const params = useLocalSearchParams<{
    categorySlug: string
    forumSlug: string
    topicSlug: string
    title?: string
  }>()
  const {getTopic, updateTopic} = useForums()
  const {settings: forumSettings} = useForumSettings()

  const cat = firstParam(params.categorySlug)
  const forumKey = firstParam(params.forumSlug)
  const topicKey = firstParam(params.topicSlug)
  const headerTitle = firstParam(params.title) ?? t('forums_edit_topic')

  const [detail, setDetail] = React.useState<ForumTopicDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [isPinned, setIsPinned] = React.useState(false)
  const [isLocked, setIsLocked] = React.useState(false)
  const [isHidden, setIsHidden] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!cat || !forumKey || !topicKey) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const topicDetail = await getTopic(cat, forumKey, topicKey)
        if (!topicDetail?.can_manage) {
          setDetail(null)
          return
        }
        setDetail(topicDetail)
        setTitle(topicDetail.topic.title)
        setContent(topicDetail.opening_post?.content ?? '')
        setIsPinned(topicDetail.topic.is_pinned)
        setIsLocked(topicDetail.topic.is_locked)
        setIsHidden(topicDetail.topic.is_hidden)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [cat, forumKey, topicKey, getTopic])

  async function handleSave() {
    if (!cat || !forumKey || !topicKey || !detail || !title.trim()) {
      setError(t('forums_topic_title_required'))
      return
    }
    try {
      setSubmitting(true)
      setError(null)
      const updates: {
        title: string
        content: string
        is_pinned?: boolean
        is_locked?: boolean
        is_hidden?: boolean
      } = {
        title: title.trim(),
        content,
      }
      if (detail.can_pin) {
        updates.is_pinned = isPinned
      }
      if (detail.can_lock_hide) {
        updates.is_locked = isLocked
        updates.is_hidden = isHidden
      }
      const result = await updateTopic(cat, forumKey, topicKey, updates)
      if (result.status === 'ok') {
        const nextSlug = result.topic_slug ?? topicKey
        router.replace({
          pathname: '/Settings/Forums/topic',
          params: {
            categorySlug: cat,
            forumSlug: forumKey,
            topicSlug: nextSlug,
            title: title.trim(),
          },
        })
        return
      }
      if (result.error === 'topic_title_required') {
        setError(t('forums_topic_title_required'))
      } else {
        const lengthKey = forumLengthErrorKey(result.error ?? '')
        setError(
          lengthKey
            ? t(lengthKey, {max: result.max_length ?? 0})
            : t('forums_update_failed'),
        )
      }
    } catch (e) {
      console.error(e)
      setError(t('forums_update_failed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{title: t('forums_edit_topic')}} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    )
  }

  if (!detail) {
    return (
      <>
        <Stack.Screen options={{title: t('forums_edit_topic')}} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center opacity-70">{t('forums_not_found')}</Text>
        </View>
      </>
    )
  }

  function OptionRow({
    label,
    hint,
    value,
    onValueChange,
  }: {
    label: string
    hint: string
    value: boolean
    onValueChange: (next: boolean) => void
  }) {
    return (
      <View className="mb-4 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-semibold">{label}</Text>
          <Text className="mt-0.5 text-xs opacity-60">{hint}</Text>
        </View>
        <AppSwitch value={value} onValueChange={onValueChange} />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen options={{title: headerTitle}} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{padding: 16, paddingBottom: 32}}
        keyboardShouldPersistTaps="handled">
        {error ? (
          <Text className="mb-4 text-sm text-red-500">{error}</Text>
        ) : null}

        <Text className="mb-2 text-sm font-semibold">{t('forums_topic_title')}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={forumSettings.topic_title_max_length}
          placeholder={t('forums_topic_title')}
        />
        <ForumCharCounter
          length={title.length}
          maxLength={forumSettings.topic_title_max_length}
          className="mt-1"
        />

        <Text className="mb-2 mt-4 text-sm font-semibold">
          {t('forums_message')}{' '}
          <Text className="text-xs font-normal opacity-60">({t('optional')})</Text>
        </Text>
        <ForumContentInput
          value={content}
          onChangeText={setContent}
          attachDisabled={submitting}
          placeholder={t('forums_message_placeholder')}
          multiline
          maxLength={forumSettings.opening_post_max_length}
          inputStyle={{
            minHeight: 140,
            paddingTop: 12,
            paddingBottom: 12,
            textAlignVertical: 'top',
          }}
        />

        {(detail.can_pin || detail.can_lock_hide) && (
          <View
            className="mt-6 rounded-xl p-4"
            style={{
              backgroundColor: isDark ? 'rgba(148, 163, 184, 0.1)' : '#f8fafc',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#e2e8f0',
            }}>
            <Text className="mb-4 text-sm font-semibold">{t('forums_topic_options')}</Text>
            {detail.can_pin ? (
              <OptionRow
                label={t('forums_option_pin')}
                hint={t('forums_option_pin_hint')}
                value={isPinned}
                onValueChange={setIsPinned}
              />
            ) : null}
            {detail.can_lock_hide ? (
              <>
                <OptionRow
                  label={t('forums_option_lock')}
                  hint={t('forums_option_lock_hint')}
                  value={isLocked}
                  onValueChange={setIsLocked}
                />
                <OptionRow
                  label={t('forums_option_hide')}
                  hint={t('forums_option_hide_hint')}
                  value={isHidden}
                  onValueChange={setIsHidden}
                />
              </>
            ) : null}
          </View>
        )}

        <View className="mt-6 flex-row gap-3">
          <View className="flex-1">
            <Button
              onPress={handleSave}
              disabled={
                submitting ||
                !title.trim() ||
                title.length > forumSettings.topic_title_max_length ||
                content.length > forumSettings.opening_post_max_length
              }>
              {submitting ? t('forums_saving') : t('forums_save_topic')}
            </Button>
          </View>
          <View className="flex-1">
            <Button onPress={() => router.back()} disabled={submitting} type="outline">
              {t('cancel')}
            </Button>
          </View>
        </View>
      </ScrollView>
    </>
  )
}
