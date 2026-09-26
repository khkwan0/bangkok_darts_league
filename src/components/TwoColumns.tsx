import React, {ReactNode} from 'react'
import {ThemedView as View} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'

interface PropType {
  label: string
  children: ReactNode
}
export default function TwoColumns(props: PropType) {
  return (
    <View className="flex-row items-center" {...props}>
      <View className="flex-1 items-end mr-4">
        <Text>{props.label}</Text>
      </View>
      <View className="flex-1 w-8">{props.children}</View>
    </View>
  )
}