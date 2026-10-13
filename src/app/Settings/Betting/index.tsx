import AppSwitch from '@/components/AppSwitch'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import type {BettingOddsFormat} from '@/lib/bettingOddsFormat'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useNavigation, useRouter} from 'expo-router'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, ScrollView, View} from 'react-native'

export default function BettingSettingsScreen() {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const navigation = useNavigation()
  const router = useRouter()
  const {state, dispatch} = useLeagueContext()

  React.useEffect(() => {
    navigation.setOptions({title: t('betting_settings')})
  }, [navigation, t])

  const setHideBetting = async (hide: boolean) => {
    dispatch({type: 'SET_HIDE_BETTING_UI', payload: hide})
    try {
      await AsyncStorage.setItem('hide_betting_ui', JSON.stringify({hide}))
    } catch (e) {
      console.error(e)
    }
  }

  const setOddsFormat = async (format: BettingOddsFormat) => {
    dispatch({type: 'SET_BETTING_ODDS_FORMAT', payload: format})
    try {
      await AsyncStorage.setItem(
        'betting_odds_format',
        JSON.stringify({format}),
      )
    } catch (e) {
      console.error(e)
    }
  }

  const format = state.bettingOddsFormat ?? 'european'

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{padding: 16}}
      style={{backgroundColor: colors.background}}>
      <Text className="text-sm opacity-75 mb-4">
        {t('betting_balance', {count: state.bettingBalance})}
      </Text>

      <Pressable
        onPress={() => router.push('/Settings/Betting/History' as any)}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingVertical: 14,
          paddingHorizontal: 12,
          marginBottom: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <View style={{flex: 1, paddingRight: 12}}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 4,
            }}>
            {t('betting_history')}
          </Text>
          <Text style={{color: colors.text, opacity: 0.7}}>
            {t('betting_history_description')}
          </Text>
        </View>
        <Text style={{color: colors.primary, fontWeight: '700'}}>›</Text>
      </Pressable>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
        <View style={{flex: 1, paddingRight: 12}}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 4,
            }}>
            {t('betting_show_ui')}
          </Text>
          <Text style={{color: colors.text, opacity: 0.7}}>
            {t('betting_show_ui_description')}
          </Text>
        </View>
        <AppSwitch
          value={!state.hideBettingUi}
          onValueChange={value => setHideBetting(!value)}
        />
      </View>

      <Text
        style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: colors.text,
          marginBottom: 4,
        }}>
        {t('betting_odds_format')}
      </Text>
      <Text
        style={{color: colors.text, opacity: 0.7, marginBottom: 12}}>
        {t('betting_odds_format_description')}
      </Text>

      <View style={{flexDirection: 'row', gap: 8}}>
        {(
          [
            ['european', t('betting_odds_european'), '1.91'],
            ['american', t('betting_odds_american'), '-110'],
          ] as const
        ).map(([key, label, example]) => {
          const active = format === key
          return (
            <Pressable
              key={key}
              onPress={() => setOddsFormat(key)}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active
                  ? `${String(colors.primary)}22`
                  : 'transparent',
              }}>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: '700',
                  marginBottom: 2,
                }}>
                {label}
              </Text>
              <Text style={{color: colors.text, opacity: 0.6, fontSize: 12}}>
                {example}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </ScrollView>
  )
}
