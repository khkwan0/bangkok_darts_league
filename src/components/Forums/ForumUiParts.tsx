import {getForumAccent} from '@/components/Forums/forumUi'
import {ThemedText as Text} from '@/components/ThemedText'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useTheme} from "expo-router/react-navigation"
import React from 'react'
import {StyleSheet, useColorScheme, View} from 'react-native'

type ForumStatChipProps = {
  icon: React.ComponentProps<typeof MCI>['name']
  label: string
  fg: string
  bg: string
}

export function ForumStatChip({icon, label, fg, bg}: ForumStatChipProps) {
  return (
    <View style={[styles.chip, {backgroundColor: bg}]}>
      <MCI name={icon} size={12} color={fg} style={{marginRight: 4}} />
      <Text className="text-xs font-semibold" style={{color: fg}}>
        {label}
      </Text>
    </View>
  )
}

type ForumIconBadgeProps = {
  icon: React.ComponentProps<typeof MCI>['name']
  fg: string
  bg: string
  size?: number
}

export function ForumIconBadge({
  icon,
  fg,
  bg,
  size = 44,
}: ForumIconBadgeProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
      }}>
      <MCI name={icon} size={size * 0.5} color={fg} />
    </View>
  )
}

type ForumsHeroProps = {
  title: string
  subtitle: string
}

export function ForumsHero({title, subtitle}: ForumsHeroProps) {
  const {colors} = useTheme()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const dividerColor = isDark
    ? 'rgba(148, 163, 184, 0.2)'
    : 'rgba(148, 163, 184, 0.25)'

  return (
    <View
      style={{
        paddingTop: 4,
        paddingBottom: 16,
        marginBottom: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: dividerColor,
      }}>
      <View style={styles.heroRow}>
        <ForumIconBadge
          icon="forum-outline"
          fg="#1565C0"
          bg={isDark ? 'rgba(21, 101, 192, 0.35)' : 'rgba(21, 101, 192, 0.12)'}
          size={48}
        />
        <View style={styles.heroText}>
          <Text style={[styles.heroTitle, {color: colors.text}]}>{title}</Text>
          <Text style={[styles.heroSubtitle, {color: colors.text}]}>{subtitle}</Text>
        </View>
      </View>
    </View>
  )
}

type ForumSectionHeaderProps = {
  title: string
  description: string | null
  accentIndex: number
}

export function ForumSectionHeader({
  title,
  description,
  accentIndex,
}: ForumSectionHeaderProps) {
  const accent = getForumAccent(accentIndex)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const dividerColor = isDark
    ? 'rgba(148, 163, 184, 0.2)'
    : 'rgba(148, 163, 184, 0.25)'

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderRow}>
        <ForumIconBadge
          icon="shape-outline"
          fg={accent.fg}
          bg={accent.bg}
          size={36}
        />
        <View style={styles.sectionHeaderText}>
          <Text className="text-base font-bold" style={{color: accent.fg}}>
            {title}
          </Text>
          {description ? (
            <Text className="mt-0.5 text-sm opacity-70">{description}</Text>
          ) : null}
        </View>
      </View>
      <View
        style={{
          marginTop: 12,
          height: StyleSheet.hairlineWidth,
          backgroundColor: dividerColor,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroText: {
    marginLeft: 12,
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
})
