import {View, type ViewProps} from 'react-native'

import {useThemeColor} from '@/hooks/useThemeColor'

export type ThemedViewProps = ViewProps & {
  lightColor?: string
  darkColor?: string
  flex?: number
  alignItems?: string
  justifyContent?: string
}

export function ThemedView({
  style,
  lightColor,
  darkColor,
  flex,
  className,
  ...otherProps
}: ThemedViewProps) {
  const backgroundColor =
    style?.backgroundColor ??
    useThemeColor({light: lightColor, dark: darkColor}, 'background')

  return (
    <View
      style={[{backgroundColor}, {flex}, style]}
      className={className}
      {...otherProps}
    />
  )
}
