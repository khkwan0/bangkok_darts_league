import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useColorScheme,
  View as RNView,
} from 'react-native'

export type ForumTopicOptionField = 'is_pinned' | 'is_locked' | 'is_hidden'

type ForumTopicOptionsProps = {
  isPinned: boolean
  isLocked: boolean
  isHidden: boolean
  canPin?: boolean
  canLockHide?: boolean
  showEdit?: boolean
  loadingField: ForumTopicOptionField | null
  onToggle: (field: ForumTopicOptionField, nextValue: boolean) => void
  onEdit: () => void
}

function OptionButton({
  label,
  loading,
  onPress,
  danger = false,
}: {
  label: string
  loading: boolean
  onPress: () => void
  danger?: boolean
}) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <RNView style={styles.optionWrap}>
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={[
          styles.optionButton,
          danger
            ? isDark
              ? styles.optionButtonDangerDark
              : styles.optionButtonDangerLight
            : isDark
              ? styles.optionButtonDark
              : styles.optionButtonLight,
          loading ? styles.optionButtonLoading : null,
        ]}>
        {loading ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text
            className="text-xs font-semibold"
            style={{
              color: danger
                ? isDark
                  ? '#fca5a5'
                  : '#b91c1c'
                : isDark
                  ? '#e2e8f0'
                  : '#334155',
            }}>
            {label}
          </Text>
        )}
      </Pressable>
    </RNView>
  )
}

export default function ForumTopicOptions({
  isPinned,
  isLocked,
  isHidden,
  canPin = false,
  canLockHide = false,
  showEdit = true,
  loadingField,
  onToggle,
  onEdit,
}: ForumTopicOptionsProps) {
  const {t} = useTranslation()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const hasModerationActions = canPin || canLockHide

  return (
    <View
      className="mb-4 rounded-xl p-3"
      style={{
        backgroundColor: isDark
          ? 'rgba(148, 163, 184, 0.1)'
          : 'rgba(241, 245, 249, 0.95)',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(203, 213, 225, 0.9)',
      }}>
      {hasModerationActions ? (
        <>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">
            {t('forums_topic_options')}
          </Text>
          <RNView style={styles.optionsRow}>
            {canPin ? (
              <OptionButton
                label={isPinned ? t('forums_unpin') : t('forums_pin')}
                loading={loadingField === 'is_pinned'}
                onPress={() => onToggle('is_pinned', !isPinned)}
              />
            ) : null}
            {canLockHide ? (
              <>
                <OptionButton
                  label={isLocked ? t('forums_unlock') : t('forums_lock')}
                  loading={loadingField === 'is_locked'}
                  onPress={() => onToggle('is_locked', !isLocked)}
                />
                <OptionButton
                  label={isHidden ? t('forums_unhide') : t('forums_hide')}
                  loading={loadingField === 'is_hidden'}
                  onPress={() => onToggle('is_hidden', !isHidden)}
                  danger
                />
              </>
            ) : null}
          </RNView>
        </>
      ) : null}
      {showEdit ? (
        <Pressable
          onPress={onEdit}
          style={[
            styles.editButton,
            isDark ? styles.editButtonDark : styles.editButtonLight,
          ]}>
          <Text
            className="text-xs font-semibold"
            style={{color: isDark ? '#90CAF9' : '#1565C0'}}>
            {t('forums_edit_topic')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginBottom: 8,
    marginHorizontal: -4,
  },
  optionWrap: {
    alignSelf: 'flex-start',
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  optionButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionButtonLight: {
    backgroundColor: 'rgba(226, 232, 240, 0.95)',
  },
  optionButtonDark: {
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
  },
  optionButtonDangerLight: {
    backgroundColor: 'rgba(254, 226, 226, 0.95)',
  },
  optionButtonDangerDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  optionButtonLoading: {
    opacity: 0.6,
  },
  editButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editButtonLight: {
    borderColor: 'rgba(33, 150, 243, 0.35)',
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
  },
  editButtonDark: {
    borderColor: 'rgba(96, 165, 250, 0.45)',
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
  },
})
