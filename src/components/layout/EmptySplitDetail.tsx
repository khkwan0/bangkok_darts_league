import {ThemedText as Text} from '@/components/ThemedText'
import {Colors} from '@/constants/Colors'
import React from 'react'
import {useColorScheme, View} from 'react-native'

export function EmptySplitDetail({message}: {message: string}) {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: colors.background,
      }}>
      <Text
        style={{
          fontSize: 16,
          opacity: 0.55,
          textAlign: 'center',
        }}>
        {message}
      </Text>
    </View>
  )
}
