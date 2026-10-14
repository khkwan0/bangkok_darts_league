import React from 'react'
import {Pressable, View as RNView} from 'react-native'
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

function pickLocalized(
  labels: {en: string; th: string},
  lang: string,
): string {
  return lang.startsWith('th') ? labels.th : labels.en
}

function AchievementRow({
  item,
  lang,
  locked,
  expanded,
  onPress,
  mutedColor,
  textColor,
}: {
  item: AchievementItem
  lang: string
  locked: boolean
  expanded: boolean
  onPress: () => void
  mutedColor?: string
  textColor?: string
}) {
  const {t} = useTranslation()
  const color = TIER_COLOR[item.tier] ?? TIER_COLOR.bronze
  const name = pickLocalized(item.name, lang)
  const description = pickLocalized(item.description, lang)
  const icon = (item.icon ||
    (item.kind === 'trophy' ? 'trophy' : 'medal')) as React.ComponentProps<
    typeof MCI
  >['name']
  const muted = mutedColor ?? '#94A3B8'
  const text = textColor ?? undefined

  return (
    <Pressable
      onPress={onPress}
      style={{
        marginBottom: 8,
        overflow: 'hidden',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: locked ? 'rgba(100,116,139,0.35)' : `${color}66`,
        backgroundColor: locked ? 'rgba(148,163,184,0.06)' : `${color}14`,
        opacity: locked ? 0.75 : 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
      }}>
      <RNView style={{flexDirection: 'row', alignItems: 'center'}}>
        <RNView
          style={{
            marginRight: 12,
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: locked ? 'rgba(100,116,139,0.2)' : `${color}22`,
          }}>
          <MCI
            name={locked ? 'lock-outline' : icon}
            size={22}
            color={locked ? muted : color}
          />
        </RNView>
        <RNView style={{flex: 1, minWidth: 0}}>
          <Text
            style={text ? {color: text, fontWeight: '700'} : {fontWeight: '700'}}
            numberOfLines={1}>
            {name}
          </Text>
          <Text
            style={{
              marginTop: 2,
              fontSize: 11,
              color: muted,
              textTransform: 'capitalize',
            }}>
            {item.kind === 'trophy'
              ? t('achievement_trophy')
              : t('achievement_badge')}
            {' · '}
            {item.tier}
            {item.silly ? ` · ${t('achievement_fun')}` : ''}
          </Text>
        </RNView>
        <MCI
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={muted}
        />
      </RNView>
      {expanded ? (
        <RNView style={{marginTop: 8, paddingLeft: 56}}>
          <Text style={{fontSize: 13, lineHeight: 19, color: muted}}>
            {description}
          </Text>
          {item.awardedAt ? (
            <Text style={{marginTop: 4, fontSize: 11, color: muted, opacity: 0.8}}>
              {t('achievement_earned')}{' '}
              {new Date(item.awardedAt).toLocaleDateString()}
            </Text>
          ) : null}
        </RNView>
      ) : null}
    </Pressable>
  )
}

/** Full earned + locked achievement list for a player. */
export default function PlayerAchievementsList({
  data,
  mutedColor,
  textColor,
  showHeader = true,
}: {
  data: PlayerAchievements | null
  mutedColor?: string
  textColor?: string
  /** When false, omit the top title/count row (e.g. page already has a section title). */
  showHeader?: boolean
}) {
  const {t, i18n} = useTranslation()
  const [expandedCode, setExpandedCode] = React.useState<string | null>(null)
  const lang = i18n.language || 'en'

  if (!data) return null

  const toggle = (code: string) => {
    setExpandedCode(prev => (prev === code ? null : code))
  }

  return (
    <RNView>
      {showHeader ? (
        <RNView
          style={{
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <RNView style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <MCI name="trophy-variant" size={20} color="#EAB308" />
            <Text
              style={
                textColor
                  ? {color: textColor, fontWeight: '700', fontSize: 16}
                  : {fontWeight: '700', fontSize: 16}
              }>
              {t('achievements')}
            </Text>
          </RNView>
          <Text
            style={
              textColor
                ? {color: textColor, fontWeight: '700'}
                : {fontWeight: '700'}
            }>
            {data.counts.total}/{data.counts.available}
          </Text>
        </RNView>
      ) : null}
      <Text
        style={{
          marginBottom: 12,
          fontSize: 13,
          color: mutedColor ?? '#94A3B8',
        }}>
        {t('achievements_progress', {
          badges: data.counts.badges,
          trophies: data.counts.trophies,
        })}
      </Text>

      {data.unlocked.length > 0 ? (
        <>
          <Text
            style={{
              marginBottom: 8,
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: mutedColor ?? '#94A3B8',
            }}>
            {t('achievements_earned')}
          </Text>
          {data.unlocked.map(item => (
            <AchievementRow
              key={item.code}
              item={item}
              lang={lang}
              locked={false}
              expanded={expandedCode === item.code}
              onPress={() => toggle(item.code)}
              mutedColor={mutedColor}
              textColor={textColor}
            />
          ))}
        </>
      ) : (
        <Text
          style={{
            marginBottom: 12,
            fontSize: 13,
            color: mutedColor ?? '#94A3B8',
          }}>
          {t('achievements_empty')}
        </Text>
      )}

      {data.locked.length > 0 ? (
        <>
          <Text
            style={{
              marginTop: 8,
              marginBottom: 8,
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: mutedColor ?? '#94A3B8',
            }}>
            {t('achievements_locked')}
          </Text>
          {data.locked.map(item => (
            <AchievementRow
              key={item.code}
              item={item}
              lang={lang}
              locked
              expanded={expandedCode === item.code}
              onPress={() => toggle(item.code)}
              mutedColor={mutedColor}
              textColor={textColor}
            />
          ))}
        </>
      ) : null}
    </RNView>
  )
}
