import AppSwitch from '@/components/AppSwitch'
import {
  Appearance,
  Image,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {useTheme, useNavigation} from "expo-router/react-navigation"
import AsyncStorage from '@react-native-async-storage/async-storage'
import config from '@/config.js'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import Feather from '@expo/vector-icons/Feather'
import {useLeagueContext} from '@/context/LeagueContext'
import {useTranslation} from 'react-i18next'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import NavDest from '@/components/NavDest'
import React, {useEffect, useState} from 'react'
import {useColorScheme} from 'react-native'
import {useAccount} from '@/hooks/useAccount'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {isReanimated3} from 'react-native-reanimated'

const SectionHeader = ({title}: {title: string}) => {
  const {colors} = useTheme()
  return (
    <View className="mt-6 mb-2 border-b border-gray-600">
      <Text
        className="text-sm uppercase tracking-wider mb-1"
        style={{color: colors.primary}}>
        {title}
      </Text>
    </View>
  )
}

export default function Settings() {
  const {colors} = useTheme()
  const {state, dispatch} = useLeagueContext()
  const [isDark, setIsDark] = useState(useColorScheme() === 'dark')
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const {t} = useTranslation()
  const account = useAccount()

  useEffect(() => {
    navigation.setOptions({
      title: t('settings'),
    })
  }, [navigation, t])

  const user = state.user
  const messageCount = state.messageCount
  const [logoutPressed, setLogoutPressed] = useState(false)

  async function ToggleTheme(value: boolean) {
    try {
      setIsDark(value)
      await AsyncStorage.setItem('theme', value ? 'dark' : 'light')
    } catch (e) {
      console.log(e)
    }
  }

  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      Appearance.setColorScheme(isDark ? 'dark' : 'light')
    }
  }, [isDark])

  React.useEffect(() => {
    async function GetUnreadMessageCount() {
      const count = await account.GetUnreadMessageCount()
      dispatch({type: 'SET_MESSAGE_COUNT', payload: count})
    }
    GetUnreadMessageCount()
  }, [])

  async function HandleLogout() {
    try {
      await AsyncStorage.removeItem('jwt')
      await AsyncStorage.removeItem('user')
      dispatch({type: 'DEL_USER'})
    } catch (e) {
      console.error('Error removing token:', e)
    }
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
      }}>
      <View className="flex-1">
        {/* App Info & Theme Section */}
        <View className="bg-gray-800/20 dark:bg-gray-200/20 rounded-xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm opacity-75">
              {t('build')} {config.build}
            </Text>
            <View className="flex-row items-center space-x-4 gap-x-2 bg-gray-800/30 rounded-lg p-2">
              <Feather name="sun" color={colors.text} size={18} />
              <AppSwitch value={isDark} onValueChange={ToggleTheme} />
              <MCI name="weather-night" color={colors.text} size={18} />
            </View>
          </View>
        </View>

        {/* User Section */}
        {typeof user.id !== 'undefined' && (
          <View className="bg-gray-800/20 dark:bg-gray-200/20 rounded-xl p-4 mb-4">
            <View className="flex-row items-center">
              <View className="h-24 w-24 rounded-full bg-gray-700/50 items-center justify-center overflow-hidden">
                {user.profile_picture ? (
                  <Image
                    source={{uri: config.profileUrl + user.profile_picture}}
                    className="h-24 w-24"
                    resizeMode="cover"
                  />
                ) : (
                  <MCI name="account" size={32} color={colors.text} />
                )}
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-lg font-semibold text-right">
                  {user.nickname}
                </Text>
                <Text className="text-sm opacity-60 text-right">
                  ID: {String(user.id)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {(typeof user?.id === 'undefined' || !user.id) && (
          <View className="my-4">
            <NavDest
              icon="login"
              text={t('login')}
              url="/Auth"
              iconColor="#0a7ea4"
              iconBackground="rgba(10, 126, 164, 0.12)"
            />
          </View>
        )}

        <NavDest
          icon="robot-outline"
          text={t('ai_assistant')}
          url={'/Settings/CueChat'}
          iconColor="#9C27B0"
          iconBackground="rgba(156, 39, 176, 0.15)"
        />

        {/* League Management */}
        <SectionHeader title={t('league_management')} />
        {isLeagueAdmin(user) && (
          <NavDest
            icon="account-group"
            text={t('admin')}
            url={'/Settings/Admin'}
            iconColor="#6366F1"
            iconBackground="rgba(99, 102, 241, 0.15)"
          />
        )}
        <NavDest
          icon="account-group"
          text={t('teams')}
          url={'/Settings/Teams'}
          iconColor="#4CAF50"
          iconBackground="rgba(76, 175, 80, 0.15)"
        />
        <NavDest
          icon="bullhorn-outline"
          text={t('announcements')}
          url={'/Settings/Announcements'}
          iconColor="#FF9800"
          iconBackground="rgba(255, 152, 0, 0.15)"
        />
        <NavDest
          icon="chart-areaspline-variant"
          text={t('statistics')}
          url={'/statistics'}
          iconColor="#2196F3"
          iconBackground="rgba(33, 150, 243, 0.15)"
        />
        <NavDest
          icon="information-outline"
          text={t('info_and_guides')}
          url={'/Settings/Info'}
          iconColor="#FF9800"
          iconBackground="rgba(255, 152, 0, 0.15)"
        />
        {/*
        <NavDest
          icon="division"
          text={t('divisions')}
          url={'/Settings/Divisions'}
        />
        <NavDest
          icon="leaf-circle-outline"
          text={t('seasons')}
          url={'/Settings/Seasons'}
        />
        */}
        {/* Venue & Players */}
        <SectionHeader title={t('people_and_places')} />
        <NavDest
          icon="map-marker"
          text={t('venues')}
          url={'/Settings/Venues'}
          iconColor="#E91E63"
          iconBackground="rgba(233, 30, 99, 0.15)"
        />
        <NavDest
          icon="account-outline"
          text={t('players')}
          url={'/Settings/Players'}
          iconColor="#3B82F6"
          iconBackground="rgba(59, 130, 246, 0.15)"
        />

        {/* App Settings */}
        <SectionHeader title={t('app_settings')} />
        <NavDest
          icon="cog"
          text={t('preferences')}
          url={'/Settings/Preferences'}
          iconColor={colors.primary}
          iconBackground={
            isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(10, 126, 164, 0.12)'
          }
        />
      </View>

      {/* Logout Section */}
      <View className="mt-auto pb-4" style={{paddingBottom: insets.bottom}}>
        {typeof user?.id !== 'undefined' && user.id && (
          <Pressable
            accessibilityRole="button"
            onPressIn={() => setLogoutPressed(true)}
            onPressOut={() => setLogoutPressed(false)}
            onPress={HandleLogout}
            className="flex-row items-center rounded-lg py-3 px-4"
            style={{
              backgroundColor: logoutPressed
                ? 'rgba(239, 68, 68, 0.22)'
                : 'rgba(239, 68, 68, 0.10)',
              borderWidth: 1,
              borderColor: logoutPressed ? '#ef4444' : 'transparent',
              transform: [{scale: logoutPressed ? 0.985 : 1}],
            }}>
            <MCI name="logout" color="#ef4444" size={24} />
            <Text className="ml-4" style={{color: '#ef4444'}}>
              {t('logout')}
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  )
}
