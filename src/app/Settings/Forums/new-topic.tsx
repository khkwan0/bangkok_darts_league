import AppSwitch from '@/components/AppSwitch'
import Button from '@/components/Button'
import TextInput from '@/components/TextInput'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {ForumCharCounter} from '@/components/Forums/ForumCharCounter'
import {ForumContentInput} from '@/components/Forums/ForumContentInput'
import {useForumSettings, forumLengthErrorKey} from '@/hooks/useForumSettings'
import {useForums} from '@/hooks/useForums'
import type {ForumBoard} from '@/types/forums'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useTheme} from "expo-router/react-navigation"
import {useLocalSearchParams, useRouter, Stack} from 'expo-router'
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

export default function ForumNewTopic() {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const params = useLocalSearchParams<{
    categorySlug: string
    forumSlug: string
    forumName?: string
  }>()
  const {getForum, createTopic} = useForums()
  const {settings: forumSettings} = useForumSettings()

  const cat = firstParam(params.categorySlug)
  const forumKey = firstParam(params.forumSlug)
  const headerTitle = firstParam(params.forumName) ?? t('forums_new_topic')

  const [forum, setForum] = React.useState<ForumBoard | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [isAnonymous, setIsAnonymous] = React.useState(false)
  const [isPinned, setIsPinned] = React.useState(false)
  const [isLocked, setIsLocked] = React.useState(false)
  const [isHidden, setIsHidden] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!cat || !forumKey) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const board = await getForum(cat, forumKey)
        setForum(board)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [cat, forumKey, getForum])

  async function handleSubmit() {
    if (!cat || !forumKey || !title.trim()) {
      setError(t('forums_topic_title_required'))
      return
    }
    if (forum?.is_locked) {
      setError(t('forums_forum_locked'))
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const payload: Parameters<typeof createTopic>[2] = {
        title: title.trim(),
        content: content.trim(),
        is_anonymous: isAnonymous,
      }
      if (canPin) {
        payload.is_pinned = isPinned
      }
      if (canLockHide) {
        payload.is_locked = isLocked
        payload.is_hidden = isHidden
      }

      const result = await createTopic(cat, forumKey, payload)
      if (result.status === 'ok' && result.topic_slug) {
        router.replace({
          pathname: '/Settings/Forums/topic',
          params: {
            categorySlug: cat,
            forumSlug: forumKey,
            topicSlug: result.topic_slug,
            title: title.trim(),
          },
        })
        return
      }
      if (result.error === 'topic_title_required') {
        setError(t('forums_topic_title_required'))
      } else if (result.error === 'locked') {
        setError(t('forums_forum_locked'))
      } else if (result.error === 'unauthorized') {
        setError(t('forums_login_required'))
      } else {
        const lengthKey = forumLengthErrorKey(result.error ?? '')
        setError(
          lengthKey
            ? t(lengthKey, {max: result.max_length ?? 0})
            : t('forums_create_failed'),
        )
      }
    } catch (e) {
      console.error(e)
      setError(t('forums_create_failed'))
    } finally {
      setSubmitting(false)
    }
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

  if (loading) {
    return (
      <>
        <Stack.Screen options={{title: t('forums_new_topic')}} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    )
  }

  if (!forum) {
    return (
      <>
        <Stack.Screen options={{title: t('forums_new_topic')}} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center opacity-70">{t('forums_load_error')}</Text>
        </View>
      </>
    )
  }

  if (forum.is_locked) {
    return (
      <>
        <Stack.Screen options={{title: headerTitle}} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center opacity-70">{t('forums_forum_locked')}</Text>
        </View>
      </>
    )
  }

  const accent = isDark ? '#60a5fa' : '#1565C0'
  const canPin = Boolean(forum.can_pin)
  const canLockHide = forum.can_lock_hide ?? true
  const showTopicOptions = canPin || canLockHide

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

        <Pressable
          onPress={() => setIsAnonymous(prev => !prev)}
          disabled={submitting}
          className="mt-4 flex-row items-center self-start rounded-full px-3 py-2"
          style={{
            backgroundColor: isAnonymous
              ? isDark
                ? 'rgba(148, 163, 184, 0.22)'
                : 'rgba(100, 116, 139, 0.14)'
              : isDark
                ? 'rgba(148, 163, 184, 0.1)'
                : 'rgba(148, 163, 184, 0.12)',
            borderWidth: 1,
            borderColor: isAnonymous
              ? isDark
                ? 'rgba(148, 163, 184, 0.45)'
                : 'rgba(100, 116, 139, 0.35)'
              : 'transparent',
            opacity: submitting ? 0.6 : 1,
          }}>
          <MCI
            name={isAnonymous ? 'incognito' : 'account-outline'}
            size={18}
            color={isAnonymous ? (isDark ? '#cbd5e1' : '#475569') : accent}
            style={{marginRight: 8}}
          />
          <Text
            className="text-sm font-semibold"
            style={{
              color: isAnonymous
                ? isDark
                  ? '#e2e8f0'
                  : '#475569'
                : accent,
            }}>
            {t('forums_post_anonymous')}
          </Text>
        </Pressable>

        {showTopicOptions ? (
          <View
            className="mt-6 rounded-xl p-4"
            style={{
              backgroundColor: isDark ? 'rgba(148, 163, 184, 0.1)' : '#f8fafc',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#e2e8f0',
            }}>
            <Text className="mb-4 text-sm font-semibold">{t('forums_topic_options')}</Text>
            {canPin ? (
              <OptionRow
                label={t('forums_option_pin')}
                hint={t('forums_option_pin_hint')}
                value={isPinned}
                onValueChange={setIsPinned}
              />
            ) : null}
            {canLockHide ? (
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
        ) : null}

        <View className="mt-6 flex-row gap-3">
          <View className="flex-1">
            <Button
              onPress={handleSubmit}
              disabled={
                submitting ||
                !title.trim() ||
                title.length > forumSettings.topic_title_max_length ||
                content.length > forumSettings.opening_post_max_length
              }>
              {submitting ? t('forums_posting') : t('forums_post_topic')}
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
