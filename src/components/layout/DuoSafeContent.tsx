import React from 'react'
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

type Edge = 'top' | 'right' | 'bottom' | 'left'

type Props = {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  /** Which edges to pad. Default: left + right (Duo side chrome / Split View). */
  edges?: Edge[]
  className?: string
}

/**
 * Asymmetric safe-area padding so content clears Duo vertical side chrome
 * and the opposite edge in Split View multitasking.
 */
export function DuoSafeContent({
  children,
  style,
  edges = ['left', 'right'],
  className,
}: Props) {
  const insets = useSafeAreaInsets()
  const edgeSet = new Set(edges)

  return (
    <View
      className={className}
      style={[
        styles.fill,
        edgeSet.has('top') && {paddingTop: insets.top},
        edgeSet.has('right') && {paddingRight: insets.right},
        edgeSet.has('bottom') && {paddingBottom: insets.bottom},
        edgeSet.has('left') && {paddingLeft: insets.left},
        style,
      ]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: {flex: 1},
})
