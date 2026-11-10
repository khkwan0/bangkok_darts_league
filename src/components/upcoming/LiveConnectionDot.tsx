import {useLiveCardConnection} from '@/context/LiveCardScoresContext'
import React from 'react'
import {View} from 'react-native'

const COLOR = {
  live: '#22C55E',
  connecting: '#F59E0B',
  offline: '#94A3B8',
} as const

const LABEL = {
  live: 'Live scores connected',
  connecting: 'Connecting to live scores',
  offline: 'Live scores offline',
} as const

/** 8px status mark in the gap beside the pin button. */
export default function LiveConnectionDot() {
  const connection = useLiveCardConnection()
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={LABEL[connection]}
      style={{
        alignSelf: 'center',
        width: 8,
        height: 8,
        marginRight: 8,
        borderRadius: 4,
        backgroundColor: COLOR[connection],
      }}
    />
  )
}
