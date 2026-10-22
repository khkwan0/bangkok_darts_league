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
  StyleSheet,
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
      {/*
        Backdrop dismiss via absolute Pressable — do not wrap the card in
        Pressable. Nested Pressables swallow touches from native VideoView
        controls (play button never fires).
      */}
      <View className="flex-1 justify-center px-4 py-8">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('close')}
          style={[StyleSheet.absoluteFillObject, styles.backdrop]}
          disabled={submitting}
          onPress={() => {
            if (!submitting) {
              onDismiss()
            }
          }}
        />
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
            nestedScrollEnabled
            showsVerticalScrollIndicator>
            <Text type="subtitle" className="mb-2">
              {announcement.title}
            </Text>
            {visible ? (
              <ChatMarkdown content={content} textColor={textColor} />
            ) : null}
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
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
})
