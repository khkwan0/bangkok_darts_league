import {MaterialCommunityIcons} from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Modal, Pressable, Text, useColorScheme, View} from 'react-native'

type MergeRosterHintProps = {
  className?: string
  titleClassName?: string
  onMergeHistory: () => void
}

/** Roster row that explains how a scanned account merges into the one tapped. */
export default function MergeRosterHint({
  className = 'mb-2 px-2',
  titleClassName = 'text-sm',
  onMergeHistory,
}: MergeRosterHintProps) {
  const {t} = useTranslation()
  const isDark = useColorScheme() === 'dark'
  const [open, setOpen] = React.useState(false)
  const [historyBusy, setHistoryBusy] = React.useState(false)
  const historyLock = React.useRef(false)
  const historyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (historyTimer.current) clearTimeout(historyTimer.current)
    }
  }, [])

  function openDialog() {
    if (open) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
  }

  function handleMergeHistory() {
    if (historyLock.current) return
    historyLock.current = true
    setHistoryBusy(true)
    setOpen(false)
    onMergeHistory()
    if (historyTimer.current) clearTimeout(historyTimer.current)
    historyTimer.current = setTimeout(() => {
      historyLock.current = false
      setHistoryBusy(false)
    }, 800)
  }

  return (
    <View className={className}>
      <Pressable
        onPress={openDialog}
        accessibilityRole="button"
        accessibilityLabel={t('merge_player_roster_title')}
        className="w-full flex-row items-center justify-center gap-1.5 py-1 active:opacity-70">
        <Text
          className={`text-center text-gray-600 dark:text-gray-400 ${titleClassName}`}>
          {t('merge_player_roster_title')}
        </Text>
        <MaterialCommunityIcons
          name="information-outline"
          size={18}
          color={isDark ? '#94A3B8' : '#64748B'}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closeDialog}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 px-6"
          onPress={closeDialog}>
          <Pressable
            className="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-gray-800"
            onPress={event => event.stopPropagation()}>
            <Text className="mb-4 text-center text-lg font-semibold text-slate-800 dark:text-slate-100">
              {t('merge_player_roster_title')}
            </Text>

            <View className="mb-4">
              <Text className="mb-1 font-semibold text-slate-800 dark:text-slate-100">
                {t('merge_player_roster_step_1')}
              </Text>
              <Text className="text-sm leading-5 text-gray-600 dark:text-gray-300">
                {t('merge_player_roster_step_1_body')}
              </Text>
            </View>

            <View className="mb-5">
              <Text className="mb-1 font-semibold text-slate-800 dark:text-slate-100">
                {t('merge_player_roster_step_2')}
              </Text>
              <Text className="text-sm leading-5 text-gray-600 dark:text-gray-300">
                {t('merge_player_roster_step_2_body')}
              </Text>
            </View>

            <Pressable
              onPress={handleMergeHistory}
              disabled={historyBusy}
              accessibilityRole="button"
              className="mb-2 rounded-xl border border-gray-200 py-3 active:opacity-70 disabled:opacity-50 dark:border-gray-600">
              <Text className="text-center font-semibold text-blue-700 dark:text-blue-300">
                {t('team_merge_history')}
              </Text>
            </Pressable>
            <Pressable
              onPress={closeDialog}
              className="rounded-xl bg-blue-600 py-3 active:bg-blue-700">
              <Text className="text-center font-semibold text-white">
                {t('ok')}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
