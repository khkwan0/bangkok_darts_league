import {
  useLiveScores,
  type LiveScore,
} from '@/context/LiveScoresContext'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {
  Animated,
  AppState,
  Easing,
  Platform,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import {Gesture, GestureDetector} from 'react-native-gesture-handler'
import {runOnJS} from 'react-native-reanimated'

const SCROLL_SPEED_PX_PER_SEC = 40
const STRIP_GAP = 12
const MIN_LOOP_WIDTH_PX = 140 + 72 + 16 + 140 + 32

export type LiveScoresTickerVariant =
  | 'default'
  | 'accessory'
  | 'accessoryInline'

function useMarqueeAnimation(loopWidth: number, active: boolean) {
  const translateX = React.useRef(new Animated.Value(0)).current
  const animationRef = React.useRef<Animated.CompositeAnimation | null>(null)

  const stop = React.useCallback(() => {
    animationRef.current?.stop()
    animationRef.current = null
    translateX.stopAnimation()
  }, [translateX])

  const start = React.useCallback(() => {
    if (loopWidth < MIN_LOOP_WIDTH_PX) {
      return
    }
    stop()
    translateX.setValue(0)
    animationRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: -loopWidth,
        duration: (loopWidth / SCROLL_SPEED_PX_PER_SEC) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      }),
    )
    animationRef.current.start()
  }, [loopWidth, stop, translateX])

  React.useEffect(() => {
    if (active) {
      start()
    } else {
      stop()
    }
    return () => {
      stop()
    }
  }, [active, start, stop])

  return {translateX, restart: start}
}

const ScoreItem = React.memo(function ScoreItem({
  item,
  borderColor,
  textColor,
  onPress,
  disabled,
  compact,
}: {
  item: LiveScore
  borderColor: string
  textColor: string
  onPress: (matchId: number) => void
  disabled?: boolean
  compact?: boolean
}) {
  const matchId = Number(item.id)
  const [pressed, setPressed] = React.useState(false)

  const handlePress = React.useCallback(() => {
    onPress(matchId)
  }, [matchId, onPress])

  const tap = React.useMemo(
    () =>
      Gesture.Tap()
        .enabled(!disabled)
        .onBegin(() => {
          runOnJS(setPressed)(true)
        })
        .onFinalize(() => {
          runOnJS(setPressed)(false)
        })
        .onEnd((_event, success) => {
          if (success) {
            runOnJS(handlePress)()
          }
        }),
    [disabled, handlePress],
  )

  const nameW = compact ? 96 : 140
  const scoreW = compact ? 56 : 72
  const fontSize = compact
    ? Platform.OS === 'ios'
      ? 15
      : 13
    : Platform.OS === 'ios'
      ? 22
      : 18
  const padV = compact ? 6 : 12
  const padH = compact ? 10 : 16

  return (
    <GestureDetector gesture={tap}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${item.home_name} ${item.homeScore} vs ${item.awayScore} ${item.away_name}`}
        accessibilityHint="Opens match scoresheet"
        style={[
          disabled && styles.scoreCardDisabled,
          pressed && !disabled && styles.scoreCardPressed,
        ]}>
        <View
          style={[
            styles.scoreCard,
            {borderColor, paddingVertical: padV, paddingHorizontal: padH},
          ]}>
          <View style={styles.scoreRow}>
            <Text
              style={[
                styles.label,
                {
                  color: textColor,
                  fontSize,
                  textAlign: 'right',
                  width: nameW,
                },
              ]}
              numberOfLines={1}>
              {item.home_name}
            </Text>
            <Text
              style={[
                styles.label,
                {
                  color: textColor,
                  fontSize,
                  marginHorizontal: compact ? 4 : 8,
                  width: scoreW,
                  textAlign: 'center',
                },
              ]}>
              {item.homeScore} vs {item.awayScore}
            </Text>
            <Text
              style={[
                styles.label,
                {
                  color: textColor,
                  fontSize,
                  textAlign: 'left',
                  width: nameW,
                },
              ]}
              numberOfLines={1}>
              {item.away_name}
            </Text>
          </View>
        </View>
      </View>
    </GestureDetector>
  )
})

function ScoreStrip({
  scores,
  borderColor,
  textColor,
  onPress,
  navigatingMatchId,
  keyPrefix,
  onStripLayout,
  compact,
}: {
  scores: LiveScore[]
  borderColor: string
  textColor: string
  onPress: (matchId: number) => void
  navigatingMatchId: number | null
  keyPrefix: string
  onStripLayout?: (width: number) => void
  compact?: boolean
}) {
  return (
    <View
      style={[styles.strip, compact && styles.stripCompact]}
      onLayout={
        onStripLayout
          ? e => onStripLayout(Math.round(e.nativeEvent.layout.width))
          : undefined
      }>
      {scores.map((item, index) => (
        <View
          key={`${keyPrefix}-${item.id}`}
          style={index < scores.length - 1 ? styles.cardWrap : undefined}>
          <ScoreItem
            item={item}
            borderColor={borderColor}
            textColor={textColor}
            onPress={onPress}
            disabled={navigatingMatchId != null}
            compact={compact}
          />
        </View>
      ))}
    </View>
  )
}

const ScoreMarquee = React.memo(function ScoreMarquee({
  scores,
  borderColor,
  textColor,
  onPress,
  navigatingMatchId,
  compact,
}: {
  scores: LiveScore[]
  borderColor: string
  textColor: string
  onPress: (matchId: number) => void
  navigatingMatchId: number | null
  compact?: boolean
}) {
  const [loopWidth, setLoopWidth] = React.useState(0)
  const measuredOnceRef = React.useRef(false)
  const {translateX, restart} = useMarqueeAnimation(loopWidth, loopWidth > 0)

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && loopWidth >= MIN_LOOP_WIDTH_PX) {
        restart()
      }
    })
    return () => sub.remove()
  }, [loopWidth, restart])

  const onMeasured = React.useCallback((width: number) => {
    if (measuredOnceRef.current || width < MIN_LOOP_WIDTH_PX) {
      return
    }
    measuredOnceRef.current = true
    setLoopWidth(width)
  }, [])

  return (
    <View style={styles.clip} collapsable={false}>
      <Animated.View
        style={[styles.row, {transform: [{translateX}]}]}
        collapsable={false}>
        <ScoreStrip
          scores={scores}
          borderColor={borderColor}
          textColor={textColor}
          onPress={onPress}
          navigatingMatchId={navigatingMatchId}
          keyPrefix="a"
          onStripLayout={onMeasured}
          compact={compact}
        />
        <ScoreStrip
          scores={scores}
          borderColor={borderColor}
          textColor={textColor}
          onPress={onPress}
          navigatingMatchId={navigatingMatchId}
          keyPrefix="b"
          compact={compact}
        />
      </Animated.View>
    </View>
  )
})

/**
 * Presentational live-score marquee. Data from LiveScoresProvider.
 */
export default function LiveScoresTicker({
  variant = 'default',
}: {
  variant?: LiveScoresTickerVariant
}) {
  const {colors} = useTheme()
  const colorScheme = useColorScheme()
  const {scores, hasLiveScores, tickerKey, navigatingMatchId, openMatchScoresheet} =
    useLiveScores()

  if (!hasLiveScores) {
    return null
  }

  const compact = variant !== 'default'
  const textColor = colorScheme === 'dark' ? '#e2e8f0' : '#334155'
  const backgroundColor =
    variant === 'default'
      ? colorScheme === 'dark'
        ? '#1A1A1A'
        : '#F5F5F5'
      : 'transparent'

  return (
    <View
      style={[
        styles.container,
        {backgroundColor},
        variant === 'accessoryInline' && styles.accessoryInline,
        variant === 'accessory' && styles.accessory,
      ]}
      collapsable={false}>
      <ScoreMarquee
        key={tickerKey}
        scores={scores}
        borderColor={String(colors.border ?? '#cbd5e1')}
        textColor={textColor}
        onPress={openMatchScoresheet}
        navigatingMatchId={navigatingMatchId}
        compact={compact}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  accessory: {
    minHeight: 44,
    justifyContent: 'center',
  },
  accessoryInline: {
    minHeight: 36,
    maxWidth: 280,
    justifyContent: 'center',
  },
  clip: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  stripCompact: {
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  cardWrap: {
    marginRight: STRIP_GAP,
  },
  scoreCard: {
    borderWidth: 1,
  },
  scoreCardPressed: {
    opacity: 0.75,
  },
  scoreCardDisabled: {
    opacity: 0.5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
  },
})
