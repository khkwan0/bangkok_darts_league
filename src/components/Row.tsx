/*
import React from 'react'
import {ThemedView as View} from './ThemedView'

export default function Row(props: any) {
  const classStr = "flex-row"
  return (
    <View className={classStr}>
      {props.children}
    </View>
  )
}
  */
import {View, type ViewProps} from 'react-native'

import {useThemeColor} from '@/hooks/useThemeColor'

export type ThemedViewProps = ViewProps & {
  lightColor?: string
  darkColor?: string
  flex?: number
  alignItems?: string
  justifyContent?: string
  className?: string
}

export default function Row({
  style,
  lightColor,
  darkColor,
  className,
  ...otherProps
}: ThemedViewProps) {
  const backgroundColor = style?.backgroundColor ?? useThemeColor(
    {light: lightColor, dark: darkColor},
    'background',
  )

  return (
    <View
      style={[{flexDirection: 'row'}, style]}
      className={className}
      {...otherProps}
    />
  )
}
