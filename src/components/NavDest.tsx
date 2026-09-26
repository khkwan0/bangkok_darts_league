import React from 'react'
import {ThemedText as Text} from '@/components/ThemedText'
import {Pressable, useColorScheme, View} from 'react-native'
import {useTheme} from "expo-router/react-navigation"
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useRouter} from 'expo-router'

interface NavDestProps {
  url: string
  text: string
  icon: any
  messageCount?: number
  onPress?: () => void
  iconColor?: string
  iconBackground?: string
}

export default function NavDest(props: NavDestProps) {
  const {colors} = useTheme()
  const router = useRouter()
  const {messageCount = 0, text} = props
  const isDark = (useColorScheme() ?? 'light') === 'dark'
  const [pressed, setPressed] = React.useState(false)
  const iconColor = props.iconColor ?? colors.text
  const iconBackground =
    props.iconBackground ??
    (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.08)')

  return (
    <Pressable
      className="my-3 overflow-hidden rounded-xl"
      accessibilityRole="button"
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        if (props.onPress) {
          props.onPress()
        } else {
          router.push(props.url as any)
        }
      }}
      style={{
        backgroundColor: pressed ? iconBackground : 'transparent',
        borderWidth: 1,
        borderColor: pressed ? iconColor : 'transparent',
        transform: [{scale: pressed ? 0.985 : 1}],
      }}>
      <View className="flex-row p-4 items-center">
        <View className="flex-0 w-10 ">
          <MCI
            name={props.icon}
            color={pressed ? iconColor : colors.text}
            size={20}
          />
        </View>
        <View className="flex-auto">
          <Text className="font-bold">{text}</Text>
        </View>
        <View className="flex-auto">
          {messageCount > 0 && (
            <Text className="bg-red-500 rounded-full px-2 mx-24 py-1 text-center text-white">
              {messageCount.toString()}
            </Text>
          )}
        </View>
        <View className="content-end">
          <MCI name="greater-than" color={colors.text} size={20} />
        </View>
      </View>
    </Pressable>
  )
}
