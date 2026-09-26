import {Pressable, View} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {useTranslation} from 'react-i18next'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useTheme} from "expo-router/react-navigation"
import { router, useNavigation } from 'expo-router';
import React from 'react'
import {useLeagueContext} from '@/context/LeagueContext'

type PreferenceRowProps = {
  icon: React.ComponentProps<typeof MCI>['name']
  label: string
  route: string
  iconColor: string
  iconBackground: string
  showDivider?: boolean
}

function PreferenceRow({
  icon,
  label,
  route,
  iconColor,
  iconBackground,
  showDivider = true,
}: PreferenceRowProps) {
  const {colors} = useTheme()
  const [pressed, setPressed] = React.useState(false)

  return (
    <Pressable
      className={showDivider ? 'border-b' : undefined}
      accessibilityRole="button"
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => router.push(route as any)}
      style={{
        borderColor: colors.border,
        backgroundColor: pressed ? iconBackground : 'transparent',
      }}>
      <View className="flex-row items-center justify-between p-4">
        <View className="flex-row items-center gap-3">
          <MCI name={icon} size={24} color={pressed ? iconColor : colors.text} />
          <Text className="text-base" style={{color: colors.text}}>
            {label}
          </Text>
        </View>
        <MCI
          name="chevron-right"
          size={24}
          color={pressed ? iconColor : colors.text}
        />
      </View>
    </Pressable>
  )
}

export default function Preferences() {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const navigation = useNavigation()
  const {state} = useLeagueContext()
  const user = state.user

  React.useEffect(() => {
    navigation.setOptions({title: t('preferences')})
  }, [t])

  return (
    <View className="flex-1 p-4" style={{backgroundColor: colors.background}}>
      <View className="mb-6">
        <View className="mb-2">
          <Text
            className="text-sm font-semibold opacity-70"
            style={{color: colors.text}}>
            {t('general')}
          </Text>
        </View>
        <View
          className="rounded-xl overflow-hidden shadow-sm"
          style={{backgroundColor: colors.card}}>
          <PreferenceRow
            icon="translate"
            label={`${t('language_in_english')}/${t('language_in_thai')}`}
            route="/Settings/Preferences/Language"
            iconColor="#2196F3"
            iconBackground="rgba(33, 150, 243, 0.15)"
          />
          {user?.id && (
            <PreferenceRow
              icon="bell-outline"
              label={t('notification')}
              route="/Settings/Preferences/Notifications"
              iconColor="#FF9800"
              iconBackground="rgba(255, 152, 0, 0.15)"
            />
          )}
        </View>
      </View>

      {user?.id && (
        <View className="mb-6">
          <View className="mb-2">
            <Text
              className="text-sm font-semibold opacity-70"
              style={{color: colors.text}}>
              {t('account')}
            </Text>
          </View>
          <View
            className="rounded-xl overflow-hidden shadow-sm"
            style={{backgroundColor: colors.card}}>
            <PreferenceRow
              icon="shield-outline"
              label={t('security')}
              route="/Settings/Preferences/Security"
              iconColor="#4CAF50"
              iconBackground="rgba(76, 175, 80, 0.15)"
            />
            <PreferenceRow
              icon="account-outline"
              label={t('profile')}
              route="/Settings/Preferences/Profile"
              iconColor="#3B82F6"
              iconBackground="rgba(59, 130, 246, 0.15)"
            />
            <PreferenceRow
              icon="delete-outline"
              label={t('delete_account')}
              route="/Settings/Preferences/DeleteAccount"
              iconColor="#ef4444"
              iconBackground="rgba(239, 68, 68, 0.15)"
            />
          </View>
        </View>
      )}

      <View className="mb-6">
        <View className="mb-2">
          <Text
            className="text-sm font-semibold opacity-70"
            style={{color: colors.text}}>
            {t('appearance')}
          </Text>
        </View>
        <View
          className="rounded-xl overflow-hidden shadow-sm"
          style={{backgroundColor: colors.card}}>
          <PreferenceRow
            icon="palette-outline"
            label={t('colors')}
            route="/Settings/Preferences/Colors"
            iconColor="#E91E63"
            iconBackground="rgba(233, 30, 99, 0.15)"
          />
          <PreferenceRow
            icon="view-dashboard-outline"
            label={t('interface')}
            route="/Settings/Preferences/Interface"
            iconColor="#9C27B0"
            iconBackground="rgba(156, 39, 176, 0.15)"
          />
        </View>
      </View>
    </View>
  )
}
