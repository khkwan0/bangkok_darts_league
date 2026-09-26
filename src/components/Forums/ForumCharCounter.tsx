import {ThemedText as Text} from '@/components/ThemedText'
import React from 'react'

type ForumCharCounterProps = {
  length: number
  maxLength: number
  className?: string
}

export function ForumCharCounter({
  length,
  maxLength,
  className = '',
}: ForumCharCounterProps) {
  const over = length > maxLength
  return (
    <Text
      className={`text-right text-xs ${over ? 'text-red-600 dark:text-red-400' : 'opacity-60'} ${className}`}>
      {length.toLocaleString()} / {maxLength.toLocaleString()}
    </Text>
  )
}
