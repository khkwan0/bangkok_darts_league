import React, {useEffect, useMemo, useState} from 'react'
import {Pressable, Text, View} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useTheme} from "expo-router/react-navigation"
import {useLeagueContext} from '@/context/LeagueContext'
import {
  availablePanels,
  PANEL_I18N_KEY,
  resolveHomePanels,
  sportDefaultPanels,
  type HomePanelId,
} from '@/lib/homePanels'

/**
 * Show/hide + reorder home stats panels; persists via user preferences.
 */
export default function HomePanelsPreference() {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const {state, dispatch} = useLeagueContext()
  const sport = state.sport === 'darts' ? 'darts' : 'pool'

  const leaguePanels = state.homePanelsStored ?? state.homePanels
  const initial = useMemo(
    () =>
      resolveHomePanels(
        leaguePanels,
        state.user?.preferences?.home_panels,
        sport,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leaguePanels, state.user?.preferences?.home_panels, sport],
  )
  const [panels, setPanels] = useState<HomePanelId[]>(initial)

  useEffect(() => {
    setPanels(initial)
  }, [initial])

  const catalog = availablePanels(sport)
  const selected = new Set(panels)

  function persist(next: HomePanelId[] | null) {
    dispatch({
      type: 'SET_PREFERENCES',
      payload: {
        ...(state.user?.preferences || {}),
        home_panels: next,
      },
    })
    if (next == null) {
      setPanels(resolveHomePanels(leaguePanels, null, sport))
    } else {
      setPanels(next)
    }
  }

  function toggle(id: HomePanelId) {
    if (selected.has(id)) {
      persist(panels.filter(p => p !== id))
      return
    }
    persist([...panels, id])
  }

  function move(id: HomePanelId, dir: -1 | 1) {
    const idx = panels.indexOf(id)
    if (idx < 0) return
    const nextIdx = idx + dir
    if (nextIdx < 0 || nextIdx >= panels.length) return
    const copy = [...panels]
    ;[copy[idx], copy[nextIdx]] = [copy[nextIdx]!, copy[idx]!]
    persist(copy)
  }

  return (
    <View style={{marginTop: 8, marginBottom: 16}}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: colors.text,
          marginBottom: 4,
        }}>
        {t('home_panels_settings')}
      </Text>
      <Text style={{color: colors.text, opacity: 0.7, marginBottom: 12}}>
        {t('home_panels_settings_description')}
      </Text>

      {panels.map((id, index) => (
        <View
          key={id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 8,
            backgroundColor: colors.card,
          }}>
          <Text style={{flex: 1, color: colors.text}}>
            {t(PANEL_I18N_KEY[id])}
          </Text>
          <Pressable
            onPress={() => move(id, -1)}
            disabled={index === 0}
            style={{opacity: index === 0 ? 0.3 : 1, paddingHorizontal: 8}}>
            <Text style={{color: colors.text}}>↑</Text>
          </Pressable>
          <Pressable
            onPress={() => move(id, 1)}
            disabled={index === panels.length - 1}
            style={{
              opacity: index === panels.length - 1 ? 0.3 : 1,
              paddingHorizontal: 8,
            }}>
            <Text style={{color: colors.text}}>↓</Text>
          </Pressable>
          <Pressable onPress={() => toggle(id)} style={{paddingHorizontal: 8}}>
            <Text style={{color: '#dc2626'}}>{t('hide')}</Text>
          </Pressable>
        </View>
      ))}

      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
        {catalog
          .filter(id => !selected.has(id))
          .map(id => (
            <Pressable
              key={id}
              onPress={() => toggle(id)}
              style={{
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.border || colors.text,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}>
              <Text style={{color: colors.text}}>
                + {t(PANEL_I18N_KEY[id])}
              </Text>
            </Pressable>
          ))}
      </View>

      <Pressable
        onPress={() => persist(null)}
        style={{marginTop: 12}}>
        <Text style={{color: '#2563eb'}}>
          {t('home_panels_use_league_default')}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => persist(sportDefaultPanels(sport))}
        style={{marginTop: 8}}>
        <Text style={{color: '#2563eb'}}>
          {t('home_panels_reset_sport_default')}
        </Text>
      </Pressable>
    </View>
  )
}
