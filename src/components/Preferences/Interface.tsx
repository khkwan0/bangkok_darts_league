import AppSwitch from '@/components/AppSwitch'
import React, {useEffect} from 'react'
import {View, Text, ScrollView} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useTheme} from "expo-router/react-navigation"
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {useLeagueContext} from '../../context/LeagueContext'
import {useAccount} from '@/hooks/useAccount'
import AsyncStorage from '@react-native-async-storage/async-storage'
import HomePanelsPreference from '@/components/Preferences/HomePanelsPreference'

const Interface = () => {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const insets = useSafeAreaInsets()
  const {state, dispatch} = useLeagueContext()
  const account = useAccount()

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      // Load live scores preference
      const storedLiveScores = await AsyncStorage.getItem('show_live_scores')
      if (storedLiveScores !== null) {
        const {show} = JSON.parse(storedLiveScores)
        dispatch({type: 'SET_LIVE_SCORES', payload: show})
      }

      const storedForumFabBadge = await AsyncStorage.getItem(
        'show_forum_fab_badge',
      )
      if (storedForumFabBadge !== null) {
        const {show} = JSON.parse(storedForumFabBadge)
        dispatch({type: 'SET_FORUM_FAB_BADGE', payload: show})
      }

      const storedPredictions = await AsyncStorage.getItem(
        'show_predictions_on_match_cards',
      )
      if (storedPredictions !== null) {
        const {show} = JSON.parse(storedPredictions)
        dispatch({type: 'SET_SHOW_PREDICTIONS_ON_MATCH_CARDS', payload: show})
      }

      const storedPotw = await AsyncStorage.getItem('show_player_of_the_week')
      if (storedPotw !== null) {
        const {show} = JSON.parse(storedPotw)
        dispatch({type: 'SET_SHOW_PLAYER_OF_THE_WEEK', payload: show})
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  const handleLiveScoresToggle = async (value: boolean) => {
    try {
      dispatch({type: 'SET_LIVE_SCORES', payload: value})
      await AsyncStorage.setItem('show_live_scores', JSON.stringify({show: value}))
    } catch (error) {
      console.error('Error saving live scores preference:', error)
    }
  }

  const handleForumFabBadgeToggle = async (value: boolean) => {
    try {
      dispatch({type: 'SET_FORUM_FAB_BADGE', payload: value})
      await AsyncStorage.setItem(
        'show_forum_fab_badge',
        JSON.stringify({show: value}),
      )
    } catch (error) {
      console.error('Error saving forum badge preference:', error)
    }
  }

  const handlePredictionsOnMatchCardsToggle = async (value: boolean) => {
    try {
      dispatch({type: 'SET_SHOW_PREDICTIONS_ON_MATCH_CARDS', payload: value})
      await AsyncStorage.setItem(
        'show_predictions_on_match_cards',
        JSON.stringify({show: value}),
      )
    } catch (error) {
      console.error('Error saving predictions on match cards preference:', error)
    }
  }

  const handlePlayerOfTheWeekToggle = async (value: boolean) => {
    try {
      dispatch({type: 'SET_SHOW_PLAYER_OF_THE_WEEK', payload: value})
      await AsyncStorage.setItem(
        'show_player_of_the_week',
        JSON.stringify({show: value}),
      )
    } catch (error) {
      console.error('Error saving Player of the Week preference:', error)
    }
  }

  const handleOtaAutoReloadToggle = async (value: boolean) => {
    try {
      await account.SetOtaAutoReload(value)
    } catch (error) {
      console.error('Error saving OTA auto-reload preference:', error)
    }
  }

  return (
    <ScrollView
      style={{flex: 1}}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: insets.bottom + 24,
      }}
      keyboardShouldPersistTaps="handled">
      {/* Live Scores Section */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
        <View style={{flex: 1}}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 4,
            }}>
            {t('live_scores')}
          </Text>
          <Text style={{color: colors.text, opacity: 0.7}}>
            {t('live_scores_description')}
          </Text>
        </View>
        <AppSwitch
          value={state.showLiveScores ?? true}
          onValueChange={handleLiveScoresToggle}
        />
      </View>

      {/* Forum FAB badge Section */}
      {state.forumsEnabled !== false ? (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
        <View style={{flex: 1, paddingRight: 12}}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 4,
            }}>
            {t('forum_fab_badge')}
          </Text>
          <Text style={{color: colors.text, opacity: 0.7}}>
            {t('forum_fab_badge_description')}
          </Text>
        </View>
        <AppSwitch
          value={state.showForumFabBadge ?? true}
          onValueChange={handleForumFabBadgeToggle}
        />
      </View>
      ) : null}

      {/* Predictions on match cards */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
        <View style={{flex: 1, paddingRight: 12}}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 4,
            }}>
            {t('show_predictions_on_match_cards')}
          </Text>
          <Text style={{color: colors.text, opacity: 0.7}}>
            {t('show_predictions_on_match_cards_description')}
          </Text>
        </View>
        <AppSwitch
          value={state.showPredictionsOnMatchCards ?? true}
          onValueChange={handlePredictionsOnMatchCardsToggle}
        />
      </View>

      {/* Player of the Week on home */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
        <View style={{flex: 1, paddingRight: 12}}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 4,
            }}>
            {t('show_player_of_the_week')}
          </Text>
          <Text style={{color: colors.text, opacity: 0.7}}>
            {t('show_player_of_the_week_description')}
          </Text>
        </View>
        <AppSwitch
          value={state.showPlayerOfTheWeek ?? true}
          onValueChange={handlePlayerOfTheWeekToggle}
        />
      </View>

      {/* Silent OTA updates */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
        <View style={{flex: 1, paddingRight: 12}}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 4,
            }}>
            {t('ota_auto_reload')}
          </Text>
          <Text style={{color: colors.text, opacity: 0.7}}>
            {t('ota_auto_reload_description')}
          </Text>
        </View>
        <AppSwitch
          value={state.user?.preferences?.ota_auto_reload ?? false}
          onValueChange={handleOtaAutoReloadToggle}
        />
      </View>

      <HomePanelsPreference />
    </ScrollView>
  )
}

export default Interface
