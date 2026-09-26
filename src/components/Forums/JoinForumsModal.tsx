import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Modal, Pressable} from 'react-native'

type JoinForumsModalProps = {
  visible: boolean
  joining: boolean
  error: string | null
  onJoin: () => void
}

export default function JoinForumsModal({
  visible,
  joining,
  error,
  onJoin,
}: JoinForumsModalProps) {
  const {t} = useTranslation()
  const {state} = useLeagueContext()
  const user = state.user
  const displayName =
    user?.nickname?.trim() ||
    [user?.firstname ?? user?.first_name, user?.lastname ?? user?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    t('forums_guest_name')

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable className="flex-1 justify-center bg-black/50 px-6">
        <View className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <Text type="subtitle" className="mb-3">
            {t('forums_join_title', {name: displayName})}
          </Text>
          <Text className="text-slate-600 dark:text-slate-300">
            {t('forums_join_body')}
          </Text>
          {error ? (
            <Text className="mt-3 text-red-600 dark:text-red-400">{error}</Text>
          ) : null}
          <View className="mt-6">
            <Button onPress={onJoin} disabled={joining}>
              {joining ? t('forums_joining') : t('forums_join_continue')}
            </Button>
          </View>
        </View>
      </Pressable>
    </Modal>
  )
}
