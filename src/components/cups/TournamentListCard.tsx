import {ThemedText as Text} from '@/components/ThemedText'
import Ionicons from '@expo/vector-icons/Ionicons'
import {LinearGradient} from 'expo-linear-gradient'
import React from 'react'
import {Pressable, useColorScheme, View} from 'react-native'

export type TournamentListItem = {
  id: number
  name: string
  status: string
  game_type_label?: string
  entry_count?: number
  open_signup?: boolean
  participant_mode?: string
}

type StatusTheme = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  accent: string
  accentSoft: string
  gradient: [string, string, string]
  border: string
}

function statusTheme(status: string, isDark: boolean): StatusTheme {
  const key = String(status || '').toLowerCase()
  if (key === 'draft') {
    return {
      icon: 'create-outline',
      label: 'Draft',
      accent: isDark ? '#fbbf24' : '#b45309',
      accentSoft: isDark ? 'rgba(251, 191, 36, 0.18)' : 'rgba(180, 83, 9, 0.12)',
      gradient: isDark
        ? ['#3d2e12', '#1f1a12', '#151515']
        : ['#fde68a', '#fff7ed', '#ffffff'],
      border: isDark ? '#5b4518' : '#f3e0b5',
    }
  }
  if (key === 'active' || key === 'in_progress' || key === 'live') {
    return {
      icon: 'flash-outline',
      label: key.replace(/_/g, ' '),
      accent: isDark ? '#34d399' : '#047857',
      accentSoft: isDark ? 'rgba(52, 211, 153, 0.18)' : 'rgba(4, 120, 87, 0.12)',
      gradient: isDark
        ? ['#0f3d2e', '#13201a', '#151515']
        : ['#6ee7b7', '#ecfdf5', '#ffffff'],
      border: isDark ? '#1f5c45' : '#a7f3d0',
    }
  }
  if (key === 'completed' || key === 'finished') {
    return {
      icon: 'trophy',
      label: key.replace(/_/g, ' '),
      accent: isDark ? '#f59e0b' : '#92400e',
      accentSoft: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(146, 64, 14, 0.12)',
      gradient: isDark
        ? ['#3d2808', '#1f1810', '#151515']
        : ['#fdba74', '#fff7ed', '#ffffff'],
      border: isDark ? '#6b4a12' : '#fdba74',
    }
  }
  if (key === 'cancelled' || key === 'canceled') {
    return {
      icon: 'close-circle-outline',
      label: 'Cancelled',
      accent: isDark ? '#f87171' : '#b91c1c',
      accentSoft: isDark ? 'rgba(248, 113, 113, 0.18)' : 'rgba(185, 28, 28, 0.1)',
      gradient: isDark
        ? ['#3d1616', '#1f1414', '#151515']
        : ['#fecaca', '#fef2f2', '#ffffff'],
      border: isDark ? '#7f1d1d' : '#fecaca',
    }
  }
  return {
    icon: 'trophy-outline',
    label: key.replace(/_/g, ' ') || 'Tournament',
    accent: isDark ? '#60a5fa' : '#1d4ed8',
    accentSoft: isDark ? 'rgba(96, 165, 250, 0.18)' : 'rgba(29, 78, 216, 0.1)',
    gradient: isDark
      ? ['#163055', '#151c28', '#151515']
      : ['#93c5fd', '#eff6ff', '#ffffff'],
    border: isDark ? '#1e3a5f' : '#bfdbfe',
  }
}

function MetaChip({
  icon,
  label,
  color,
  background,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  color: string
  background: string
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: background,
      }}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={{fontSize: 11, fontWeight: '600', color}} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

type Props = {
  item: TournamentListItem
  onPress: () => void
}

export function TournamentListCard({item, onPress}: Props) {
  const isDark = useColorScheme() === 'dark'
  const theme = statusTheme(item.status, isDark)
  const openSignup = Boolean(item.open_signup && item.status === 'draft')
  const muted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.55)'

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => ({
        opacity: pressed ? 0.92 : 1,
        transform: [{scale: pressed ? 0.985 : 1}],
      })}>
      <LinearGradient
        colors={theme.gradient}
        locations={[0, 0.45, 1]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 14,
          overflow: 'hidden',
        }}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: theme.accent,
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.accentSoft,
            }}>
            <Ionicons name={theme.icon} size={22} color={theme.accent} />
          </View>
          <View style={{flex: 1, minWidth: 0}}>
            <Text
              style={{fontWeight: '800', fontSize: 16, letterSpacing: -0.2}}
              numberOfLines={2}>
              {item.name}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 8,
              }}>
              <MetaChip
                icon={theme.icon}
                label={theme.label}
                color={theme.accent}
                background={theme.accentSoft}
              />
              {openSignup ? (
                <MetaChip
                  icon="person-add-outline"
                  label="Open signup"
                  color={isDark ? '#7dd3fc' : '#0369a1'}
                  background={
                    isDark
                      ? 'rgba(125, 211, 252, 0.16)'
                      : 'rgba(3, 105, 161, 0.1)'
                  }
                />
              ) : null}
              {item.participant_mode ? (
                <MetaChip
                  icon={
                    item.participant_mode === 'player'
                      ? 'person-outline'
                      : item.participant_mode === 'mixed'
                        ? 'people-circle-outline'
                        : 'people-outline'
                  }
                  label={item.participant_mode}
                  color={muted}
                  background={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'}
                />
              ) : null}
              {item.game_type_label ? (
                <MetaChip
                  icon="ellipse-outline"
                  label={item.game_type_label}
                  color={muted}
                  background={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'}
                />
              ) : null}
              {item.entry_count != null ? (
                <MetaChip
                  icon="ticket-outline"
                  label={`${item.entry_count} ${item.entry_count === 1 ? 'entry' : 'entries'}`}
                  color={muted}
                  background={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'}
                />
              ) : null}
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.3)'}
          />
        </View>
      </LinearGradient>
    </Pressable>
  )
}
