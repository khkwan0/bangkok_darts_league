import {Colors} from '@/constants/Colors'
import {useThemeColor} from '@/hooks/useThemeColor'
import {useAdminMergeRequestCount} from '@/lib/adminMergeRequests'
import {useAdminSupportUnreadCount} from '@/lib/adminSupportUnread'
import {useHasSupportActivity, useHasUnreadSupport} from '@/lib/supportUnread'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useRouter} from 'expo-router'
import {Pressable, StyleSheet, useColorScheme, View} from 'react-native'
import {useTranslation} from 'react-i18next'

export const SettingsButton = () => {
  const router = useRouter()
  const textColor = useThemeColor({}, 'text')
  const isDark = useColorScheme() === 'dark'
  const {t} = useTranslation()
  const hasSupportActivity = useHasSupportActivity()
  const pendingMerges = useAdminMergeRequestCount()
  const hasMemberSupport = useHasUnreadSupport()
  const hasAdminSupport = useAdminSupportUnreadCount() > 0
  const hasSupport = hasMemberSupport || hasAdminSupport
  const accessibilityLabel =
    hasSupport && pendingMerges > 0
      ? t('settings_support_and_merges')
      : pendingMerges > 0
        ? t('settings_pending_merge_requests')
        : hasSupport
          ? t('settings_unread_support')
          : t('settings')

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => router.push('/Settings')}
      style={styles.button}>
      <MCI name="menu" size={26} color={textColor} />
      {hasSupportActivity ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.badge,
            {borderColor: isDark ? Colors.dark.background : Colors.light.background},
          ]}
        />
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    overflow: 'visible',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    borderWidth: 2,
  },
})
