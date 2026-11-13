import {useMatchContext, type SocketStatus} from '@/context/MatchContext'
import {
  useOpenX01Score,
  useX01Score,
  type X01Audit,
  type X01BoardSnapshot,
} from '@/context/X01ScoreContext'
import {useTabContentBottomInset} from '@/hooks/useTabContentBottomInset'
import type {FrameType} from '@/components/Match/types'
import {playerNicknames} from '@/components/Match/components/frameCollapse'
import {
  MAX_X01_VISIT,
  applyX01Visit,
  commitX01Visit,
  DEFAULT_X01_START,
  firstOpenX01Leg,
  freshX01Board,
  loadX01Board,
  parseX01Start,
  reconcileX01Board,
  saveX01Board,
  scoreBoardFromSync,
  scoresheetScoringMode,
  scoreThrowsForSync,
  scoreTotalsFromHistory,
  advanceX01Thrower,
  canUndoX01,
  undoX01Visit,
  x01ActiveForLeg,
  x01LegWins,
  x01RosterNames,
  x01Starter,
  x01StorageKey,
  x01ThrowerName,
  x01ThrowerPlayerIdx,
  x01ThrowerSlot,
  x01WinsNeeded,
  commitCountUpVisit,
  otherX01Side,
  type X01Board,
  type X01Side,
} from '@/lib/x01Score'
import {
  CRICKET_DARTS_PER_TURN,
  CRICKET_TARGETS,
  cloneCricketBoard,
  cricketWinner,
  emptyCricketBoard,
  scoreCricketHit,
  type CricketBoard,
  type CricketMultiplier,
  type CricketTargetId,
} from '@/lib/cricketScore'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {useScoresheetTheme} from './scoresheetTheme'
import X01CloseDoor from './X01CloseDoor'
import X01Fireworks from './X01Fireworks'
import X01TonAnvil from './X01TonAnvil'

/** TNG computer screens used Helvetica Ultra Compressed. Saira Extra Condensed is the open stand-in. */
export const X01_FONT = 'SairaExtraCondensed'

function TrekText({style, ...props}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      {...props}
      style={[style, {fontFamily: X01_FONT, fontWeight: 'normal'}]}
    />
  )
}

const X01_TON_MIN = 100

type VisitLogEntry = {
  id: string
  side: X01Side
  legIndex: number
  points: number
  bust: boolean
  closed: boolean
  playerIdx: number
  throwerName?: string | null
  /** Score-game dart, such as T20, D25, or 0. Checkout chips leave this empty. */
  label?: string | null
}

function mapFrameVisits(
  visits: FrameType['visits'] | undefined,
): VisitLogEntry[] {
  if (!visits?.length) return []
  return visits.map((v, i) => ({
    id: `v-${i}-${v.legIndex}-${v.side}-${v.points}-${v.bust ? 1 : 0}-${v.close ? 1 : 0}-${v.playerIdx ?? 0}`,
    side: v.side,
    legIndex: Number(v.legIndex ?? 0),
    points: Math.max(0, Math.trunc(Number(v.points) || 0)),
    bust: Boolean(v.bust),
    closed: Boolean(v.close),
    playerIdx: Math.max(0, Math.trunc(Number(v.playerIdx) || 0)),
  }))
}

/** Keypad chips saved on the local undo stack, used when the live frame has not echoed them yet. */
function visitsFromUndo(board: X01Board | null | undefined): VisitLogEntry[] {
  if (!board?.undoStack?.length) return []
  const entries: VisitLogEntry[] = []
  board.undoStack.forEach((entry, i) => {
    const visit = entry.visit
    if (!visit) return
    entries.push({
      id: `undo-${i}-${visit.legIndex}-${visit.side}-${visit.points}-${visit.bust ? 1 : 0}-${visit.closed ? 1 : 0}-${visit.playerIdx}`,
      side: visit.side,
      legIndex: visit.legIndex,
      points: visit.points,
      bust: visit.bust,
      closed: visit.closed,
      playerIdx: visit.playerIdx,
    })
  })
  return entries
}

function dartFace(targetId: string, multiplier: 1 | 2 | 3, bull: string): string {
  if (targetId === '25') return Math.min(2, multiplier) === 2 ? `D${bull}` : bull
  const prefix = multiplier === 3 ? 'T' : multiplier === 2 ? 'D' : ''
  return `${prefix}${targetId}`
}

function scoreThrowHistory(
  board: X01Board | null | undefined,
  homeNames: string[],
  awayNames: string[],
): VisitLogEntry[] {
  if (!board?.undoStack?.length) return []
  return board.undoStack.map((entry, i) => {
    const names = entry.active === 'home' ? homeNames : awayNames
    return {
      id: `dart-${i}-${entry.label ?? entry.boardDelta?.points ?? 0}`,
      side: entry.active,
      legIndex: entry.legIndex,
      points: Math.max(0, Math.trunc(Number(entry.boardDelta?.points) || 0)),
      bust: false,
      closed: false,
      playerIdx: entry.boardDelta?.playerIdx ?? 0,
      label: entry.label?.trim() || null,
      throwerName: x01ThrowerName(names, entry, entry.active),
    }
  })
}
function preferVisitLog(
  remote: VisitLogEntry[],
  fromUndo: VisitLogEntry[],
): VisitLogEntry[] {
  return remote.length >= fromUndo.length ? remote : fromUndo
}

function rosterNameAtSlot(
  nicknames: string[],
  playerIds: Array<number | null | undefined> | undefined,
  playerIdx: number,
): string | null {
  if (!Array.isArray(playerIds)) return null
  let filled = -1
  for (let i = 0; i < playerIds.length; i++) {
    if (!(Number(playerIds[i]) > 0)) continue
    filled += 1
    if (i === playerIdx) return nicknames[filled] ?? null
  }
  return nicknames[playerIdx] ?? null
}

const KEY_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['clear', '0', 'back'],
] as const

const KEY_GAP = 10
/** Saira Extra Condensed Bold: ascender 1135 + descender 439, cap height 688, units per em 1000. */
const KEY_LINE = 1574 / 1000
const KEY_CAP = 688 / 1000
const KEY_ASCENT = 1135 / 1000
/** Lowercase words look low when their capitals are centered. */
const KEY_WORD_LIFT = 0.12
const KEY_FACE = '#2563EB'
const KEY_FACE_PRESSED = '#93C5FD'
const KEY_BORDER = 'rgba(255,255,255,0.25)'

function KeyCell({
  label,
  accessibilityLabel,
  disabled,
  onPress,
  flex = 1,
  fontSize,
  opacity = 1,
  selected = false,
}: {
  label: string
  accessibilityLabel: string
  disabled?: boolean
  onPress: () => void
  flex?: number
  fontSize: number
  opacity?: number
  selected?: boolean
}) {
  const [pressed, setPressed] = React.useState(false)
  const [cellHeight, setCellHeight] = React.useState(0)
  const lineHeight = Math.ceil(fontSize * KEY_LINE)
  const lift = /^[0-9]+$/.test(label) ? 0 : fontSize * KEY_WORD_LIFT
  // The line box can be taller than the key. Sized freely, both platforms
  // clamp it to the key and the digits sink, so give it its full height.
  const top = cellHeight / 2 - fontSize * (KEY_ASCENT - KEY_CAP / 2) - lift
  return (
    <View
      style={{
        flex,
        opacity,
        backgroundColor: pressed ? KEY_FACE_PRESSED : KEY_FACE,
        borderRadius: 16,
        borderCurve: 'continuous',
        borderWidth: selected ? 2 : 1,
        borderColor: pressed || selected ? '#FFFFFF' : KEY_BORDER,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{disabled, selected}}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onLayout={e => {
          const h = e.nativeEvent.layout.height
          setCellHeight(prev => (prev === h ? prev : h))
        }}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}>
        {cellHeight > 0 ? (
          <TrekText
            numberOfLines={1}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top,
              height: lineHeight,
              textAlign: 'center',
              color: '#FFFFFF',
              fontSize,
              lineHeight,
              includeFontPadding: false,
              textAlignVertical: 'top',
            }}>
            {label}
          </TrekText>
        ) : null}
      </Pressable>
    </View>
  )
}

export function GameScoreButton({
  frameIndex,
  label,
  type,
  showClose,
  showScore,
  disabled,
}: {
  frameIndex: number
  label?: string
  type?: string
  showClose?: boolean
  showScore?: boolean
  disabled?: boolean
}) {
  const open = useOpenX01Score()
  const {state}: any = useMatchContext()
  const {t} = useTranslation()
  const [pressed, setPressed] = React.useState(false)
  const mode = scoresheetScoringMode({showClose, showScore})
  const frame = state.frameData?.[frameIndex]
  // TEMP: allow X01 without a full roster so scoring can be tested first.
  // Restore `frameHasCompleteRosters(...)` gate before release.
  const hasPlayers = true
  const hasFirstDart = Number(frame?.firstDart ?? 0) > 0
  const softBlocked = !hasFirstDart
  const blocked = Boolean(disabled) || softBlocked
  if (!open || mode == null) return null
  const start = mode === 'close' ? parseX01Start(label, type) : null
  const labelText =
    mode === 'score'
      ? t('score_open')
      : start != null
        ? t('x01_score_game', {start})
        : t('x01_score_game_plain')

  function tryOpen() {
    // TEMP: players gate disabled — see hasPlayers above.
    if (!hasFirstDart) {
      Alert.alert(
        t(mode === 'score' ? 'score_need_first_dart_title' : 'x01_need_first_dart_title'),
        t(mode === 'score' ? 'score_need_first_dart_body' : 'x01_need_first_dart_body'),
      )
      return
    }
    if (disabled) return
    Haptics.selectionAsync()
    open(frameIndex)
  }

  return (
    <View
      style={{
        alignSelf: 'stretch',
        marginHorizontal: 12,
        marginTop: 4,
        marginBottom: 10,
        minHeight: 48,
        borderRadius: 14,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: pressed && !blocked ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
        backgroundColor:
          pressed && !blocked ? KEY_FACE_PRESSED : KEY_FACE,
        opacity: blocked ? 0.45 : 1,
        overflow: 'hidden',
        shadowColor: '#0F172A',
        shadowOpacity: blocked ? 0.08 : 0.28,
        shadowRadius: blocked ? 2 : 8,
        shadowOffset: {width: 0, height: blocked ? 0 : 3},
        elevation: blocked ? 0 : 3,
      }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labelText}
        accessibilityState={{disabled: blocked}}
        disabled={Boolean(disabled) && !softBlocked}
        onPress={tryOpen}
        onPressIn={() => {
          if (!blocked) setPressed(true)
        }}
        onPressOut={() => setPressed(false)}
        style={{
          minHeight: 48,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
          <MCI name="target" size={20} color="#FFFFFF" />
          <Text
            numberOfLines={1}
            style={{color: '#FFFFFF', fontSize: 16, fontWeight: '800'}}>
            {labelText}
          </Text>
          <Text style={{color: '#FFFFFF', fontSize: 18, fontWeight: '800'}}>
            {'>'}
          </Text>
        </View>
      </Pressable>
    </View>
  )
}

export default function GameScoreScreen({
  frameIndex,
  embedded = false,
  onClose,
}: {
  frameIndex: number
  embedded?: boolean
  onClose: () => void
}) {
  const {
    state,
    UpdateFrameStats,
    RecordThrow,
    SyncX01Board,
    UpdateFrameWin,
    ClearFrameWinner,
    socketStatus,
    lastSyncAt,
    canEditScoresheet,
  }: any = useMatchContext()
  const readOnly = canEditScoresheet === false
  const x01Score = useX01Score()
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const tabBottomInset = useTabContentBottomInset(12)
  // Android keeps the tab bar while scoring and lays content out above it.
  const bottomInset = Platform.OS === 'android' ? 12 : tabBottomInset
  const insets = useSafeAreaInsets()
  const {width, height} = useWindowDimensions()
  const landscape = width > height
  const keypadHeight = Math.round(height * (3 / 8))
  const keyRowHeight = (keypadHeight - KEY_GAP * 4) / 5
  const scoreKeypadHeight = Math.round(height * 0.4)
  const keyDigitSize = Math.max(12, Math.floor((keyRowHeight * 0.58) / KEY_CAP))
  const keyLabelSize = Math.max(11, Math.floor(keyDigitSize * 0.58))
  const keyDeleteSize = Math.max(keyLabelSize + 4, Math.round(keyDigitSize * 0.9))
  const frame = state.frameData?.[frameIndex] as FrameType | undefined
  const matchId = Number(state.matchInfo?.match_id ?? 0)
  const homeTeamId = Number(state.matchInfo?.home_team_id ?? 0)
  const awayTeamId = Number(state.matchInfo?.away_team_id ?? 0)
  const mode = scoresheetScoringMode(frame)
  const start =
    mode === 'score'
      ? 0
      : (parseX01Start(frame?.label, frame?.type) ?? DEFAULT_X01_START)
  const storageKey =
    matchId > 0 && mode ? x01StorageKey(matchId, frameIndex, mode) : ''
  const [board, setBoard] = React.useState<X01Board | null>(null)
  const [digits, setDigits] = React.useState('')
  const [note, setNote] = React.useState<{
    text: string
    tone: 'bust' | 'close' | 'plain'
  } | null>(null)
  const [holdServer, setHoldServer] = React.useState(false)
  const [fireworksKey, setFireworksKey] = React.useState(0)
  const [tonAnvilKey, setTonAnvilKey] = React.useState(0)
  const [tonAnvilPoints, setTonAnvilPoints] = React.useState(100)
  const [closeDoorKey, setCloseDoorKey] = React.useState(0)
  const [closeDoorFinished, setCloseDoorFinished] = React.useState(false)
  const [badgeName, setBadgeName] = React.useState('')
  const [visitLog, setVisitLog] = React.useState<VisitLogEntry[]>([])
  const ready = board != null
  const lock = React.useRef(false)
  const visitSeedKey = React.useRef<string>('')
  const valueTapCount = React.useRef(0)
  const valueTapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const skipRemoteVisitSync = React.useRef(false)
  const openLeg =
    frame && frame.type !== 'section' ? firstOpenX01Leg(frame) : null
  if (
    holdServer &&
    board != null &&
    openLeg != null &&
    openLeg <= board.legIndex
  ) {
    setHoldServer(false)
  }
  // Another device scored on this Score game: take its full board and history.
  const remoteScore = frame && frame.type !== 'section' ? frame.x01 : null
  if (
    mode === 'score' &&
    board != null &&
    remoteScore?.mode === 'score' &&
    Array.isArray(remoteScore.throws) &&
    (remoteScore.rev ?? 0) > (board.rev ?? 0)
  ) {
    setBoard(
      scoreBoardFromSync(
        {...remoteScore, throws: remoteScore.throws},
        board.cricket?.multiplier ?? 1,
      ),
    )
  }
  const liveBoard =
    mode === 'close' &&
    board &&
    frame &&
    frame.type !== 'section' &&
    !holdServer
      ? reconcileX01Board(board, frame, homeTeamId, awayTeamId)
      : board

  React.useEffect(() => {
    lock.current = false
  }, [liveBoard])

  // Seed / resync visit history when opening a frame or when Redis visits update.
  React.useEffect(() => {
    const key = `${matchId}:${frameIndex}:${mode ?? ''}`
    const remote = mapFrameVisits(frame?.visits)
    if (visitSeedKey.current !== key) {
      visitSeedKey.current = key
      skipRemoteVisitSync.current = false
      setVisitLog(prev => preferVisitLog(remote, prev))
      return
    }
    if (skipRemoteVisitSync.current) return
    setVisitLog(prev => {
      if (remote.length === 0 && prev.length > 0) return prev
      if (remote.length === prev.length) {
        const same = remote.every(
          (r, i) =>
            r.points === prev[i]?.points &&
            r.side === prev[i]?.side &&
            r.bust === prev[i]?.bust &&
            r.closed === prev[i]?.closed &&
            r.legIndex === prev[i]?.legIndex,
        )
        if (same) return prev
      }
      return remote
    })
  }, [matchId, frameIndex, mode, frame?.visits])

  function clearValueTapStreak() {
    valueTapCount.current = 0
    if (valueTapTimer.current) {
      clearTimeout(valueTapTimer.current)
      valueTapTimer.current = null
    }
  }

  React.useEffect(() => {
    return () => {
      if (valueTapTimer.current) clearTimeout(valueTapTimer.current)
    }
  }, [])

  function resetScoresToOriginal() {
    if (!mode || !frame || frame.type === 'section' || !liveBoard) return
    if (liveBoard.done) return
    clearValueTapStreak()
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    const starter = x01Starter(frame.firstDart, homeTeamId, awayTeamId)
    const legIndex =
      mode === 'close'
        ? (firstOpenX01Leg(frame) ?? liveBoard.legIndex)
        : liveBoard.legIndex
    const active = x01ActiveForLeg(starter, legIndex)
    if (mode === 'score') {
      if (liveBoard.home > 0) {
        UpdateFrameStats(frameIndex, 'home', 'boardScore', -liveBoard.home)
      }
      if (liveBoard.away > 0) {
        UpdateFrameStats(frameIndex, 'away', 'boardScore', -liveBoard.away)
      }
    }
    const next =
      mode === 'score'
        ? ({
            start: 0,
            legIndex,
            home: 0,
            away: 0,
            active,
            done: false,
            homeThrower: 0,
            awayThrower: 0,
            undoStack: [],
            cricket: emptyCricketBoard(),
          } satisfies X01Board)
        : freshX01Board({start, legIndex, active})
    skipRemoteVisitSync.current = true
    setDigits('')
    setNote({text: t(mode === 'score' ? 'score_reset' : 'x01_scores_reset'), tone: 'bust'})
    setVisitLog([])
    setHoldServer(true)
    persist(next, {
      syncRemote: true,
      clearVisits: true,
      audit: {action: 'reset', side: active, legIndex},
    })
  }

  function onValueDisplayPress() {
    if (readOnly) return
    if (!ready || liveBoard?.done) return
    if (valueTapTimer.current) clearTimeout(valueTapTimer.current)
    valueTapCount.current += 1
    if (valueTapCount.current >= 5) {
      resetScoresToOriginal()
      return
    }
    valueTapTimer.current = setTimeout(() => {
      valueTapCount.current = 0
      valueTapTimer.current = null
    }, 1600)
  }

  function toSnapshot(next: X01Board): X01BoardSnapshot | null {
    if (!mode) return null
    return {
      mode,
      start: next.start,
      home: next.home,
      away: next.away,
      active: next.active,
      legIndex: next.legIndex,
      done: next.done,
      rev: next.rev ?? 0,
      homeThrower: next.homeThrower,
      awayThrower: next.awayThrower,
      ...(mode === 'score'
        ? {
            cricket: {
              home: {...(next.cricket ?? emptyCricketBoard()).home},
              away: {...(next.cricket ?? emptyCricketBoard()).away},
            },
            dartsThrown: next.cricket?.dartsThrown ?? 0,
            throws: scoreThrowsForSync(next),
          }
        : {}),
    }
  }

  function publish(next: X01Board) {
    const snap = toSnapshot(next)
    if (snap) x01Score?.publishBoard(frameIndex, snap)
  }

  React.useEffect(() => {
    if (!frame || frame.type === 'section' || !mode) return
    let cancelled = false
    const snapshot = frame
    const scoringMode = mode
    ;(async () => {
      const saved = storageKey ? await loadX01Board(storageKey) : null
      if (cancelled) return
      const initial = resolveInitialBoard(
        saved,
        snapshot,
        start,
        homeTeamId,
        awayTeamId,
        scoringMode,
      )
      setBoard(initial)
      setVisitLog(prev =>
        preferVisitLog(
          preferVisitLog(mapFrameVisits(snapshot.visits), visitsFromUndo(initial)),
          prev,
        ),
      )
      const snap = toSnapshot(initial)
      if (snap) x01Score?.publishBoard(frameIndex, snap)
    })()
    return () => {
      cancelled = true
    }
    // Later leg updates go through reconcileX01Board. Reloading on each
    // scoresheet tick would replace a visit that was just entered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, start, frame?.type, homeTeamId, awayTeamId, mode])

  React.useEffect(() => {
    if (liveBoard) publish(liveBoard)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    liveBoard?.rev,
    liveBoard?.home,
    liveBoard?.away,
    liveBoard?.active,
    liveBoard?.legIndex,
    liveBoard?.done,
    liveBoard?.start,
    mode,
  ])

  // Checkout games: follow the shared board from other devices.
  React.useEffect(() => {
    if (mode === 'score') return
    const remote = frame?.x01
    if (!remote || !mode || remote.mode !== mode) return
    const starter = x01Starter(frame?.firstDart, homeTeamId, awayTeamId)
    const legIndex = Math.max(0, Math.trunc(Number(remote.legIndex) || 0))
    const remoteActive =
      hasNoRecordedThrows(
        {
          home: remote.home,
          away: remote.away,
          start: remote.start,
          done: remote.done,
          undoStack: [],
        },
        mode,
        frame?.visits,
      )
        ? x01ActiveForLeg(starter, legIndex)
        : remote.active
    const next: X01Board = {
      start: remote.start,
      home: remote.home,
      away: remote.away,
      active: remoteActive,
      legIndex,
      done: remote.done,
      homeThrower: remote.homeThrower ?? 0,
      awayThrower: remote.awayThrower ?? 0,
      undoStack: [],
      cricket: mode === 'score' ? emptyCricketBoard() : undefined,
      rev: remote.rev,
    }
    setBoard(prev => {
      if (prev && remote.rev != null && remote.rev <= (prev.rev ?? 0)) {
        return prev
      }
      if (
        prev &&
        prev.start === next.start &&
        prev.home === next.home &&
        prev.away === next.away &&
        prev.active === next.active &&
        prev.legIndex === next.legIndex &&
        prev.done === next.done &&
        (remote.homeThrower == null || prev.homeThrower === next.homeThrower) &&
        (remote.awayThrower == null || prev.awayThrower === next.awayThrower)
      ) {
        return prev
      }
      // Opening the screen has no previous board yet. Saving here would
      // replace the stored undo stack before the local board finishes loading.
      if (!prev) return next
      // A scoresheet echo can arrive with the total from before this dart.
      // Keep the points already added once a number is scoring.
      if (
        mode === 'score' &&
        prev.undoStack.length > 0 &&
        (prev.home !== next.home || prev.away !== next.away)
      ) {
        return prev
      }
      const keepHistory =
        prev.home === next.home &&
        prev.away === next.away &&
        prev.legIndex === next.legIndex &&
        prev.start === next.start
      const merged: X01Board = {
        ...next,
        cricket: prev.cricket ?? next.cricket,
        homeThrower: remote.homeThrower ?? (keepHistory ? prev.homeThrower : 0),
        awayThrower: remote.awayThrower ?? (keepHistory ? prev.awayThrower : 0),
        undoStack: keepHistory ? prev.undoStack : [],
      }
      if (storageKey) saveX01Board(storageKey, merged)
      return merged
    })
    if (mode === 'score' && liveBoard && liveBoard.undoStack.length > 0) {
      publish(liveBoard)
    } else {
      x01Score?.publishBoard(frameIndex, {
        mode,
        start: remote.start,
        home: remote.home,
        away: remote.away,
        active: remoteActive,
        legIndex,
        done: remote.done,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    frame?.x01?.mode,
    frame?.x01?.start,
    frame?.x01?.home,
    frame?.x01?.away,
    frame?.x01?.active,
    frame?.x01?.legIndex,
    frame?.x01?.done,
    frame?.x01?.rev,
    frame?.x01?.homeThrower,
    frame?.x01?.awayThrower,
    frame?.firstDart,
    frame?.visits,
    homeTeamId,
    awayTeamId,
    mode,
    frameIndex,
    storageKey,
  ])

  // Before any throws, keep the highlighted side on the first-dart team.
  React.useEffect(() => {
    if (!board || !mode || !frame || frame.type === 'section') return
    if (!hasNoRecordedThrows(board, mode, frame.visits)) return
    const starter = x01Starter(frame.firstDart, homeTeamId, awayTeamId)
    const expected = x01ActiveForLeg(starter, board.legIndex)
    if (board.active === expected) return
    persist({...board, active: expected}, {syncRemote: true})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    board?.home,
    board?.away,
    board?.start,
    board?.active,
    board?.legIndex,
    board?.done,
    board?.undoStack?.length,
    frame?.firstDart,
    frame?.visits,
    homeTeamId,
    awayTeamId,
    mode,
  ])

  /** `shared` bumps the revision for boards sent another way (with a throw). */
  function persist(
    value: X01Board,
    opts?: {
      syncRemote?: boolean
      clearVisits?: boolean
      shared?: boolean
      audit?: X01Audit
    },
  ): X01Board {
    const next =
      opts?.syncRemote || opts?.shared
        ? {
            ...value,
            rev:
              Math.max(value.rev ?? 0, liveBoard?.rev ?? 0, frame?.x01?.rev ?? 0) + 1,
          }
        : value
    setBoard(next)
    if (storageKey) saveX01Board(storageKey, next)
    publish(next)
    if (opts?.syncRemote && !readOnly) {
      const snap = toSnapshot(next)
      if (snap) {
        SyncX01Board?.(frameIndex, snap, {
          clearVisits: opts.clearVisits,
          audit: opts.audit,
        })
      }
    }
    return next
  }

  function throwerIdFor(value: X01Board, side: X01Side): number | undefined {
    const playerIds =
      side === 'home' ? frame?.homePlayerIds : frame?.awayPlayerIds
    const id = Number(playerIds?.[x01ThrowerPlayerIdx(value, side, playerIds)] ?? 0)
    return id > 0 ? id : undefined
  }

  function chooseSide(side: X01Side) {
    if (readOnly) return
    if (!liveBoard || liveBoard.done || liveBoard.active === side) return
    Haptics.selectionAsync()
    persist(
      {
        ...liveBoard,
        active: side,
        cricket: liveBoard.cricket
          ? {
              ...liveBoard.cricket,
              dartsThrown: 0,
              home: {...liveBoard.cricket.home},
              away: {...liveBoard.cricket.away},
            }
          : liveBoard.cricket,
      },
      {
        syncRemote: true,
        audit: {action: 'side', side, legIndex: liveBoard.legIndex},
      },
    )
    setNote(null)
  }

  function setHitMultiplier(multiplier: CricketMultiplier) {
    if (readOnly) return
    if (!liveBoard || mode !== 'score' || liveBoard.done) return
    const cricket = liveBoard.cricket ?? emptyCricketBoard()
    if (cricket.multiplier === multiplier) return
    Haptics.selectionAsync()
    persist({
      ...liveBoard,
      cricket: {
        ...cricket,
        multiplier,
        home: {...cricket.home},
        away: {...cricket.away},
      },
    })
  }

  function throwDart(targetId: CricketTargetId, multiplier?: CricketMultiplier) {
    if (readOnly) return
    if (!liveBoard || !frame || lock.current || liveBoard.done || mode !== 'score') {
      return
    }
    const cricket = liveBoard.cricket ?? emptyCricketBoard()
    const target = CRICKET_TARGETS.find(item => item.id === targetId)
    if (!target) return
    const side = liveBoard.active
    const opponent = otherX01Side(side)
    const hit = scoreCricketHit(
      cricket[side][target.id],
      cricket[opponent][target.id],
      multiplier ?? cricket.multiplier,
      target.value,
    )
    if (hit.kind === 'invalid') return
    lock.current = true
    const thrown = cricket.dartsThrown + 1
    const rotate = thrown >= CRICKET_DARTS_PER_TURN
    const nextMarks = {
      ...cricket[side],
      [target.id]: hit.nextMarks,
    }
    const nextCricket: CricketBoard = {
      home: side === 'home' ? nextMarks : {...cricket.home},
      away: side === 'away' ? nextMarks : {...cricket.away},
      dartsThrown: rotate ? 0 : thrown,
      multiplier: 1,
    }
    const previous = cloneCricketBoard(cricket)
    const afterHit: X01Board = {
      ...liveBoard,
      home: side === 'home' ? liveBoard.home + hit.points : liveBoard.home,
      away: side === 'away' ? liveBoard.away + hit.points : liveBoard.away,
      active: rotate ? opponent : side,
      cricket: nextCricket,
      undoStack: [
        ...liveBoard.undoStack,
        {
          home: liveBoard.home,
          away: liveBoard.away,
          active: side,
          legIndex: liveBoard.legIndex,
          done: liveBoard.done,
          homeThrower: liveBoard.homeThrower,
          awayThrower: liveBoard.awayThrower,
          close: null,
          boardDelta: hit.points > 0 ? {side, points: hit.points} : null,
          cricket: previous,
          sector: Number(target.id),
          multiplier:
            target.id === '25'
              ? Math.min(2, multiplier ?? cricket.multiplier)
              : (multiplier ?? cricket.multiplier),
          label: dartFace(
            target.id,
            multiplier ?? cricket.multiplier,
            t('score_bull'),
          ),
        },
      ],
    }
    const rosterLen =
      side === 'home'
        ? x01RosterNames(
            playerNicknames(state.teams, homeTeamId, frame?.homePlayerIds),
          ).length
        : x01RosterNames(
            playerNicknames(state.teams, awayTeamId, frame?.awayPlayerIds),
          ).length
    const audit: X01Audit = {
      action: 'dart',
      side,
      throwerId: throwerIdFor(liveBoard, side),
      label: dartFace(target.id, multiplier ?? cricket.multiplier, t('score_bull')),
      points: hit.points,
      dart: thrown,
      legIndex: liveBoard.legIndex,
    }
    const totals = scoreTotalsFromHistory(afterHit.undoStack)
    const winner = cricketWinner(nextCricket, totals, side)
    if (winner) {
      persist(
        {...afterHit, home: totals.home, away: totals.away, active: side, done: true},
        {syncRemote: true, audit},
      )
      if (hit.points > 0) {
        UpdateFrameStats(frameIndex, side, 'boardScore', hit.points)
      }
      UpdateFrameWin?.(
        side,
        frameIndex,
        side === 'home' ? homeTeamId : awayTeamId,
        false,
      )
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setNote({
        text: t('score_won', {
          team:
            (side === 'home'
              ? state.matchInfo?.home_team_short_name
              : state.matchInfo?.away_team_short_name) ||
            t(side === 'home' ? 'home' : 'away'),
        }),
        tone: 'close',
      })
      return
    }
    persist(
      rotate ? advanceX01Thrower(afterHit, side, rosterLen) : afterHit,
      {syncRemote: true, audit},
    )
    if (hit.points > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      UpdateFrameStats(frameIndex, side, 'boardScore', hit.points)
      setNote({text: t('score_plus', {score: hit.points}), tone: 'close'})
      return
    }
    Haptics.selectionAsync()
    setNote({
      text:
        hit.kind === 'closed'
          ? t('score_number_closed')
          : hit.kind === 'marks'
            ? t('score_marks', {n: hit.nextMarks})
            : t('score_miss'),
      tone: hit.kind === 'none' ? 'bust' : 'close',
    })
  }

  function throwMiss() {
    if (readOnly) return
    if (!liveBoard || !frame || lock.current || liveBoard.done || mode !== 'score') {
      return
    }
    const cricket = liveBoard.cricket ?? emptyCricketBoard()
    const side = liveBoard.active
    const opponent = otherX01Side(side)
    lock.current = true
    const thrown = cricket.dartsThrown + 1
    const rotate = thrown >= CRICKET_DARTS_PER_TURN
    const nextCricket = {
      home: {...cricket.home},
      away: {...cricket.away},
      dartsThrown: rotate ? 0 : thrown,
      multiplier: cricket.multiplier,
    }
    const afterHit: X01Board = {
      ...liveBoard,
      active: rotate ? opponent : side,
      cricket: nextCricket,
      undoStack: [
        ...liveBoard.undoStack,
        {
          home: liveBoard.home,
          away: liveBoard.away,
          active: side,
          legIndex: liveBoard.legIndex,
          done: liveBoard.done,
          homeThrower: liveBoard.homeThrower,
          awayThrower: liveBoard.awayThrower,
          close: null,
          boardDelta: null,
          cricket: cloneCricketBoard(cricket),
          sector: 0,
          multiplier: 1,
          label: '0',
        },
      ],
    }
    const rosterLen =
      side === 'home'
        ? x01RosterNames(
            playerNicknames(state.teams, homeTeamId, frame?.homePlayerIds),
          ).length
        : x01RosterNames(
            playerNicknames(state.teams, awayTeamId, frame?.awayPlayerIds),
          ).length
    persist(
      rotate ? advanceX01Thrower(afterHit, side, rosterLen) : afterHit,
      {
        syncRemote: true,
        audit: {
          action: 'miss',
          side,
          throwerId: throwerIdFor(liveBoard, side),
          dart: thrown,
          legIndex: liveBoard.legIndex,
        },
      },
    )
    Haptics.selectionAsync()
    setNote({text: t('score_miss'), tone: 'plain'})
  }

  function tapKey(key: string) {
    if (readOnly) return
    if (!liveBoard || liveBoard.done) return
    clearValueTapStreak()
    Haptics.selectionAsync()
    if (key === 'clear') {
      setDigits('')
      return
    }
    if (key === 'back') {
      setDigits(value => value.slice(0, -1))
      return
    }
    setDigits(value => {
      const next = `${value}${key}`.replace(/^0+(?=\d)/, '')
      if (next.length > 3) return value
      const n = Number(next)
      if (!Number.isFinite(n) || n > MAX_X01_VISIT) return value
      return next
    })
  }

  function enter() {
    if (readOnly) return
    if (!liveBoard || !frame || lock.current || liveBoard.done) return
    clearValueTapStreak()
    const points = Math.trunc(Number(digits || '0') || 0)
    if (points <= 0) return
    const throwSide = liveBoard.active
    const playerIds =
      throwSide === 'home' ? frame.homePlayerIds : frame.awayPlayerIds
    const playerIdx = x01ThrowerPlayerIdx(liveBoard, throwSide, playerIds)
    const throwerNames = playerNicknames(
      state.teams,
      throwSide === 'home' ? homeTeamId : awayTeamId,
      playerIds,
    )
    const throwerName = rosterNameAtSlot(throwerNames, playerIds, playerIdx)
    const result =
      mode === 'score'
        ? commitCountUpVisit(liveBoard, points)
        : commitX01Visit(
            liveBoard,
            points,
            x01LegWins(frame),
            x01WinsNeeded(frame),
            playerIdx,
          )
    if (result.type !== 'applied') return
    lock.current = true
    setDigits('')
    const visit = {
      side: throwSide,
      legIndex: liveBoard.legIndex,
      points,
      bust: result.reflected,
      closed: Boolean(result.closed),
      board: mode === 'score',
      playerIdx,
    }
    const stack = result.board.undoStack
    const top = stack[stack.length - 1]
    const board = {
      ...result.board,
      undoStack: top
        ? [
            ...stack.slice(0, -1),
            {
              ...top,
              visit,
              close: top.close
                ? {...top.close, playerIdx}
                : top.close,
            },
          ]
        : stack,
    }
    const saved = persist(board, {shared: true})
    setVisitLog(prev => [
      ...prev,
      {
        id: `local-${Date.now()}-${prev.length}`,
        side: visit.side,
        legIndex: visit.legIndex,
        points: visit.points,
        bust: visit.bust,
        closed: visit.closed,
        playerIdx,
        throwerName,
      },
    ])
    RecordThrow?.(frameIndex, {
      ...visit,
      x01: toSnapshot(saved) ?? undefined,
    })
    const isMaxVisit = points === MAX_X01_VISIT && !result.reflected
    const isClose = Boolean(result.closed && result.close)
    const isTon =
      !result.reflected &&
      !isClose &&
      points >= X01_TON_MIN &&
      points < MAX_X01_VISIT
    if (isMaxVisit) {
      setBadgeName(throwerName?.trim() ?? '')
      setFireworksKey(n => n + 1)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } else if (isClose) {
      setBadgeName(throwerName?.trim() ?? '')
      setCloseDoorFinished(Boolean(result.board.done))
      setCloseDoorKey(n => n + 1)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    } else if (isTon) {
      setBadgeName(throwerName?.trim() ?? '')
      setTonAnvilPoints(points)
      setTonAnvilKey(n => n + 1)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    }
    if (mode === 'score') {
      if (!isMaxVisit && !isTon && !isClose) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
      setNote(isTon ? {text: t('x01_ton', {score: points}), tone: 'close'} : null)
      return
    }
    if (isClose) {
      setNote({
        text: result.board.done ? t('x01_finished') : t('x01_closed'),
        tone: 'close',
      })
      return
    }
    if (result.reflected) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      setNote({
        text: t('x01_bust', {score: result.nextRemaining}),
        tone: 'bust',
      })
      return
    }
    if (isTon) {
      setNote({text: t('x01_ton', {score: points}), tone: 'close'})
      return
    }
    if (!isMaxVisit) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    setNote(null)
  }

  function undo() {
    if (readOnly) return
    if (!liveBoard || lock.current) return
    const undone = undoX01Visit(liveBoard)
    if (!undone) return
    lock.current = true
    Haptics.selectionAsync()
    setHoldServer(true)
    setDigits('')
    setNote(null)
    setVisitLog(prev => (prev.length > 0 ? prev.slice(0, -1) : prev))
    const popped = liveBoard.undoStack[liveBoard.undoStack.length - 1]
    const saved = persist(undone.board, {
      shared: true,
      syncRemote: !undone.reverseVisit,
      audit: {
        action: 'undo',
        side: popped?.active ?? liveBoard.active,
        label: popped?.label ?? undefined,
        points: -(popped?.boardDelta?.points ?? 0),
        legIndex: popped?.legIndex ?? liveBoard.legIndex,
      },
    })
    if (mode === 'score' && liveBoard.done && !undone.board.done) {
      ClearFrameWinner?.(frameIndex)
    }
    if (undone.reverseVisit) {
      RecordThrow?.(frameIndex, {
        ...undone.reverseVisit,
        undo: true,
        x01: toSnapshot(saved) ?? undefined,
      })
      return
    }
    if (undone.reverseBoard) {
      UpdateFrameStats(
        frameIndex,
        undone.reverseBoard.side,
        'boardScore',
        -undone.reverseBoard.points,
      )
    }
    if (undone.reverseClose) {
      UpdateFrameStats(
        frameIndex,
        undone.reverseClose.side,
        'closes',
        -undone.reverseClose.points,
        undone.reverseClose.playerIdx,
        undone.reverseClose.legIndex,
      )
    }
  }

  if (!frame || frame.type === 'section' || mode == null) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.canvas,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
        }}>
        <TrekText style={{color: theme.text, fontSize: 16, fontWeight: '700'}}>
          {t(mode === 'score' ? 'score_missing_game' : 'x01_missing_game')}
        </TrekText>
        <Pressable accessibilityRole="button" onPress={onClose}>
          <TrekText style={{color: theme.home.accent, fontSize: 16, fontWeight: '800'}}>
            {t('back')}
          </TrekText>
        </Pressable>
      </View>
    )
  }

  const active = liveBoard?.active ?? 'home'
  const typed = digits === '' ? 0 : Math.trunc(Number(digits) || 0)
  const remaining = liveBoard
    ? active === 'home'
      ? liveBoard.home
      : liveBoard.away
    : start
  const countTotal =
    mode === 'score' && typed > 0 ? remaining + typed : null
  const preview =
    mode === 'close' && typed > 0 ? applyX01Visit(remaining, typed) : null
  const done = Boolean(liveBoard?.done)
  const homeNames = playerNicknames(
    state.teams,
    homeTeamId,
    frame.homePlayerIds,
  )
  const awayNames = playerNicknames(
    state.teams,
    awayTeamId,
    frame.awayPlayerIds,
  )

  const cricketBoard = liveBoard?.cricket ?? emptyCricketBoard()
  const historyTotals =
    mode === 'score'
      ? scoreTotalsFromHistory(liveBoard?.undoStack)
      : {home: 0, away: 0}
  const historyVisits = (
    mode === 'score'
      ? scoreThrowHistory(liveBoard, homeNames, awayNames)
      : mode === 'close' && liveBoard
        ? visitLog.filter(v => v.legIndex === liveBoard.legIndex)
        : visitLog
  ).map(visit => ({
    ...visit,
    throwerName:
      visit.throwerName ??
      rosterNameAtSlot(
        visit.side === 'home' ? homeNames : awayNames,
        visit.side === 'home' ? frame.homePlayerIds : frame.awayPlayerIds,
        visit.playerIdx,
      ),
  }))
  const homeThrower = liveBoard
    ? x01ThrowerName(homeNames, liveBoard, 'home')
    : null
  const awayThrower = liveBoard
    ? x01ThrowerName(awayNames, liveBoard, 'away')
    : null
  const activeThrower = active === 'home' ? homeThrower : awayThrower
  const canUndoLatest =
    canUndoX01(liveBoard) && ready && (!done || mode === 'score')
  const wonText =
    mode === 'score' && done && liveBoard
      ? t('score_won', {
          team:
            (liveBoard.active === 'home'
              ? state.matchInfo?.home_team_short_name
              : state.matchInfo?.away_team_short_name) ||
            t(liveBoard.active === 'home' ? 'home' : 'away'),
        })
      : ''

  function pressSideScore(side: X01Side) {
    if (readOnly) return
    if (!liveBoard || liveBoard.done) return
    if (liveBoard.active !== side) {
      chooseSide(side)
      return
    }
    const names = x01RosterNames(side === 'home' ? homeNames : awayNames)
    if (names.length <= 1) return
    Haptics.selectionAsync()
    const next = advanceX01Thrower(liveBoard, side, names.length)
    persist(next, {
      syncRemote: true,
      audit: {
        action: 'thrower',
        side,
        throwerId: throwerIdFor(next, side),
        legIndex: liveBoard.legIndex,
      },
    })
  }

  const scores = (
    <View
      style={{
        flexGrow: landscape ? 1 : 0,
        flexShrink: mode === 'score' && landscape ? 1 : 0,
        minHeight: mode === 'score' && landscape ? 0 : undefined,
        gap: 8,
      }}>
      {mode === 'score' ? null : (
        <TrekText
          style={{
            color: theme.muted,
            fontSize: 12,
            fontWeight: '800',
            letterSpacing: 0.4,
            textAlign: 'center',
          }}>
          {`${t('x01_leg', {n: (liveBoard?.legIndex ?? 0) + 1})} · ${start}`}
        </TrekText>
      )}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <View style={{flex: 1, minWidth: 0}}>
          {activeThrower && !done ? (
            <TrekText
              numberOfLines={1}
              style={{
                color: active === 'home' ? theme.home.accent : theme.away.accent,
                fontSize: 26,
                fontWeight: '800',
              }}>
              {t(mode === 'score' ? 'score_thrower' : 'x01_thrower', {
                name: activeThrower,
              })}
            </TrekText>
          ) : null}
        </View>
        <SyncStatus
          status={socketStatus ?? 'offline'}
          lastSyncAt={lastSyncAt ?? null}
          viewOnly={readOnly}
          serverOutdated={
            (liveBoard?.rev ?? 0) > 0 && frame.x01 != null && frame.x01.rev == null
          }
        />
      </View>
      <View
        style={{
          flexDirection: landscape ? 'column' : 'row',
          flex: landscape && mode !== 'score' ? 1 : undefined,
          gap: 8,
        }}>
        <SideScore
          side="home"
          name={state.matchInfo?.home_team_short_name || t('home')}
          playerNames={homeNames}
          thrower={homeThrower}
          throwerIndex={
            liveBoard ? x01ThrowerSlot(liveBoard, 'home', homeNames.length) : -1
          }
          score={
            mode === 'score'
              ? (liveBoard?.undoStack.length
                  ? historyTotals.home
                  : (liveBoard?.home ?? 0))
              : (liveBoard?.home ?? start)
          }
          legs={Number(frame.homeScore ?? 0)}
          active={active === 'home'}
          done={done}
          markZero={mode === 'close'}
          scoreGame={mode === 'score'}
          onPress={() => pressSideScore('home')}
        />
        <SideScore
          side="away"
          name={state.matchInfo?.away_team_short_name || t('away')}
          playerNames={awayNames}
          thrower={awayThrower}
          throwerIndex={
            liveBoard ? x01ThrowerSlot(liveBoard, 'away', awayNames.length) : -1
          }
          score={
            mode === 'score'
              ? (liveBoard?.undoStack.length
                  ? historyTotals.away
                  : (liveBoard?.away ?? 0))
              : (liveBoard?.away ?? start)
          }
          legs={Number(frame.awayScore ?? 0)}
          active={active === 'away'}
          done={done}
          markZero={mode === 'close'}
          scoreGame={mode === 'score'}
          onPress={() => pressSideScore('away')}
        />
      </View>
      {landscape && mode === 'score' ? (
        <CricketMarks board={cricketBoard} layout="column" />
      ) : null}
    </View>
  )
  const controls = (
    <View
      pointerEvents={readOnly ? 'none' : 'auto'}
      style={{
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        minHeight: 0,
        gap: 8,
        opacity: readOnly ? 0.45 : 1,
      }}>
      {mode === 'score' ? (
        <View style={{flex: 1, gap: 8}}>
          <VisitHistory
            visits={historyVisits}
            canUndoLatest={canUndoLatest}
            onUndoLatest={undo}
            undoLabel={t('score_undo')}
            emptyLabel={t('score_history_empty')}
          />
          <CricketHits
          board={cricketBoard}
          showMarks={!landscape}
          disabled={done || !ready}
          canUndo={canUndoX01(liveBoard) && ready}
          dartNumber={(liveBoard?.cricket?.dartsThrown ?? 0) + 1}
          note={note?.text ?? (done ? wonText : '')}
          noteTone={note?.tone ?? (done ? 'close' : 'plain')}
          keypadHeight={scoreKeypadHeight}
          onMultiplier={setHitMultiplier}
          onTarget={throwDart}
          onZero={throwMiss}
          onUndo={undo}
        />
        </View>
      ) : (
      <View style={{flex: 1}}>
      <VisitHistory
        visits={historyVisits}
        canUndoLatest={canUndoLatest}
        onUndoLatest={undo}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('x01_input_total')}
        onPress={onValueDisplayPress}
        style={{alignItems: 'center', minHeight: 64, justifyContent: 'center'}}>
        <TrekText
          style={{
            color: theme.text,
            fontSize: 40,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
          }}>
          {digits === '' ? '0' : digits}
        </TrekText>
        <TrekText
          style={{
            color: done || preview?.closed || note?.tone === 'close'
              ? theme.win
              : preview?.reflected || note?.tone === 'bust'
                ? theme.gold
                : theme.muted,
            fontSize: 13,
            fontWeight: '700',
            minHeight: 18,
          }}>
          {done
            ? t('x01_finished')
            : countTotal != null
              ? t('x01_adds', {score: countTotal})
              : preview?.closed
                ? t('x01_will_close')
                : preview?.reflected
                  ? t('x01_bust', {score: preview.remaining})
                  : preview
                    ? t('x01_leaves', {score: preview.remaining})
                    : (note?.text ?? '')}
        </TrekText>
      </Pressable>
      <View
        style={{
          height: keypadHeight,
          width: '100%',
          marginTop: 'auto',
          alignSelf: 'center',
          gap: KEY_GAP,
          opacity: done || !ready ? 0.4 : 1,
        }}>
        {KEY_ROWS.map(row => (
          <View
            key={row.join('-')}
            style={{flex: 1, flexDirection: 'row', gap: KEY_GAP}}>
            {row.map(key => (
              <KeyCell
                key={key}
                label={
                  key === 'clear' ? t('clear') : key === 'back' ? '⌫' : key
                }
                accessibilityLabel={
                  key === 'clear'
                    ? t('clear')
                    : key === 'back'
                      ? t('x01_undo_digit')
                      : key
                }
                disabled={done || !ready}
                onPress={() => tapKey(key)}
                fontSize={
                  key === 'back'
                    ? keyDeleteSize
                    : key === 'clear'
                      ? keyLabelSize
                      : keyDigitSize
                }
              />
            ))}
          </View>
        ))}
        <View style={{flex: 1, flexDirection: 'row', gap: KEY_GAP}}>
          <KeyCell
            label={t('x01_undo')}
            accessibilityLabel={t('x01_undo')}
            disabled={!canUndoX01(liveBoard) || !ready}
            onPress={undo}
            fontSize={keyLabelSize}
            opacity={canUndoX01(liveBoard) ? 1 : 0.4}
          />
          <KeyCell
            label={t('x01_enter')}
            accessibilityLabel={t('x01_enter')}
            disabled={done || !ready || typed <= 0}
            onPress={enter}
            flex={2}
            fontSize={keyLabelSize + 2}
            opacity={typed <= 0 ? 0.55 : 1}
          />
        </View>
      </View>
      </View>
      )}
    </View>
  )

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.canvas,
        paddingTop: 8,
        paddingBottom: bottomInset,
        paddingLeft: Math.max(12, insets.left),
        paddingRight: Math.max(12, insets.right),
        gap: 8,
      }}>
      {embedded ? (
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            minHeight: 36,
          }}>
          <MCI name="chevron-left" size={22} color={theme.text} />
          <TrekText style={{color: theme.text, fontSize: 16, fontWeight: '700'}}>
            {t(mode === 'score' ? 'score_sheet' : 'x01_scoresheet')}
          </TrekText>
        </Pressable>
      ) : null}
      {landscape ? (
        <View style={{flex: 1, flexDirection: 'row', gap: 12}}>
          {scores}
          {controls}
        </View>
      ) : (
        <>
          {scores}
          {controls}
        </>
      )}
      <X01Fireworks
        playKey={fireworksKey}
        name={badgeName}
        onDone={() => setFireworksKey(0)}
      />
      <X01TonAnvil
        playKey={tonAnvilKey}
        points={tonAnvilPoints}
        name={badgeName}
        onDone={() => setTonAnvilKey(0)}
      />
      <X01CloseDoor
        playKey={closeDoorKey}
        finished={closeDoorFinished}
        name={badgeName}
        onDone={() => setCloseDoorKey(0)}
      />
    </View>
  )
}

const SYNC_COLOR = {
  live: '#22C55E',
  connecting: '#F59E0B',
  offline: '#EF4444',
} as const

function SyncStatus({
  status,
  lastSyncAt,
  serverOutdated,
  viewOnly,
}: {
  status: SocketStatus
  lastSyncAt: number | null
  serverOutdated: boolean
  viewOnly: boolean
}) {
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const color = serverOutdated ? SYNC_COLOR.connecting : SYNC_COLOR[status]
  const connection = serverOutdated
    ? t('sync_server_outdated')
    : status === 'live'
      ? lastSyncAt
        ? t('sync_live_at', {
            time: new Date(lastSyncAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }),
          })
        : t('sync_live')
      : t(status === 'connecting' ? 'sync_connecting' : 'sync_offline')
  const label = viewOnly ? `${t('sync_view_only')} · ${connection}` : connection
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        gap: 6,
      }}>
      <View
        style={{width: 8, height: 8, borderRadius: 4, backgroundColor: color}}
      />
      <TrekText
        numberOfLines={1}
        style={{color: theme.muted, fontSize: 12, fontWeight: '700'}}>
        {label}
      </TrekText>
    </View>
  )
}

function VisitHistory({
  visits,
  canUndoLatest,
  onUndoLatest,
  undoLabel,
  emptyLabel,
}: {
  visits: VisitLogEntry[]
  canUndoLatest: boolean
  onUndoLatest: () => void
  undoLabel?: string
  emptyLabel?: string
}) {
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const scrollRef = React.useRef<ScrollView>(null)

  React.useEffect(() => {
    if (visits.length === 0) return
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({animated: true})
    })
    return () => cancelAnimationFrame(id)
  }, [visits.length])

  if (visits.length === 0) {
    return (
      <View
        style={{
          minHeight: 40,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 8,
        }}>
        <TrekText style={{color: theme.muted, fontSize: 12, fontWeight: '600'}}>
          {emptyLabel ?? t('x01_history_empty')}
        </TrekText>
      </View>
    )
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{flexGrow: 0, flexShrink: 0}}
      contentContainerStyle={{
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 4,
        paddingVertical: 4,
        minHeight: 44,
      }}>
      {visits.map((visit, index) => {
        const latest = index === visits.length - 1
        const palette = visit.side === 'home' ? theme.home : theme.away
        const mark = visit.bust ? '!' : visit.closed ? '✓' : ''
        const name =
          visit.throwerName && visit.throwerName.trim() !== ''
            ? visit.throwerName.trim()
            : null
        return (
          <View
            key={visit.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingLeft: 12,
              paddingRight: latest && canUndoLatest ? 6 : 12,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: palette.panel,
              borderWidth: 1,
              borderColor: latest ? palette.accent : palette.border,
            }}>
            <View style={{gap: 1}}>
              {name ? (
                <TrekText
                  numberOfLines={1}
                  style={{
                    color: theme.muted,
                    fontSize: 10,
                    fontWeight: '700',
                    maxWidth: 72,
                  }}>
                  {name}
                </TrekText>
              ) : null}
              <TrekText
                style={{
                  color: palette.ink,
                  fontSize: 16,
                  fontWeight: '800',
                  fontVariant: ['tabular-nums'],
                }}>
                {visit.label?.trim() || visit.points}
                {mark ? (
                  <TrekText style={{color: visit.bust ? theme.gold : theme.win}}>
                    {mark}
                  </TrekText>
                ) : null}
              </TrekText>
            </View>
            {latest && canUndoLatest ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={undoLabel ?? t('x01_undo_latest')}
                onPress={onUndoLatest}
                hitSlop={8}
                style={{
                  minWidth: 32,
                  minHeight: 32,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: palette.button,
                }}>
                <MCI name="undo" size={16} color={palette.onButton} />
              </Pressable>
            ) : null}
          </View>
        )
      })}
    </ScrollView>
  )
}

function markSlashes(count: number) {
  const n = Math.min(3, Math.max(0, count))
  return n === 0 ? '·' : '/'.repeat(n)
}

function CricketMarks({
  board,
  layout,
}: {
  board: ReturnType<typeof emptyCricketBoard>
  layout: 'row' | 'column'
}) {
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  if (layout === 'row') {
    return (
      <View style={{flexDirection: 'row', gap: 4}}>
        {CRICKET_TARGETS.map(target => (
          <View key={target.id} style={{flex: 1, alignItems: 'center', gap: 1}}>
            <TrekText style={{color: theme.muted, fontSize: 11, fontWeight: '800'}}>
              {target.id === '25' ? t('score_bull') : target.label}
            </TrekText>
            <TrekText style={{color: theme.home.accent, fontSize: 12, fontWeight: '800'}}>
              {markSlashes(board.home[target.id])}
            </TrekText>
            <TrekText style={{color: theme.away.accent, fontSize: 12, fontWeight: '800'}}>
              {markSlashes(board.away[target.id])}
            </TrekText>
          </View>
        ))}
      </View>
    )
  }
  return (
    <View style={{gap: 2}}>
      {CRICKET_TARGETS.map(target => (
        <View
          key={target.id}
          style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <TrekText style={{flex: 1, color: theme.muted, fontSize: 13, fontWeight: '800'}}>
            {target.id === '25' ? t('score_bull') : target.label}
          </TrekText>
          <TrekText
            style={{
              width: 28,
              textAlign: 'center',
              color: theme.home.accent,
              fontSize: 14,
              fontWeight: '800',
            }}>
            {markSlashes(board.home[target.id])}
          </TrekText>
          <TrekText
            style={{
              width: 28,
              textAlign: 'center',
              color: theme.away.accent,
              fontSize: 14,
              fontWeight: '800',
            }}>
            {markSlashes(board.away[target.id])}
          </TrekText>
        </View>
      ))}
    </View>
  )
}

function CricketHits({
  board,
  showMarks = true,
  disabled,
  canUndo,
  dartNumber,
  note,
  noteTone,
  keypadHeight,
  onMultiplier,
  onTarget,
  onZero,
  onUndo,
}: {
  board: ReturnType<typeof emptyCricketBoard>
  showMarks?: boolean
  disabled: boolean
  canUndo: boolean
  dartNumber: number
  note: string
  noteTone: 'bust' | 'close' | 'plain'
  keypadHeight: number
  onMultiplier: (multiplier: CricketMultiplier) => void
  onTarget: (target: CricketTargetId, multiplier?: CricketMultiplier) => void
  onZero: () => void
  onUndo: () => void
}) {
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const [fitHeight, setFitHeight] = React.useState<number | null>(null)
  const numbers = CRICKET_TARGETS.filter(target => target.id !== '25')
  const rows = [numbers.slice(0, 3), numbers.slice(3, 6)]
  const rowCount = 4
  const padHeight = Math.min(keypadHeight, fitHeight ?? keypadHeight)
  const rowHeight = (padHeight - KEY_GAP * (rowCount - 1)) / rowCount
  const digitSize = Math.max(12, Math.floor((rowHeight * 0.58) / KEY_CAP))
  const labelSize = Math.max(11, Math.floor(digitSize * 0.58))
  return (
    <View style={{flex: 1, gap: 8, justifyContent: 'flex-end'}}>
      <TrekText
        style={{
          textAlign: 'center',
          color: noteTone === 'bust' ? theme.gold : noteTone === 'close' ? theme.win : theme.muted,
          fontSize: 13,
          fontWeight: '800',
          minHeight: 18,
        }}>
        {t('score_dart', {n: dartNumber})}
        {note ? ` · ${note}` : ''}
      </TrekText>
      {showMarks ? <CricketMarks board={board} layout="row" /> : null}
      <View
        onLayout={e => {
          const h = Math.round(e.nativeEvent.layout.height)
          setFitHeight(prev => (prev === h ? prev : h))
        }}
        style={{
          flex: 1,
          maxHeight: keypadHeight,
          minHeight: 4 * 40 + KEY_GAP * 3,
          width: '100%',
          alignSelf: 'center',
          gap: KEY_GAP,
        }}>
        <View style={{flex: 1, flexDirection: 'row', gap: KEY_GAP}}>
          {([1, 2, 3] as const).map(multiplier => (
            <KeyCell
              key={multiplier}
              label={
                multiplier === 1
                  ? t('score_single')
                  : multiplier === 2
                    ? t('score_double')
                    : t('score_triple')
              }
              accessibilityLabel={
                multiplier === 1
                  ? t('score_single')
                  : multiplier === 2
                    ? t('score_double')
                    : t('score_triple')
              }
              disabled={disabled}
              opacity={disabled ? 0.4 : 1}
              selected={board.multiplier === multiplier}
              onPress={() => onMultiplier(multiplier)}
              fontSize={labelSize}
            />
          ))}
        </View>
        {rows.map(row => (
          <View key={row[0].id} style={{flex: 1, flexDirection: 'row', gap: KEY_GAP}}>
            {row.map(target => (
              <KeyCell
                key={target.id}
                label={target.label}
                accessibilityLabel={target.label}
                disabled={disabled}
                opacity={disabled ? 0.4 : 1}
                onPress={() => onTarget(target.id)}
                fontSize={digitSize}
              />
            ))}
          </View>
        ))}
        <View style={{flex: 1, flexDirection: 'row', gap: KEY_GAP}}>
          <KeyCell
            label={t('score_undo')}
            accessibilityLabel={t('score_undo')}
            disabled={!canUndo}
            onPress={onUndo}
            fontSize={labelSize}
            opacity={canUndo ? 1 : 0.4}
          />
          <KeyCell
            label="0"
            accessibilityLabel="0"
            disabled={disabled}
            opacity={disabled ? 0.4 : 1}
            onPress={onZero}
            fontSize={digitSize}
          />
          <KeyCell
            label={t('score_bull')}
            accessibilityLabel={t('score_bull')}
            disabled={disabled}
            opacity={disabled ? 0.4 : 1}
            onPress={() => onTarget('25')}
            fontSize={labelSize}
          />
        </View>
      </View>
    </View>
  )
}

function SideScore({
  side,
  name,
  playerNames,
  thrower,
  throwerIndex,
  score,
  legs,
  active,
  done,
  markZero,
  scoreGame,
  onPress,
}: {
  side: X01Side
  name: string
  playerNames: string[]
  thrower: string | null
  throwerIndex: number
  score: number
  legs: number
  active: boolean
  done: boolean
  markZero?: boolean
  scoreGame?: boolean
  onPress: () => void
}) {
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const palette = side === 'home' ? theme.home : theme.away
  const status = scoreGame ? '' : `${t('legs')} ${legs}`
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      accessibilityLabel={
        thrower && active ? `${name}, ${thrower}, ${score}` : `${name}, ${score}`
      }
      disabled={done}
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 16,
        borderCurve: 'continuous',
        paddingVertical: 10,
        paddingHorizontal: 10,
        backgroundColor: active ? palette.panel : theme.card,
        borderWidth: active ? 2 : 1,
        borderColor: active ? palette.accent : theme.cardBorder,
        opacity: active || done ? 1 : 0.72,
        alignItems: 'center',
        gap: 2,
      }}>
      <TrekText
        numberOfLines={1}
        style={{
          color: palette.ink,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}>
        {name}
      </TrekText>
      {playerNames.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'stretch',
            gap: 4,
          }}>
          {playerNames.map((player, index) => {
            const throwing = active && !done && index === throwerIndex
            return (
              <View
                key={`${player}-${index}`}
                style={
                  throwing
                    ? {
                        backgroundColor: palette.button,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }
                    : undefined
                }>
                <TrekText
                  style={{
                    color: throwing ? palette.onButton : theme.muted,
                    fontSize: throwing ? 16 : 11,
                    fontWeight: throwing ? '800' : '600',
                  }}>
                  {player}
                </TrekText>
              </View>
            )
          })}
        </View>
      ) : null}
      <TrekText
        style={{
          color: markZero && score === 0 ? theme.win : palette.ink,
          fontSize: 36,
          fontWeight: '800',
          fontVariant: ['tabular-nums'],
        }}>
        {score}
      </TrekText>
      {status ? (
        <TrekText
          numberOfLines={1}
          style={{
            color: theme.muted,
            fontSize: 11,
            fontWeight: '800',
            textAlign: 'center',
          }}>
          {status}
        </TrekText>
      ) : null}
    </Pressable>
  )
}

/** True when nothing has been thrown yet on this board / frame. */
function hasNoRecordedThrows(
  board: Pick<X01Board, 'home' | 'away' | 'start' | 'done' | 'undoStack'>,
  mode: 'close' | 'score',
  visits: FrameType['visits'] | undefined,
): boolean {
  if (board.done) return false
  if (board.undoStack.length > 0) return false
  if (visits && visits.length > 0) return false
  if (mode === 'score') return board.home === 0 && board.away === 0
  return board.home === board.start && board.away === board.start
}

function resolveInitialBoard(
  saved: X01Board | null,
  frame: FrameType,
  start: number,
  homeTeamId: number,
  awayTeamId: number,
  mode: 'close' | 'score',
): X01Board {
  const starter = x01Starter(frame.firstDart, homeTeamId, awayTeamId)
  const remote = frame.x01
  if (
    mode === 'score' &&
    remote?.mode === 'score' &&
    Array.isArray(remote.throws) &&
    (remote.rev ?? 0) > (saved?.rev ?? 0)
  ) {
    return scoreBoardFromSync({...remote, throws: remote.throws}, 1)
  }
  if (mode === 'score') {
    const savedScore = saved
    const history = scoreTotalsFromHistory(savedScore?.undoStack)
    const fromThrows = (savedScore?.undoStack.length ?? 0) > 0
    const remoteHome = remote?.mode === 'score' ? remote.home : 0
    const remoteAway = remote?.mode === 'score' ? remote.away : 0
    const home = fromThrows
      ? history.home
      : Math.max(
          remoteHome,
          savedScore?.home ?? 0,
          Math.max(0, Math.trunc(Number(frame.homeBoardScore) || 0)),
        )
    const away = fromThrows
      ? history.away
      : Math.max(
          remoteAway,
          savedScore?.away ?? 0,
          Math.max(0, Math.trunc(Number(frame.awayBoardScore) || 0)),
        )
    const next: X01Board = {
      start: 0,
      legIndex: remote?.mode === 'score' ? remote.legIndex : (savedScore?.legIndex ?? 0),
      home,
      away,
      active: savedScore?.active ?? (remote?.mode === 'score' ? remote.active : starter),
      done: fromThrows && Boolean(savedScore?.done),
      homeThrower: savedScore?.homeThrower ?? 0,
      awayThrower: savedScore?.awayThrower ?? 0,
      undoStack: savedScore?.undoStack ?? [],
      cricket: savedScore?.cricket ?? emptyCricketBoard(),
    }
    if (hasNoRecordedThrows(next, mode, frame.visits)) {
      next.active = starter
    }
    return next
  }
  if (
    remote &&
    remote.mode === mode &&
    Number.isFinite(remote.home) &&
    Number.isFinite(remote.away)
  ) {
    const legIndex = Math.max(0, Math.trunc(Number(remote.legIndex) || 0))
    const kept =
      saved != null &&
      saved.start === remote.start &&
      saved.home === remote.home &&
      saved.away === remote.away &&
      saved.legIndex === legIndex &&
      saved.done === remote.done
        ? saved
        : null
    const draft = {
      start: remote.start,
      legIndex,
      home: remote.home,
      away: remote.away,
      active: remote.active,
      done: remote.done,
      homeThrower: remote.homeThrower ?? kept?.homeThrower ?? 0,
      awayThrower: remote.awayThrower ?? kept?.awayThrower ?? 0,
      undoStack: kept?.undoStack ?? ([] as X01Board['undoStack']),
      cricket:
        kept?.cricket ?? (mode === 'score' ? emptyCricketBoard() : undefined),
      rev: Math.max(remote.rev ?? 0, saved?.rev ?? 0),
    }
    if (hasNoRecordedThrows(draft, mode, frame.visits)) {
      draft.active = x01ActiveForLeg(starter, legIndex)
    }
    return draft
  }
  if (mode === 'score') {
    const serverHome = Math.max(0, Math.trunc(Number(frame.homeBoardScore ?? 0)))
    const serverAway = Math.max(0, Math.trunc(Number(frame.awayBoardScore ?? 0)))
    const savedScore = saved && saved.start === 0 ? saved : null
    const home = Math.max(serverHome, savedScore?.home ?? 0)
    const away = Math.max(serverAway, savedScore?.away ?? 0)
    const totalsMatch =
      savedScore != null && savedScore.home === home && savedScore.away === away
    const next: X01Board = {
      start: 0,
      legIndex: 0,
      home,
      away,
      active: savedScore?.active ?? starter,
      done: false,
      homeThrower: totalsMatch ? savedScore.homeThrower : 0,
      awayThrower: totalsMatch ? savedScore.awayThrower : 0,
      undoStack: totalsMatch ? savedScore.undoStack : [],
      cricket: savedScore?.cricket ?? emptyCricketBoard(),
    }
    if (hasNoRecordedThrows(next, mode, frame.visits)) {
      next.active = starter
    }
    return next
  }
  const open = firstOpenX01Leg(frame)
  if (open == null) {
    if (saved && saved.start === start) return {...saved, done: true}
    return freshX01Board({start, legIndex: 0, active: starter, done: true})
  }
  if (!saved || saved.start !== start || saved.done || saved.legIndex < open) {
    return freshX01Board({
      start,
      legIndex: open,
      active: x01ActiveForLeg(starter, open),
    })
  }
  if (hasNoRecordedThrows(saved, mode, frame.visits)) {
    return {
      ...saved,
      active: x01ActiveForLeg(starter, saved.legIndex),
    }
  }
  return saved
}
