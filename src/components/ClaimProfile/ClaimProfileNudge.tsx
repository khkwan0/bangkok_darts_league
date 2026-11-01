import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {MaterialCommunityIcons} from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useRouter} from 'expo-router'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, View} from 'react-native'

const STORAGE_KEY = 'claim_profile_nudge_dismissed'

/**
 * Soft one-time banner for logged-in users with no team roster yet —
 * typical after LINE/Apple signup when a captain already created them.
 */
export default function ClaimProfileNudge() {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const router = useRouter()
  const {state} = useLeagueContext()
  const user = state.user
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function check() {
      if (!user?.id) {
        setVisible(false)
        return
      }
      const hasTeams = Array.isArray(user.teams) && user.teams.length > 0
      if (hasTeams) {
        setVisible(false)
        return
      }
      const dismissed = await AsyncStorage.getItem(STORAGE_KEY)
      if (!cancelled) setVisible(dismissed !== '1')
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.teams])

  async function dismiss() {
    await AsyncStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <View
      className="mx-4 mb-3 p-3 rounded-xl flex-row items-start gap-2"
      style={{backgroundColor: colors.card}}>
      <MaterialCommunityIcons
        name="account-question-outline"
        size={22}
        color={colors.primary}
        style={{marginTop: 2}}
      />
      <View className="flex-1">
        <Text className="font-semibold mb-1">{t('claim_nudge_title')}</Text>
        <Text className="opacity-80 text-sm mb-2">{t('claim_nudge_body')}</Text>
        <View className="flex-row gap-4">
          <Pressable
            onPress={() =>
              router.push('/Settings/Preferences/ClaimProfile' as any)
            }>
            <Text style={{color: colors.primary}} className="font-semibold">
              {t('claim_existing_player')}
            </Text>
          </Pressable>
          <Pressable onPress={() => void dismiss()}>
            <Text className="opacity-60">{t('dismiss')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}
