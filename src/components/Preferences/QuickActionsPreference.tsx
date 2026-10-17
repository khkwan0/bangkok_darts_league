import React, {useEffect, useMemo, useState} from 'react'
import {Pressable, Text, View, type StyleProp, type ViewStyle} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useTheme} from 'expo-router/react-navigation'
import {useLeagueContext} from '@/context/LeagueContext'
import {useAccount} from '@/hooks/useAccount'
import {
  ALL_QUICK_ACTIONS,
  DEFAULT_FAB_QUICK_ACTIONS,
  QUICK_ACTION_DEFS,
  resolveFabQuickActions,
  type QuickActionId,
} from '@/lib/quickActions'

type CrudButtonProps = {
  onPress: () => void
  disabled?: boolean
  label: string
  labelColor: string
  background: string
  pressedBackground: string
  style?: StyleProp<ViewStyle>
}

function CrudButton({
  onPress,
  disabled,
  label,
  labelColor,
  background,
  pressedBackground,
  style,
}: CrudButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        {
          minWidth: 52,
          minHeight: 52,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.35 : 1,
          backgroundColor:
            pressed && !disabled ? pressedBackground : background,
          transform: [{scale: pressed && !disabled ? 0.96 : 1}],
        },
        style,
      ]}>
      {({pressed}) => (
        <Text
          style={{
            color: labelColor,
            fontSize: 20,
            lineHeight: 24,
            fontWeight: pressed && !disabled ? '700' : '600',
          }}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

/**
 * Show/hide + reorder FAB quick-action items; persists via user preferences API.
 */
export default function QuickActionsPreference() {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const {state} = useLeagueContext()
  const account = useAccount()

  const initial = useMemo(
    () => resolveFabQuickActions(state.user?.preferences?.fab_quick_actions),
    [state.user?.preferences?.fab_quick_actions],
  )
  const [actions, setActions] = useState<QuickActionId[]>(initial)

  useEffect(() => {
    setActions(initial)
  }, [initial])

  const selected = new Set(actions)
  const moveBg = 'rgba(37, 99, 235, 0.12)'
  const movePressed = 'rgba(37, 99, 235, 0.28)'
  const hideBg = 'rgba(220, 38, 38, 0.12)'
  const hidePressed = 'rgba(220, 38, 38, 0.28)'
  const addHighlight = 'rgba(37, 99, 235, 0.15)'
  const resetHighlight = 'rgba(37, 99, 235, 0.12)'

  async function persist(next: QuickActionId[] | null) {
    if (next != null && next.length === 0) {
      next = null
    }
    if (next == null) {
      setActions([...DEFAULT_FAB_QUICK_ACTIONS])
    } else {
      setActions(next)
    }
    await account.SetFabQuickActions(next)
  }

  function toggle(id: QuickActionId) {
    if (selected.has(id)) {
      const next = actions.filter(a => a !== id)
      if (next.length === 0) return
      void persist(next)
      return
    }
    void persist([...actions, id])
  }

  function move(id: QuickActionId, dir: -1 | 1) {
    const idx = actions.indexOf(id)
    if (idx < 0) return
    const nextIdx = idx + dir
    if (nextIdx < 0 || nextIdx >= actions.length) return
    const copy = [...actions]
    ;[copy[idx], copy[nextIdx]] = [copy[nextIdx]!, copy[idx]!]
    void persist(copy)
  }

  return (
    <View style={{flex: 1, padding: 16}}>
      <Text
        style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: colors.text,
          marginBottom: 6,
        }}>
        {t('fab_quick_actions_settings')}
      </Text>
      <Text
        style={{
          color: colors.text,
          opacity: 0.7,
          fontSize: 16,
          lineHeight: 22,
          marginBottom: 20,
        }}>
        {t('fab_quick_actions_settings_description')}
      </Text>

      {actions.map((id, index) => {
        const def = QUICK_ACTION_DEFS[id]
        return (
          <View
            key={id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 10,
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 12,
              backgroundColor: colors.card,
            }}>
            <Text
              style={{
                flex: 1,
                color: colors.text,
                fontSize: 17,
                lineHeight: 22,
                fontWeight: '600',
                paddingRight: 8,
              }}>
              {t(def.labelKey)}
            </Text>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <CrudButton
                label="↑"
                labelColor={colors.text}
                background={moveBg}
                pressedBackground={movePressed}
                onPress={() => move(id, -1)}
                disabled={index === 0}
              />
              <CrudButton
                label="↓"
                labelColor={colors.text}
                background={moveBg}
                pressedBackground={movePressed}
                onPress={() => move(id, 1)}
                disabled={index === actions.length - 1}
              />
            </View>
            <CrudButton
              label={t('hide')}
              labelColor="#dc2626"
              background={hideBg}
              pressedBackground={hidePressed}
              onPress={() => toggle(id)}
              style={{marginLeft: 28, minWidth: 72}}
            />
          </View>
        )
      })}

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
          marginTop: 8,
        }}>
        {ALL_QUICK_ACTIONS.filter(id => !selected.has(id)).map(id => {
          const def = QUICK_ACTION_DEFS[id]
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              onPress={() => toggle(id)}
              style={({pressed}) => ({
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: pressed
                  ? '#2563eb'
                  : colors.border || colors.text,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                justifyContent: 'center',
                backgroundColor: pressed ? addHighlight : 'transparent',
                transform: [{scale: pressed ? 0.97 : 1}],
              })}>
              {({pressed}) => (
                <Text
                  style={{
                    color: pressed ? '#2563eb' : colors.text,
                    fontSize: 16,
                    lineHeight: 20,
                    fontWeight: pressed ? '600' : '500',
                  }}>
                  + {t(def.labelKey)}
                </Text>
              )}
            </Pressable>
          )
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => void persist(null)}
        style={({pressed}) => ({
          marginTop: 16,
          alignSelf: 'flex-start',
          paddingHorizontal: 8,
          paddingVertical: 10,
          borderRadius: 12,
          backgroundColor: pressed ? resetHighlight : 'transparent',
          transform: [{scale: pressed ? 0.98 : 1}],
        })}>
        {({pressed}) => (
          <Text
            style={{
              color: '#2563eb',
              fontSize: 16,
              lineHeight: 20,
              fontWeight: pressed ? '700' : '600',
            }}>
            {t('fab_quick_actions_reset_default')}
          </Text>
        )}
      </Pressable>
    </View>
  )
}
