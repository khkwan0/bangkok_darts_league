import {router} from 'expo-router'
import {useThemeColor} from '@/hooks/useThemeColor'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'

export const SettingsButton = () => {
  const textColor = useThemeColor({}, 'text')
  return (
    <MCI
      name="menu"
      size={32}
      color={textColor}
      onPress={() => router.push('/Settings')}
    />
  )
}
