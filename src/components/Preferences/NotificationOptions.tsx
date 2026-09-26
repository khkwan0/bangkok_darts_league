import AppSwitch from '@/components/AppSwitch'
import {View} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {useTheme} from "expo-router/react-navigation"
import {useTranslation} from 'react-i18next'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import AntDesign from '@expo/vector-icons/AntDesign'
import {useLeagueContext} from '@/context/LeagueContext'
import {useAccount} from '@/hooks'

export default function NotificationOptions() {
  const {colors} = useTheme()
  const {t} = useTranslation()
  const {state} = useLeagueContext()
  const {user} = state
  const account = useAccount()
  
  return (
    <View className="mb-6 p-4">
      <Text className="text-lg font-semibold mb-4">{t('notifications')}</Text>
      <View className="bg-gray-800/20 rounded-xl p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text>{t('push_notifications')}</Text>
          </View>
          <View className="flex-row items-center">
            <MCI
              name="bell-cancel"
              size={20}
              color={colors.primary}
              style={{marginRight: 8}}
            />
            <AppSwitch
              value={user?.preferences?.enabledPushNotifications ?? true}
              onValueChange={async val => {
                await account.SetPushNotifications(val)
              }}
            />
            <MCI
              name="bell-badge"
              size={20}
              color={colors.primary}
              style={{marginLeft: 8}}
            />
          </View>
        </View>
        <View className="flex-row items-center justify-between my-4">
          <View className="flex-row items-center">
            <Text>{t('sound_notifications')}</Text>
          </View>
          <View className="flex-row items-center">
            <MCI
              name="sleep"
              size={20}
              color={
                user?.preferences?.soundNotifications
                  ? colors.text + '40'
                  : colors.primary
              }
              style={{marginRight: 8}}
            />
            <AppSwitch
              value={user?.preferences?.soundNotifications ?? true}
              onValueChange={async val => {
                await account.SetSoundNotifications(val)
              }}
              disabled={
                typeof user?.preferences?.enabledPushNotifications ===
                'undefined'
                  ? false
                  : user.preferences.enabledPushNotifications
                    ? false
                    : true
              }
            />
            <AntDesign
              name="sound"
              size={20}
              color={
                user?.preferences?.soundNotifications
                  ? colors.primary
                  : colors.text + '40'
              }
              style={{marginLeft: 8}}
            />
          </View>
        </View>
      </View>
    </View>
  )
}
