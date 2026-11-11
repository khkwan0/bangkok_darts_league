import {useMatchContext} from '@/context/MatchContext'
import {useOpenX01Score} from '@/context/X01ScoreContext'
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
  scoresheetScoringMode,
  undoX01Visit,
  x01ActiveForLeg,
  x01LegWins,
  x01Starter,
  x01StorageKey,
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
  emptyCricketBoard,
  scoreCricketHit,
  type CricketMultiplier,
  type CricketTargetId,
} from '@/lib/cricketScore'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, Text, useWindowDimensions, View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {useScoresheetTheme} from './scoresheetTheme'

const KEY_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['clear', '0', 'back'],
] as const

const KEY_GAP = 10

export function X01ScoreButton({
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
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const mode = scoresheetScoringMode({showClose, showScore})
  if (!open || mode == null) return null
  const start = mode === 'close' ? parseX01Start(label, type) : null
  const labelText =
    mode === 'score'
      ? t('x01_add_points')
      : start != null
        ? t('x01_score_game', {start})
        : t('x01_score_game_plain')

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={labelText}
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync()
        open(frameIndex)
      }}
      style={({pressed}) => ({
        marginHorizontal: 14,
        marginBottom: 12,
        minHeight: 44,
        borderRadius: 12,
        borderCurve: 'continuous',
        backgroundColor: pressed ? theme.cardBorder : theme.faint,
        opacity: disabled ? 0.45 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      })}>
      <MCI name="target" size={18} color={theme.text} />
      <Text style={{color: theme.text, fontSize: 15, fontWeight: '800'}}>
        {labelText}
      </Text>
    </Pressable>
  )
}

export default function X01ScoreScreen({
  frameIndex,
  embedded = false,
  onClose,
}: {
  frameIndex: number
  embedded?: boolean
  onClose: () => void
}) {
  const {state, UpdateFrameStats, RecordThrow}: any = useMatchContext()
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const bottomInset = useTabContentBottomInset(12)
  const insets = useSafeAreaInsets()
  const {width, height} = useWindowDimensions()
  const landscape = width > height
  const sideInset = Math.max(12, insets.left) + Math.max(12, insets.right)
  const keypadColumn = landscape
    ? (width - sideInset - 12) / 2
    : width - sideInset
  const keySize = Math.max(
    48,
    Math.min(
      92,
      Math.floor((Math.min(360, keypadColumn) - KEY_GAP * 2) / 3),
    ),
  )
  const keypadWidth = keySize * 3 + KEY_GAP * 2
  const keyFace = theme.isDark ? '#2A3142' : '#FFFFFF'
  const keyBorder = theme.isDark
    ? 'rgba(226,232,240,0.22)'
    : 'rgba(15,23,42,0.12)'
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
    tone: 'bust' | 'close'
  } | null>(null)
  const [holdServer, setHoldServer] = React.useState(false)
  const [hitEntry, setHitEntry] = React.useState(false)
  const ready = board != null
  const lock = React.useRef(false)
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

  React.useEffect(() => {
    if (!frame || frame.type === 'section' || !mode) return
    let cancelled = false
    const snapshot = frame
    const scoringMode = mode
    ;(async () => {
      const saved = storageKey ? await loadX01Board(storageKey) : null
      if (cancelled) return
      setBoard(
        resolveInitialBoard(
          saved,
          snapshot,
          start,
          homeTeamId,
          awayTeamId,
          scoringMode,
        ),
      )
    })()
    return () => {
      cancelled = true
    }
    // Later leg updates go through reconcileX01Board. Reloading on each
    // scoresheet tick would replace a visit that was just entered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, start, frame?.type, homeTeamId, awayTeamId, mode])

  function persist(next: X01Board) {
    setBoard(next)
    if (storageKey) saveX01Board(storageKey, next)
  }

  function chooseSide(side: X01Side) {
    if (!liveBoard || liveBoard.done || liveBoard.active === side) return
    Haptics.selectionAsync()
    persist({
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
    })
    setNote(null)
  }

  function setHitMultiplier(multiplier: CricketMultiplier) {
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

  function throwDart(targetId: CricketTargetId) {
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
      cricket.multiplier,
      target.value,
    )
    if (hit.kind === 'invalid') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      setNote({text: t('x01_no_triple_bull'), tone: 'bust'})
      return
    }
    lock.current = true
    const thrown = cricket.dartsThrown + 1
    const rotate = thrown >= CRICKET_DARTS_PER_TURN
    const nextMarks = {
      ...cricket[side],
      [target.id]: hit.nextMarks,
    }
    const nextCricket = {
      home: side === 'home' ? nextMarks : {...cricket.home},
      away: side === 'away' ? nextMarks : {...cricket.away},
      dartsThrown: rotate ? 0 : thrown,
      multiplier: cricket.multiplier,
    }
    const previous = cloneCricketBoard(cricket)
    persist({
      ...liveBoard,
      home: side === 'home' ? liveBoard.home + hit.points : liveBoard.home,
      away: side === 'away' ? liveBoard.away + hit.points : liveBoard.away,
      active: rotate ? opponent : side,
      cricket: nextCricket,
      undo: {
        home: liveBoard.home,
        away: liveBoard.away,
        active: side,
        legIndex: liveBoard.legIndex,
        done: liveBoard.done,
        close: null,
        boardDelta: hit.points > 0 ? {side, points: hit.points} : null,
        cricket: previous,
      },
    })
    if (hit.points > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      UpdateFrameStats(frameIndex, side, 'boardScore', hit.points)
      setNote({text: t('x01_plus', {score: hit.points}), tone: 'close'})
      return
    }
    Haptics.selectionAsync()
    setNote({
      text:
        hit.kind === 'closed'
          ? t('x01_number_closed')
          : hit.kind === 'marks'
            ? t('x01_marks', {n: hit.nextMarks})
            : t('x01_no_score'),
      tone: hit.kind === 'none' ? 'bust' : 'close',
    })
  }

  function tapKey(key: string) {
    if (!liveBoard || liveBoard.done) return
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
    if (!liveBoard || !frame || lock.current || liveBoard.done) return
    const points = Math.trunc(Number(digits || '0') || 0)
    if (points <= 0) return
    const result =
      mode === 'score'
        ? commitCountUpVisit(liveBoard, points)
        : commitX01Visit(
            liveBoard,
            points,
            x01LegWins(frame),
            x01WinsNeeded(frame),
          )
    if (result.type !== 'applied') return
    lock.current = true
    setDigits('')
    const visit = {
      side: liveBoard.active,
      legIndex: liveBoard.legIndex,
      points,
      bust: result.reflected,
      closed: Boolean(result.closed),
      board: mode === 'score',
    }
    const board = {
      ...result.board,
      undo: result.board.undo ? {...result.board.undo, visit} : result.board.undo,
    }
    persist(board)
    RecordThrow?.(frameIndex, visit)
    if (mode === 'score') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setNote(null)
      return
    }
    if (result.closed && result.close) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setNote(null)
  }

  function undo() {
    if (!liveBoard || lock.current) return
    const undone = undoX01Visit(liveBoard)
    if (!undone) return
    lock.current = true
    Haptics.selectionAsync()
    setHoldServer(true)
    setDigits('')
    setNote(null)
    persist(undone.board)
    if (undone.reverseVisit) {
      RecordThrow?.(frameIndex, {...undone.reverseVisit, undo: true})
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
        0,
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
        <Text style={{color: theme.text, fontSize: 16, fontWeight: '700'}}>
          {t('x01_missing_game')}
        </Text>
        <Pressable accessibilityRole="button" onPress={onClose}>
          <Text style={{color: theme.home.accent, fontSize: 16, fontWeight: '800'}}>
            {t('back')}
          </Text>
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
  const scores = (
    <View style={{flex: landscape ? 1 : undefined, gap: 8}}>
      <Text
        style={{
          color: theme.muted,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 0.4,
          textAlign: 'center',
        }}>
        {mode === 'score'
          ? t('x01_running')
          : `${t('x01_leg', {n: (liveBoard?.legIndex ?? 0) + 1})} · ${start}`}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flex: landscape && !(mode === 'score' && hitEntry) ? 1 : undefined,
          gap: 8,
        }}>
        <SideScore
          side="home"
          name={state.matchInfo?.home_team_short_name || t('home')}
          players={homeNames.join(' · ')}
          score={liveBoard?.home ?? start}
          legs={Number(frame.homeScore ?? 0)}
          active={active === 'home'}
          done={done}
          markZero={mode === 'close'}
          onPress={() => chooseSide('home')}
        />
        <SideScore
          side="away"
          name={state.matchInfo?.away_team_short_name || t('away')}
          players={awayNames.join(' · ')}
          score={liveBoard?.away ?? start}
          legs={Number(frame.awayScore ?? 0)}
          active={active === 'away'}
          done={done}
          markZero={mode === 'close'}
          onPress={() => chooseSide('away')}
        />
      </View>
      {landscape && mode === 'score' && hitEntry ? (
        <CricketMarks board={cricketBoard} layout="column" />
      ) : null}
    </View>
  )
  const controls = (
    <View style={{flex: 1, gap: 8}}>
      {mode === 'score' ? (
        <View style={{flexDirection: 'row', gap: 8}}>
          <ModeChip
            label={t('x01_input_total')}
            selected={!hitEntry}
            onPress={() => setHitEntry(false)}
          />
          <ModeChip
            label={t('x01_input_hits')}
            selected={hitEntry}
            onPress={() => setHitEntry(true)}
          />
        </View>
      ) : null}
      {mode === 'score' && hitEntry ? (
        <CricketHits
          board={cricketBoard}
          showMarks={!landscape}
          disabled={done || !ready}
          canUndo={Boolean(liveBoard?.undo) && ready}
          dartNumber={(liveBoard?.cricket?.dartsThrown ?? 0) + 1}
          note={note?.text ?? ''}
          noteTone={note?.tone ?? 'plain'}
          onMultiplier={setHitMultiplier}
          onTarget={throwDart}
          onUndo={undo}
        />
      ) : (
      <View style={{flex: 1}}>
      <View style={{alignItems: 'center', minHeight: 64, justifyContent: 'center'}}>
        <Text
          style={{
            color: theme.text,
            fontSize: 40,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
          }}>
          {digits === '' ? '0' : digits}
        </Text>
        <Text
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
                : preview
                  ? t('x01_leaves', {score: preview.remaining})
                  : (note?.text ?? '')}
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: done || !ready ? 0.4 : 1,
        }}>
        <View style={{width: keypadWidth, gap: KEY_GAP}}>
        {KEY_ROWS.map(row => (
          <View key={row.join('-')} style={{flexDirection: 'row', gap: KEY_GAP}}>
            {row.map(key => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={
                  key === 'clear' ? t('clear') : key === 'back' ? t('x01_undo_digit') : key
                }
                disabled={done || !ready}
                onPress={() => tapKey(key)}
                style={({pressed}) => ({
                  width: keySize,
                  height: keySize,
                  borderRadius: 16,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: pressed ? theme.text : keyBorder,
                  backgroundColor: pressed ? theme.cardBorder : keyFace,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{
                    color: theme.text,
                    fontSize: key === 'clear' || key === 'back' ? 16 : 28,
                    fontWeight: '800',
                    paddingHorizontal: 4,
                  }}>
                  {key === 'clear' ? t('clear') : key === 'back' ? '⌫' : key}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={{flexDirection: 'row', gap: KEY_GAP}}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('x01_undo')}
            disabled={!liveBoard?.undo || !ready}
            onPress={undo}
            style={({pressed}) => ({
              width: keySize,
              height: keySize,
              borderRadius: 16,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: pressed ? theme.text : keyBorder,
              backgroundColor: pressed ? theme.cardBorder : keyFace,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: liveBoard?.undo ? 1 : 0.4,
            })}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                color: theme.text,
                fontSize: 16,
                fontWeight: '800',
                paddingHorizontal: 4,
              }}>
              {t('x01_undo')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('x01_enter')}
            disabled={done || !ready || typed <= 0}
            onPress={enter}
            style={({pressed}) => ({
              width: keySize * 2 + KEY_GAP,
              height: keySize,
              borderRadius: 16,
              borderCurve: 'continuous',
              backgroundColor: pressed
                ? theme.home.ink
                : active === 'home'
                  ? theme.home.button
                  : theme.away.button,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: typed <= 0 ? 0.55 : 1,
            })}>
            <Text style={{color: '#fff', fontSize: 18, fontWeight: '800'}}>
              {t('x01_enter')}
            </Text>
          </Pressable>
        </View>
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
          <Text style={{color: theme.text, fontSize: 16, fontWeight: '700'}}>
            {t('x01_scoresheet')}
          </Text>
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
    </View>
  )
}

function ModeChip({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  const theme = useScoresheetTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected}}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 36,
        borderRadius: 12,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: selected ? theme.text : theme.cardBorder,
        backgroundColor: selected ? theme.card : theme.faint,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{color: theme.text, fontSize: 14, fontWeight: '800'}}>
        {label}
      </Text>
    </Pressable>
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
            <Text style={{color: theme.muted, fontSize: 11, fontWeight: '800'}}>
              {target.id === '25' ? t('x01_bull') : target.label}
            </Text>
            <Text style={{color: theme.home.accent, fontSize: 12, fontWeight: '800'}}>
              {markSlashes(board.home[target.id])}
            </Text>
            <Text style={{color: theme.away.accent, fontSize: 12, fontWeight: '800'}}>
              {markSlashes(board.away[target.id])}
            </Text>
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
          <Text style={{flex: 1, color: theme.muted, fontSize: 13, fontWeight: '800'}}>
            {target.id === '25' ? t('x01_bull') : target.label}
          </Text>
          <Text
            style={{
              width: 28,
              textAlign: 'center',
              color: theme.home.accent,
              fontSize: 14,
              fontWeight: '800',
            }}>
            {markSlashes(board.home[target.id])}
          </Text>
          <Text
            style={{
              width: 28,
              textAlign: 'center',
              color: theme.away.accent,
              fontSize: 14,
              fontWeight: '800',
            }}>
            {markSlashes(board.away[target.id])}
          </Text>
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
  onMultiplier,
  onTarget,
  onUndo,
}: {
  board: ReturnType<typeof emptyCricketBoard>
  showMarks?: boolean
  disabled: boolean
  canUndo: boolean
  dartNumber: number
  note: string
  noteTone: 'bust' | 'close' | 'plain'
  onMultiplier: (multiplier: CricketMultiplier) => void
  onTarget: (target: CricketTargetId) => void
  onUndo: () => void
}) {
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const numbers = CRICKET_TARGETS.filter(target => target.id !== '25')
  const rows = [numbers.slice(0, 3), numbers.slice(3, 6)]
  return (
    <View style={{flex: 1, gap: 8, opacity: disabled ? 0.4 : 1}}>
      <Text
        style={{
          textAlign: 'center',
          color: noteTone === 'bust' ? theme.gold : noteTone === 'close' ? theme.win : theme.muted,
          fontSize: 13,
          fontWeight: '800',
          minHeight: 18,
        }}>
        {t('x01_dart', {n: dartNumber})}
        {note ? ` · ${note}` : ''}
      </Text>
      {showMarks ? <CricketMarks board={board} layout="row" /> : null}
      <View style={{flexDirection: 'row', gap: 8}}>
        {([1, 2, 3] as const).map(multiplier => (
          <Pressable
            key={multiplier}
            accessibilityRole="button"
            accessibilityState={{selected: board.multiplier === multiplier}}
            disabled={disabled}
            onPress={() => onMultiplier(multiplier)}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: 12,
              borderCurve: 'continuous',
              borderWidth: board.multiplier === multiplier ? 2 : 1,
              borderColor:
                board.multiplier === multiplier ? theme.text : theme.cardBorder,
              backgroundColor: theme.card,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{color: theme.text, fontSize: 15, fontWeight: '800'}}>
              {multiplier === 1
                ? t('x01_single')
                : multiplier === 2
                  ? t('x01_double')
                  : t('x01_triple')}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{flex: 1, gap: 8}}>
        {rows.map(row => (
          <View key={row[0].id} style={{flex: 1, flexDirection: 'row', gap: 8}}>
            {row.map(target => (
              <Pressable
                key={target.id}
                accessibilityRole="button"
                accessibilityLabel={target.label}
                disabled={disabled}
                onPress={() => onTarget(target.id)}
                style={({pressed}) => ({
                  flex: 1,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  backgroundColor: pressed ? theme.cardBorder : theme.card,
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}>
                <Text style={{color: theme.text, fontSize: 28, fontWeight: '800'}}>
                  {target.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={{flex: 1, flexDirection: 'row', gap: 8}}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('x01_undo')}
            disabled={disabled || !canUndo}
            onPress={onUndo}
            style={({pressed}) => ({
              flex: 0.7,
              borderRadius: 12,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: theme.cardBorder,
              backgroundColor: pressed ? theme.cardBorder : theme.card,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: canUndo ? 1 : 0.4,
            })}>
            <Text style={{color: theme.text, fontSize: 16, fontWeight: '800'}}>
              {t('x01_undo')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('x01_bull')}
            disabled={disabled}
            onPress={() => onTarget('25')}
            style={({pressed}) => ({
              flex: 1.4,
              borderRadius: 12,
              borderCurve: 'continuous',
              backgroundColor: pressed ? theme.cardBorder : theme.card,
              borderWidth: 1,
              borderColor: theme.cardBorder,
              alignItems: 'center',
              justifyContent: 'center',
            })}>
            <Text style={{color: theme.text, fontSize: 22, fontWeight: '800'}}>
              {t('x01_bull')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

function SideScore({
  side,
  name,
  players,
  score,
  legs,
  active,
  done,
  markZero,
  onPress,
}: {
  side: X01Side
  name: string
  players: string
  score: number
  legs: number
  active: boolean
  done: boolean
  markZero?: boolean
  onPress: () => void
}) {
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const palette = side === 'home' ? theme.home : theme.away
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      accessibilityLabel={`${name}, ${score}`}
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
      <Text
        numberOfLines={1}
        style={{
          color: palette.ink,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}>
        {name}
      </Text>
      {players ? (
        <Text numberOfLines={1} style={{color: theme.muted, fontSize: 11, fontWeight: '600'}}>
          {players}
        </Text>
      ) : null}
      <Text
        style={{
          color: markZero && score === 0 ? theme.win : palette.ink,
          fontSize: 36,
          fontWeight: '800',
          fontVariant: ['tabular-nums'],
        }}>
        {score}
      </Text>
      <Text style={{color: active && !done ? palette.accent : theme.muted, fontSize: 11, fontWeight: '800'}}>
        {active && !done ? t('x01_throwing') : `${t('legs')} ${legs}`}
      </Text>
    </Pressable>
  )
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
  if (mode === 'score') {
    const serverHome = Math.max(0, Math.trunc(Number(frame.homeBoardScore ?? 0)))
    const serverAway = Math.max(0, Math.trunc(Number(frame.awayBoardScore ?? 0)))
    const savedScore = saved && saved.start === 0 ? saved : null
    const home = Math.max(serverHome, savedScore?.home ?? 0)
    const away = Math.max(serverAway, savedScore?.away ?? 0)
    const totalsMatch =
      savedScore != null && savedScore.home === home && savedScore.away === away
    return {
      start: 0,
      legIndex: 0,
      home,
      away,
      active: savedScore?.active ?? starter,
      done: false,
      undo: totalsMatch ? savedScore.undo : null,
      cricket: savedScore?.cricket ?? emptyCricketBoard(),
    }
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
  return saved
}
