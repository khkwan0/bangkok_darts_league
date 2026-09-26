import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, useColorScheme} from 'react-native'

export type ForumPostSortOrder = 'asc' | 'desc'

type ForumPostsControlsProps = {
  sortOrder: ForumPostSortOrder
  onSortChange: (sort: ForumPostSortOrder) => void
  totalPosts: number
}

function SortChip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string
  active: boolean
  onPress: () => void
  icon: React.ComponentProps<typeof MCI>['name']
}) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center justify-center rounded-xl px-3 py-2.5"
      style={{
        backgroundColor: active
          ? isDark
            ? 'rgba(33, 150, 243, 0.28)'
            : 'rgba(33, 150, 243, 0.14)'
          : isDark
            ? 'rgba(148, 163, 184, 0.12)'
            : 'rgba(148, 163, 184, 0.14)',
        borderWidth: 1,
        borderColor: active
          ? isDark
            ? 'rgba(96, 165, 250, 0.45)'
            : 'rgba(33, 150, 243, 0.35)'
          : 'transparent',
      }}>
      <MCI
        name={icon}
        size={16}
        color={active ? (isDark ? '#90CAF9' : '#1565C0') : isDark ? '#94a3b8' : '#64748b'}
        style={{marginRight: 6}}
      />
      <Text
        className="text-sm font-semibold"
        style={{
          color: active ? (isDark ? '#90CAF9' : '#1565C0') : isDark ? '#cbd5e1' : '#475569',
        }}>
        {label}
      </Text>
    </Pressable>
  )
}

export default function ForumPostsControls({
  sortOrder,
  onSortChange,
  totalPosts,
}: ForumPostsControlsProps) {
  const {t} = useTranslation()

  return (
    <View className="mb-4 mt-2">
      <Text className="mb-2 text-sm font-semibold opacity-70">
        {t('forums_replies_heading', {count: totalPosts})}
      </Text>

      <View className="flex-row gap-2">
        <SortChip
          label={t('forums_sort_oldest')}
          active={sortOrder === 'asc'}
          onPress={() => onSortChange('asc')}
          icon="arrow-up"
        />
        <SortChip
          label={t('forums_sort_newest')}
          active={sortOrder === 'desc'}
          onPress={() => onSortChange('desc')}
          icon="arrow-down"
        />
      </View>
    </View>
  )
}
