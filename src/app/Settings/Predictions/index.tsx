import NavDest from '@/components/NavDest'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {useNavigation} from 'expo-router'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {ScrollView, useColorScheme, View} from 'react-native'

export default function PredictionsSettingsScreen() {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const {colors} = useTheme()
  const isDark = (useColorScheme() ?? 'light') === 'dark'
  const {state} = useLeagueContext()

  React.useEffect(() => {
    navigation.setOptions({
      title: t('predictions_settings'),
      headerBackTitle: t('back'),
    })
  }, [navigation, t])

  if (!state.predictionsEnabled) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{backgroundColor: colors.background}}>
        <Text
          style={{
            textAlign: 'center',
            color: colors.text,
            opacity: 0.7,
            fontSize: 15,
            lineHeight: 22,
          }}>
          {t('predictions_disabled_body')}
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{padding: 16, paddingBottom: 40}}
      style={{backgroundColor: colors.background}}>
      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
          marginBottom: 8,
          backgroundColor: isDark
            ? 'rgba(14, 165, 233, 0.12)'
            : 'rgba(14, 165, 233, 0.08)',
        }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: colors.text,
            marginBottom: 6,
          }}>
          {t('predictions_settings')}
        </Text>
        <Text style={{fontSize: 13, color: colors.text, opacity: 0.75, lineHeight: 19}}>
          {t('predictions_settings_description')}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.text,
            opacity: 0.75,
            lineHeight: 19,
            marginTop: 8,
          }}>
          {t('predictions_scoring_help')}
        </Text>
      </View>

      <NavDest
        icon="trophy"
        text={t('predictions_leaderboard')}
        url="/Settings/Predictions/Leaderboard"
        iconColor="#F59E0B"
        iconBackground="rgba(245, 158, 11, 0.15)"
      />
      <NavDest
        icon="clipboard-list-outline"
        text={t('predictions_history')}
        url="/Settings/Predictions/History"
        iconColor="#0EA5E9"
        iconBackground="rgba(14, 165, 233, 0.15)"
      />
    </ScrollView>
  )
}
