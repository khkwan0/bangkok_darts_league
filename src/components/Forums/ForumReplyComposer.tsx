import Button from '@/components/Button'
import {ForumContentInput} from '@/components/Forums/ForumContentInput'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  useColorScheme,
  useWindowDimensions,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

const REPLY_INPUT_MIN_HEIGHT = 160

type ForumReplyFabProps = {
  onPress: () => void
}

export function ForumReplyFab({onPress}: ForumReplyFabProps) {
  const {t} = useTranslation()
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Pressable
      onPress={onPress}
      className="absolute right-4 flex-row items-center rounded-full px-5 py-3.5"
      style={{
        bottom: insets.bottom + 16,
        backgroundColor: '#2196F3',
        shadowColor: '#1565C0',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: isDark ? 0.4 : 0.28,
        shadowRadius: 8,
        elevation: 6,
      }}>
      <MCI name="reply" size={20} color="#fff" style={{marginRight: 8}} />
      <Text className="font-bold text-white">{t('forums_reply')}</Text>
    </Pressable>
  )
}

type ForumReplyComposerProps = {
  value: string
  onChangeText: (text: string) => void
  isAnonymous: boolean
  onAnonymousChange: (value: boolean) => void
  onSubmit: () => void
  onCancel: () => void
  submitting: boolean
  error: string | null
  maxLength?: number
}

export function ForumReplyComposer({
  value,
  onChangeText,
  isAnonymous,
  onAnonymousChange,
  onSubmit,
  onCancel,
  submitting,
  error,
  maxLength,
}: ForumReplyComposerProps) {
  const {t} = useTranslation()
  const insets = useSafeAreaInsets()
  const {height: windowHeight} = useWindowDimensions()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const sheetBg = isDark ? '#0f172a' : '#ffffff'
  const inputBg = isDark ? '#1e293b' : '#f1f5f9'
  const inputBorder = isDark ? 'rgba(96, 165, 250, 0.35)' : 'rgba(33, 150, 243, 0.28)'
  const accent = isDark ? '#60a5fa' : '#1565C0'

  return (
    <View
      style={{
        maxHeight: windowHeight * 0.62,
        paddingBottom: Math.max(insets.bottom, 16),
        backgroundColor: sheetBg,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: isDark ? 'rgba(96, 165, 250, 0.25)' : 'rgba(33, 150, 243, 0.18)',
        shadowColor: '#1565C0',
        shadowOffset: {width: 0, height: -4},
        shadowOpacity: isDark ? 0.25 : 0.12,
        shadowRadius: 12,
        elevation: 12,
      }}>
      <View className="items-center pt-2.5">
        <View
          className="h-1 rounded-full"
          style={{
            width: 40,
            backgroundColor: isDark ? 'rgba(148, 163, 184, 0.5)' : 'rgba(148, 163, 184, 0.65)',
          }}
        />
      </View>

      <View
        className="mx-4 mt-3 h-1 rounded-full"
        style={{backgroundColor: isDark ? 'rgba(96, 165, 250, 0.45)' : 'rgba(33, 150, 243, 0.35)'}}
      />

      <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
        <View className="flex-row items-center">
          <View
            className="mr-2.5 h-9 w-9 items-center justify-center rounded-full"
            style={{backgroundColor: isDark ? 'rgba(37, 99, 235, 0.28)' : 'rgba(33, 150, 243, 0.14)'}}>
            <MCI name="reply" size={18} color={accent} />
          </View>
          <View>
            <Text className="text-base font-bold" style={{color: accent}}>
              {t('forums_write_reply')}
            </Text>
            <Text className="text-xs opacity-60">{t('forums_reply_hint')}</Text>
          </View>
        </View>
        <Pressable
          onPress={onCancel}
          hitSlop={10}
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{backgroundColor: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.2)'}}>
          <MCI name="close" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
        </Pressable>
      </View>

      <View className="px-4 pb-3">
        <ForumContentInput
          value={value}
          onChangeText={onChangeText}
          attachDisabled={submitting}
          placeholder={t('forums_reply_placeholder')}
          multiline
          maxLength={maxLength}
          textAlignVertical="top"
          scrollEnabled
          containerStyle={{
            alignItems: 'stretch',
            minHeight: REPLY_INPUT_MIN_HEIGHT + 24,
            backgroundColor: inputBg,
            borderColor: inputBorder,
            borderRadius: 16,
            paddingVertical: 0,
          }}
          inputStyle={{
            height: REPLY_INPUT_MIN_HEIGHT,
            minHeight: REPLY_INPUT_MIN_HEIGHT,
            maxHeight: REPLY_INPUT_MIN_HEIGHT + 40,
            paddingTop: 12,
            paddingBottom: 12,
            paddingHorizontal: 14,
            lineHeight: 22,
            fontSize: 16,
          }}
          autoFocus
        />
      </View>

      <View className="px-4 pb-2">
        <Pressable
          onPress={() => onAnonymousChange(!isAnonymous)}
          disabled={submitting}
          className="flex-row items-center self-start rounded-full px-3 py-2"
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
      </View>

      {error ? (
        <Text className="mb-2 px-4 text-sm text-red-600 dark:text-red-400">{error}</Text>
      ) : null}

      <View className="flex-row gap-3 px-4 pb-1">
        <View className="flex-1">
          <Button type="outline" onPress={onCancel} disabled={submitting} small>
            cancel
          </Button>
        </View>
        <View className="flex-1">
          <Button
            onPress={onSubmit}
            disabled={submitting || !value.trim() || (maxLength != null && value.length > maxLength)}
            small
            icon={submitting ? <ActivityIndicator color="#fff" size="small" /> : undefined}>
            {submitting ? 'forums_posting' : 'forums_post_reply'}
          </Button>
        </View>
      </View>
    </View>
  )
}
