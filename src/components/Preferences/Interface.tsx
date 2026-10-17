import AppSwitch from '@/components/AppSwitch'
import React, {useEffect} from 'react'
import {View, Text} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useTheme} from "expo-router/react-navigation"
import {useLeagueContext} from '../../context/LeagueContext'
import {useAccount} from '@/hooks/useAccount'
import AsyncStorage from '@react-native-async-storage/async-storage'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import HomePanelsPreference from '@/components/Preferences/HomePanelsPreference'

const Interface = () => {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const {state, dispatch} = useLeagueContext()
  const account = useAccount()

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      // Load match card preference
      const storedMatchCard = await AsyncStorage.getItem('opt_into_new')
      if (storedMatchCard !== null) {
        const {optIn} = JSON.parse(storedMatchCard)
        dispatch({type: 'SET_MATCH_CARD_DESIGN', payload: optIn})
      }

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

  const handleMatchCardToggle = async (value: boolean) => {
    try {
      dispatch({type: 'SET_MATCH_CARD_DESIGN', payload: value})
      await AsyncStorage.setItem('opt_into_new', JSON.stringify({optIn: value}))
    } catch (error) {
      console.error('Error saving match card preference:', error)
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
    <View style={{padding: 16}}>
      {/* Match Card Design Section */}
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
            {t('match_card_design')}
          </Text>
          <Text style={{color: colors.text, opacity: 0.7}}>
            {state.isNewMatchCard
              ? t('new_match_card_description')
              : t('old_match_card_description')}
          </Text>
        </View>
        <AppSwitch
          value={state.isNewMatchCard}
          onValueChange={handleMatchCardToggle}
        />
      </View>

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
          value={state.user?.preferences?.ota_auto_reload ?? true}
          onValueChange={handleOtaAutoReloadToggle}
        />
      </View>

      {!state.isNewMatchCard && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            padding: 12,
            borderRadius: 8,
            marginTop: 8,
          }}>
          <MCI
            name="information-outline"
            size={20}
            color={colors.text}
            style={{marginRight: 8}}
          />
          <Text style={{color: colors.text, flex: 1}}>
            {t('old_match_card')}
          </Text>
        </View>
      )}

      <HomePanelsPreference />
    </View>
  )
}

export default Interface
