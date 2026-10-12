import {Colors} from '@/constants/Colors'
import {useThemeColor} from '@/hooks/useThemeColor'
import {useHasSupportActivity} from '@/lib/supportUnread'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {router} from 'expo-router'
import {Pressable, StyleSheet, useColorScheme, View} from 'react-native'
import {useTranslation} from 'react-i18next'

export const SettingsButton = () => {
  const textColor = useThemeColor({}, 'text')
  const isDark = useColorScheme() === 'dark'
  const {t} = useTranslation()
  const hasSupportActivity = useHasSupportActivity()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        hasSupportActivity ? t('settings_unread_support') : t('settings')
      }
      hitSlop={8}
      onPress={() => router.push('/Settings')}
      style={styles.button}>
      <MCI name="menu" size={32} color={textColor} />
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
