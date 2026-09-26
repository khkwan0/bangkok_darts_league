import {useLeague} from '@/hooks'
import {useLeagueContext} from '@/context/LeagueContext'
import {isMiniCompetition} from '@/types/competition'
import {useTheme} from "expo-router/react-navigation"
import {router} from 'expo-router'
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

type LiveScore = {
  id: number
  home_name: string
  away_name: string
  homeScore: number | string
  awayScore: number | string
}

const REFRESH_INTERVAL_MS = 30000
const SCROLL_SPEED_PX_PER_SEC = 40
const STRIP_GAP = 12
const MIN_LOOP_WIDTH_PX = 140 + 72 + 16 + 140 + 32

const scoresKey = (items: LiveScore[]) =>
  items.map(s => `${s.id}:${s.homeScore}-${s.awayScore}`).join('|')

function matchInfoFromResponse(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== 'object') {
    return null
  }
  const payload = res as {status?: string; data?: unknown; match_id?: unknown}
  if (payload.status === 'ok' && payload.data && typeof payload.data === 'object') {
    return payload.data as Record<string, unknown>
  }
  if (typeof payload.match_id !== 'undefined') {
    return payload as Record<string, unknown>
  }
  return null
}

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
}: {
  item: LiveScore
  borderColor: string
  textColor: string
  onPress: (matchId: number) => void
  disabled?: boolean
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
        <View style={[styles.scoreCard, {borderColor}]}>
          <View style={styles.scoreRow}>
            <Text
              style={[styles.homeName, styles.label, {color: textColor}]}
              numberOfLines={1}>
              {item.home_name}
            </Text>
            <Text style={[styles.scoreText, styles.label, {color: textColor}]}>
              {item.homeScore} vs {item.awayScore}
            </Text>
            <Text
              style={[styles.awayName, styles.label, {color: textColor}]}
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
}: {
  scores: LiveScore[]
  borderColor: string
  textColor: string
  onPress: (matchId: number) => void
  navigatingMatchId: number | null
  keyPrefix: string
  onStripLayout?: (width: number) => void
}) {
  return (
    <View
      style={styles.strip}
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
  }: {
    scores: LiveScore[]
    borderColor: string
    textColor: string
    onPress: (matchId: number) => void
    navigatingMatchId: number | null
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
          />
          <ScoreStrip
            scores={scores}
            borderColor={borderColor}
            textColor={textColor}
            onPress={onPress}
            navigatingMatchId={navigatingMatchId}
            keyPrefix="b"
          />
        </Animated.View>
      </View>
    )
})

function LiveScoresWithData() {
  const {colors} = useTheme()
  const colorScheme = useColorScheme()
  const league = useLeague()
  const {state} = useLeagueContext()
  const competition = state.competition
  const miniLeagueId = isMiniCompetition(competition) ? competition.id : null
  const [scores, setScores] = React.useState<LiveScore[]>([])
  const [tickerKey, setTickerKey] = React.useState(0)
  const [navigatingMatchId, setNavigatingMatchId] = React.useState<number | null>(
    null,
  )
  const refreshTimer = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const scoresKeyRef = React.useRef('')
  const scoresCountRef = React.useRef(0)

  const textColor = colorScheme === 'dark' ? '#e2e8f0' : '#334155'

  const getLiveScores = React.useCallback(async () => {
    try {
      // @ts-expect-error runtime accepts optional miniLeagueId
      const res = await league.GetLiveScores(miniLeagueId)
      if (typeof res.status !== 'undefined' && res.status === 'ok') {
        const next = Array.isArray(res.data)
          ? (res.data as unknown as LiveScore[])
          : []
        const key = scoresKey(next)
        if (key === scoresKeyRef.current) {
          return
        }

        const isFirstLoad = scoresKeyRef.current === ''
        const countChanged = next.length !== scoresCountRef.current

        scoresKeyRef.current = key
        scoresCountRef.current = next.length

        if (isFirstLoad) {
          setScores(next)
          return
        }

        if (countChanged) {
          setScores(next)
          setTickerKey(k => k + 1)
        } else {
          setScores(next)
        }
      }
    } catch (e) {
      console.log(e)
    }
  }, [league, miniLeagueId])

  const getLiveScoresRef = React.useRef(getLiveScores)
  getLiveScoresRef.current = getLiveScores

  React.useEffect(() => {
    // Reset ticker when competition mode changes
    scoresKeyRef.current = ''
    scoresCountRef.current = 0
    setScores([])
    setTickerKey(k => k + 1)
    getLiveScoresRef.current()
  }, [miniLeagueId])

  React.useEffect(() => {
    refreshTimer.current = setInterval(
      () => getLiveScoresRef.current(),
      REFRESH_INTERVAL_MS,
    )
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current)
      }
    }
  }, [miniLeagueId])

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState !== 'active') {
        if (refreshTimer.current) {
          clearInterval(refreshTimer.current)
          refreshTimer.current = null
        }
      } else {
        getLiveScoresRef.current()
        refreshTimer.current = setInterval(
          () => getLiveScoresRef.current(),
          REFRESH_INTERVAL_MS,
        )
      }
    })
    return () => subscription.remove()
  }, [miniLeagueId])

  const navigatingRef = React.useRef(false)
  const openMatchScoresheet = React.useCallback(
    async (matchId: number) => {
      if (navigatingRef.current || !matchId) {
        return
      }
      navigatingRef.current = true
      setNavigatingMatchId(matchId)
      try {
        // @ts-expect-error useLeague exposes GetMatchById at runtime
        const res = await league.GetMatchById(matchId)
        const matchInfo = matchInfoFromResponse(res)
        if (matchInfo) {
          router.push({
            pathname: '/Match',
            params: {params: JSON.stringify(matchInfo)},
          })
          return
        }
        console.warn('LiveScores: could not load match', matchId, res)
      } catch (e) {
        console.log(e)
      } finally {
        navigatingRef.current = false
        setNavigatingMatchId(null)
      }
    },
    [league],
  )

  if (scores.length === 0) {
    return null
  }

  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5'

  return (
    <View
      style={[styles.container, {backgroundColor}]}
      collapsable={false}>
      <ScoreMarquee
        key={tickerKey}
        scores={scores}
        borderColor={colors.border}
        textColor={textColor}
        onPress={openMatchScoresheet}
        navigatingMatchId={navigatingMatchId}
      />
    </View>
  )
}

const LiveScores = React.memo(LiveScoresWithData)

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
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
  cardWrap: {
    marginRight: STRIP_GAP,
  },
  scoreCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    fontSize: Platform.OS === 'ios' ? 22 : 18,
  },
  homeName: {
    textAlign: 'right',
    width: 140,
  },
  scoreText: {
    marginHorizontal: 8,
    width: 72,
    textAlign: 'center',
  },
  awayName: {
    textAlign: 'left',
    width: 140,
  },
})

export default LiveScores
