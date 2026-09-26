import Button from '@/components/Button'
import {ChatMarkdown} from '@/components/ChatMarkdown'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {resolveAnnouncementContent} from '@/lib/announcementContent'
import type {Announcement} from '@/types/announcements'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  useColorScheme,
  useWindowDimensions,
} from 'react-native'

const DIALOG_FOOTER_HEIGHT = 76

type AnnouncementDialogProps = {
  announcement: Announcement | null
  visible: boolean
  submitting: boolean
  onDismiss: () => void
}

export default function AnnouncementDialog({
  announcement,
  visible,
  submitting,
  onDismiss,
}: AnnouncementDialogProps) {
  const {t} = useTranslation()
  const {apiUrl} = useLeagueContext()
  const colorScheme = useColorScheme()
  const {height: windowHeight} = useWindowDimensions()
  const textColor = colorScheme === 'dark' ? '#e5e7eb' : '#111827'
  const scrollMaxHeight = Math.max(
    120,
    windowHeight * 0.85 - DIALOG_FOOTER_HEIGHT,
  )

  const content = React.useMemo(() => {
    if (!announcement?.content) {
      return ''
    }
    return resolveAnnouncementContent(announcement.content, apiUrl)
  }, [announcement?.content, apiUrl])

  if (!announcement) {
    return null
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!submitting) {
          onDismiss()
        }
      }}>
      <Pressable
        className="flex-1 justify-center bg-black/60 px-4 py-8"
        onPress={() => {
          if (!submitting) {
            onDismiss()
          }
        }}>
        <Pressable className="w-full" onPress={() => {}}>
          <View className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <ScrollView
              style={{maxHeight: scrollMaxHeight}}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 16,
                flexGrow: 0,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator>
              <Text type="subtitle" className="mb-2">
                {announcement.title}
              </Text>
              <ChatMarkdown content={content} textColor={textColor} />
            </ScrollView>
            <View className="border-t border-slate-200 px-5 py-4 dark:border-slate-700">
              {submitting ? (
                <View className="flex-row items-center justify-center gap-2 py-2">
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text className="text-slate-600 dark:text-slate-300">
                    {t('submitting')}
                  </Text>
                </View>
              ) : (
                <Button onPress={onDismiss}>{t('announcements_got_it')}</Button>
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
