import {useTranslation} from 'react-i18next'
import {Pressable, PressableProps, useColorScheme, View} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'

export type ThemedButtonProps = PressableProps & {
  lightColor?: string
  darkColor?: string
  children?: any
  icon?: React.ReactNode
  type?: 'primary' | 'outline'
  small?: boolean
}

export default function Button({
  style,
  disabled,
  children,
  icon,
  type,
  small,
  ...rest
}: ThemedButtonProps) {
  const colorScheme = useColorScheme()
  const {t} = useTranslation()

  const padding = small ? 'p-2' : 'p-4'
  const disabledBg = 'bg-gray-400 dark:bg-gray-600 border-gray-400 dark:border-gray-600'
  const enabledBg =
    type === 'outline'
      ? colorScheme === 'dark'
        ? 'border border-slate-50'
        : 'border border-slate-600'
      : 'bg-blue-600 active:bg-purple-700'
  const bgColor = disabled ? disabledBg : enabledBg
  const textColor = disabled
    ? 'text-gray-200 dark:text-gray-400'
    : type !== 'outline'
      ? 'text-white'
      : colorScheme === 'dark'
        ? 'text-slate-50'
        : 'text-slate-600'

  return (
    <Pressable
      disabled={disabled}
      className={`${bgColor} ${padding} rounded-lg`}
      style={[{opacity: disabled ? 0.65 : 1}, style]}
      {...rest}>
      {typeof children === 'object' && [children]}
      {typeof children === 'string' && (
        <View className="flex-row items-center gap-2 justify-center">
          {icon}
          <Text
            className={`${textColor} text-center ${small ? 'text-base' : 'text-xl'}`}>
            {t(children)}
          </Text>
        </View>
      )}
    </Pressable>
  )
}
