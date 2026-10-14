import React from 'react'
import {View, StyleSheet, ScrollView} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useTranslation} from 'react-i18next'
import type {AchievementItem, PlayerAchievements} from '@/types/achievements'

const TIER_COLOR: Record<string, string> = {
  bronze: '#B45309',
  silver: '#94A3B8',
  gold: '#EAB308',
  platinum: '#22D3EE',
}

function BadgeImage({item}: {item: AchievementItem}) {
  const color = TIER_COLOR[item.tier] ?? TIER_COLOR.bronze
  const icon = (item.icon ||
    (item.kind === 'trophy' ? 'trophy' : 'medal')) as React.ComponentProps<
    typeof MCI
  >['name']

  return (
    <View
      style={[
        styles.medal,
        {
          borderColor: `${color}99`,
          backgroundColor: `${color}22`,
        },
      ]}
      accessibilityLabel={item.name.en}>
      <MCI name={icon} size={18} color={color} />
      <View
        style={[
          styles.kindDot,
          {
            backgroundColor:
              item.kind === 'trophy' ? '#EAB308' : '#94A3B8',
          },
        ]}
      />
    </View>
  )
}

/**
 * Compact hero strip: earned count + visual row of unlocked badge/trophy icons.
 */
export default function PlayerAchievementsHero({
  data,
}: {
  data: PlayerAchievements | null
}) {
  const {t} = useTranslation()

  if (!data) return null

  const unlocked = data.unlocked
  const preview = unlocked.slice(0, 12)

  return (
    <View style={styles.wrap}>
      <View style={styles.countRow}>
        <View style={[styles.countChip, {backgroundColor: '#EAB30822'}]}>
          <MCI name="trophy-variant" size={14} color="#EAB308" />
          <Text style={[styles.countText, {color: '#EAB308'}]}>
            {t('achievements_hero_count', {
              count: data.counts.total,
              available: data.counts.available,
            })}
          </Text>
        </View>
        {data.counts.trophies > 0 ? (
          <View style={[styles.countChip, {backgroundColor: '#EAB30818'}]}>
            <MCI name="trophy" size={13} color="#EAB308" />
            <Text style={[styles.countText, {color: '#FDE68A'}]}>
              {data.counts.trophies}
            </Text>
          </View>
        ) : null}
        {data.counts.badges > 0 ? (
          <View style={[styles.countChip, {backgroundColor: 'rgba(148,163,184,0.16)'}]}>
            <MCI name="medal" size={13} color="#94A3B8" />
            <Text style={[styles.countText, {color: '#E2E8F0'}]}>
              {data.counts.badges}
            </Text>
          </View>
        ) : null}
      </View>

      {preview.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.medalsRow}>
          {preview.map(item => (
            <BadgeImage key={item.code} item={item} />
          ))}
          {unlocked.length > preview.length ? (
            <View style={styles.moreMedal}>
              <Text style={styles.moreText}>
                +{unlocked.length - preview.length}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <View style={styles.emptyRow}>
          <MCI name="trophy-outline" size={16} color="#64748B" />
          <MCI name="medal-outline" size={16} color="#64748B" />
          <Text style={styles.emptyText}>{t('achievements_empty_short')}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    width: '100%',
    gap: 10,
  },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  medalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    justifyContent: 'center',
    minWidth: '100%',
  },
  medal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0B1220',
  },
  moreMedal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(148,163,184,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
})
