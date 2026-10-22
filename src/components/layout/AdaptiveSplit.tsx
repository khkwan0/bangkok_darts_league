import {useLayoutMode} from '@/hooks/useLayoutMode'
import {useHingePose} from '@/hooks/useHingePose'
import React from 'react'
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

type Props = {
  list: React.ReactNode
  detail: React.ReactNode
  emptyDetail?: React.ReactNode
  /** When false, always render list only (caller handles stack push). */
  split?: boolean
  /**
   * When true (default), keep a detail column even if `detail` is null
   * (shows `emptyDetail`). When false, collapse to list-only until detail exists.
   */
  keepEmptyDetail?: boolean
  listStyle?: StyleProp<ViewStyle>
  detailStyle?: StyleProp<ViewStyle>
  /** Preferred list column width on regular layouts. */
  listWidth?: number
}

/**
 * Mail-style list + detail. Compact (and when split=false) renders `list` only.
 * Regular width shows both columns; book pose uses a slightly wider gutter.
 *
 * Does not apply safe-area padding — tab stacks use `useStackContentSafeStyle`
 * so list/detail stay clear of Duo’s vertical side rail.
 */
export function AdaptiveSplit({
  list,
  detail,
  emptyDetail,
  split,
  keepEmptyDetail = true,
  listStyle,
  detailStyle,
  listWidth = 360,
}: Props) {
  const layoutMode = useLayoutMode()
  const hingePose = useHingePose()
  const {width, height} = useWindowDimensions()
  const hasDetail = detail != null
  const shouldSplit =
    (split ?? layoutMode === 'regular') &&
    (hasDetail || (keepEmptyDetail && emptyDetail != null))

  if (!shouldSplit) {
    return <>{list}</>
  }

  const verticalSplit = height > width && hingePose === 'book'
  const gutter = hingePose === 'book' ? 16 : StyleSheet.hairlineWidth
  const resolvedListWidth = Math.min(
    listWidth,
    Math.max(280, Math.floor(width * 0.38)),
  )

  if (verticalSplit) {
    return (
      <View style={styles.fill}>
        <View style={[styles.listPaneVertical, listStyle]}>{list}</View>
        <View style={{height: gutter, backgroundColor: 'transparent'}} />
        <View style={[styles.detailPane, detailStyle]}>
          {detail ?? emptyDetail}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.row}>
      <View style={[{width: resolvedListWidth}, styles.listPane, listStyle]}>
        {list}
      </View>
      <View style={{width: gutter}} />
      <View style={[styles.detailPane, detailStyle]}>
        {detail ?? emptyDetail}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  row: {flex: 1, flexDirection: 'row'},
  listPane: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(128,128,128,0.35)',
  },
  listPaneVertical: {
    maxHeight: '42%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.35)',
  },
  detailPane: {flex: 1, minWidth: 0},
})
