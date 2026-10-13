import React from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useTranslation} from 'react-i18next'
import type {
  AchievementItem,
  PlayerAchievements,
} from '@/types/achievements'

const TIER_COLOR: Record<string, string> = {
  bronze: '#B45309',
  silver: '#94A3B8',
  gold: '#EAB308',
  platinum: '#22D3EE',
}

function pickLocalized(
  labels: {en: string; th: string},
  lang: string,
): string {
  return lang.startsWith('th') ? labels.th : labels.en
}

function AchievementTile({
  item,
  lang,
  locked = false,
  onPress,
}: {
  item: AchievementItem
  lang: string
  locked?: boolean
  onPress?: () => void
}) {
  const color = TIER_COLOR[item.tier] ?? TIER_COLOR.bronze
  const name = pickLocalized(item.name, lang)
  const icon = (item.icon ||
    (item.kind === 'trophy' ? 'trophy' : 'medal')) as React.ComponentProps<
    typeof MCI
  >['name']

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.tile,
        {borderColor: `${color}55`, backgroundColor: `${color}14`},
        locked && styles.tileLocked,
        pressed && {opacity: 0.85},
      ]}>
      <MCI
        name={locked ? 'lock-outline' : icon}
        size={22}
        color={locked ? '#64748B' : color}
      />
      <Text style={[styles.tileName, {color: locked ? '#64748B' : '#E2E8F0'}]} numberOfLines={2}>
        {name}
      </Text>
      <Text style={styles.tileKind}>
        {item.kind === 'trophy' ? '🏆' : '🎖️'}
        {item.silly ? ' · 😄' : ''}
      </Text>
    </Pressable>
  )
}

export default function PlayerAchievementsCard({
  data,
}: {
  data: PlayerAchievements | null
}) {
  const {t, i18n} = useTranslation()
  const [selected, setSelected] = React.useState<AchievementItem | null>(null)
  const lang = i18n.language || 'en'

  if (!data || data.counts.available === 0) return null

  const unlocked = data.unlocked
  const lockedPreview = data.locked.slice(0, 4)

  return (
    <View style={styles.board}>
      <View style={[styles.stripe, {backgroundColor: '#EAB308'}]} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MCI name="trophy-variant" size={20} color="#EAB308" />
          <Text style={styles.title}>{t('achievements')}</Text>
        </View>
        <Text style={styles.count}>
          {data.counts.total}/{data.counts.available}
        </Text>
      </View>

      {unlocked.length === 0 ? (
        <Text style={styles.empty}>{t('achievements_empty')}</Text>
      ) : (
        <View style={styles.grid}>
          {unlocked.map(item => (
            <AchievementTile
              key={item.code}
              item={item}
              lang={lang}
              onPress={() => setSelected(item)}
            />
          ))}
        </View>
      )}

      {lockedPreview.length > 0 ? (
        <>
          <Text style={styles.lockedLabel}>{t('achievements_locked')}</Text>
          <View style={styles.grid}>
            {lockedPreview.map(item => (
              <AchievementTile
                key={item.code}
                item={item}
                lang={lang}
                locked
                onPress={() => setSelected(item)}
              />
            ))}
          </View>
        </>
      ) : null}

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selected ? (
              <ScrollView>
                <View style={styles.modalIconWrap}>
                  <MCI
                    name={
                      (selected.icon || 'trophy') as React.ComponentProps<
                        typeof MCI
                      >['name']
                    }
                    size={36}
                    color={TIER_COLOR[selected.tier] ?? '#EAB308'}
                  />
                </View>
                <Text style={styles.modalTitle}>
                  {pickLocalized(selected.name, lang)}
                </Text>
                <Text style={styles.modalDesc}>
                  {pickLocalized(selected.description, lang)}
                </Text>
                <Text style={styles.modalMeta}>
                  {selected.kind === 'trophy'
                    ? t('achievement_trophy')
                    : t('achievement_badge')}
                  {' · '}
                  {selected.tier}
                  {selected.awardedAt
                    ? ` · ${new Date(selected.awardedAt).toLocaleDateString()}`
                    : ` · ${t('achievements_locked')}`}
                </Text>
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  board: {
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.22)',
    overflow: 'hidden',
    marginBottom: 20,
    paddingBottom: 14,
  },
  stripe: {height: 3, width: '100%'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 8},
  title: {fontSize: 16, fontWeight: '700', color: '#F8FAFC'},
  count: {fontSize: 13, color: '#94A3B8', fontWeight: '600'},
  empty: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    gap: 8,
  },
  tile: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    maxWidth: '32%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  tileLocked: {opacity: 0.55},
  tileName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  tileKind: {fontSize: 10, color: '#64748B'},
  lockedLabel: {
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 14,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.72)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    padding: 20,
    maxHeight: '70%',
  },
  modalIconWrap: {alignItems: 'center', marginBottom: 12},
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  modalMeta: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
})
