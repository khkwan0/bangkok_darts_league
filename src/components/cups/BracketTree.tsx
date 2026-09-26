import {ThemedText as Text} from '@/components/ThemedText'
import React from 'react'
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native'
import {Gesture, GestureDetector} from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import {FullWindowOverlay} from 'react-native-screens'

export type BracketSlotRef = {
  temp_id: string
  slot: 'home' | 'away'
}

export type BracketTreeMatch = {
  match_id: number
  temp_id?: string
  bracket_side: string
  round: number
  position: number
  home_display: string | null
  away_display: string | null
  status_id: number
  home_frames: number | null
  away_frames: number | null
  home_entry_id?: number | null
  away_entry_id?: number | null
  date?: string | null
  venue_name?: string | null
  table_number?: number | null
  home_team_id?: number | null
  away_team_id?: number | null
  home_tournament_team_id?: number | null
  away_tournament_team_id?: number | null
}

export type BracketTreeStage = {
  stage_key: string
  label: string
  stage_order?: number
  matches: BracketTreeMatch[]
}

type Props = {
  stages: BracketTreeStage[]
  onMatchPress?: (match: BracketTreeMatch) => void
  openingId?: number | null
  /** Enable R1 player drag-swap (draft preview). */
  editableRound1?: boolean
  onSwapRound1Slots?: (from: BracketSlotRef, to: BracketSlotRef) => void
  onClearRound1Slot?: (slot: BracketSlotRef) => void
  /** When set, tapping an empty R1 slot assigns this entry. */
  selectedUnplacedEntryId?: number | null
  onAssignRound1Slot?: (slot: BracketSlotRef) => void
  /** Max tables — enables table badge cycle when onCycleMatchTable is set. */
  tablesAvailable?: number | null
  onCycleMatchTable?: (match: BracketTreeMatch) => void
  /** Parent vertical ScrollView — used for edge auto-scroll while dragging. */
  verticalScrollRef?: React.RefObject<ScrollView | null>
  /** Current vertical contentOffset.y of that ScrollView. */
  verticalScrollOffsetRef?: React.MutableRefObject<number>
}

const COL_WIDTH = 200
const COL_GAP = 28
const CONNECTOR_W = 14
const CARD_H = 78
const CARD_H_EDIT = 96
const CARD_GAP = 14
const OVERLAY_W = 188
const OVERLAY_H = 40
/** Distance from screen edge that starts auto-scroll while dragging. */
const EDGE_PX = 64
/** Max scroll speed (px per frame) at the very edge. */
const MAX_SCROLL_SPEED = 18

type SlotEntry = {
  key: string
  ref: BracketSlotRef
  label: string
  viewRef: React.RefObject<View | null>
}

type HScrollEntry = {
  id: string
  ref: React.RefObject<ScrollView | null>
  offsetRef: React.MutableRefObject<number>
}

type DragOverlay = {
  label: string
  x: number
  y: number
}

type DragCtx = {
  registerSlot: (entry: SlotEntry) => void
  unregisterSlot: (key: string) => void
  registerHScroll: (entry: HScrollEntry) => void
  unregisterHScroll: (id: string) => void
  beginDrag: (ref: BracketSlotRef, pageX: number, pageY: number) => void
  moveDrag: (pageX: number, pageY: number) => void
  endDrag: (pageX: number, pageY: number) => void
  selected: BracketSlotRef | null
  draggingKey: string | null
  toggleSelect: (ref: BracketSlotRef) => void
  hoverKey: string | null
}

const DragContext = React.createContext<DragCtx | null>(null)

type EditCtx = {
  onClearRound1Slot?: (slot: BracketSlotRef) => void
  selectedUnplacedEntryId?: number | null
  onAssignRound1Slot?: (slot: BracketSlotRef) => void
  tablesAvailable?: number | null
  onCycleMatchTable?: (match: BracketTreeMatch) => void
}
const EditContext = React.createContext<EditCtx>({})

function slotKey(ref: BracketSlotRef) {
  return `${ref.temp_id}:${ref.slot}`
}

function sameSlot(a: BracketSlotRef | null, b: BracketSlotRef) {
  return !!a && a.temp_id === b.temp_id && a.slot === b.slot
}

function measureView(
  viewRef: React.RefObject<View | null>,
): Promise<{x: number; y: number; w: number; h: number} | null> {
  return new Promise(resolve => {
    const node = viewRef.current
    if (!node) {
      resolve(null)
      return
    }
    node.measureInWindow((x, y, w, h) => {
      if (w <= 0 || h <= 0) resolve(null)
      else resolve({x, y, w, h})
    })
  })
}

function PlayerSlot({
  match,
  side,
  isDark,
  editable,
}: {
  match: BracketTreeMatch
  side: 'home' | 'away'
  isDark: boolean
  editable: boolean
}) {
  const drag = React.useContext(DragContext)
  const edit = React.useContext(EditContext)
  const viewRef = React.useRef<View>(null)
  const entryId =
    side === 'home' ? match.home_entry_id ?? null : match.away_entry_id ?? null
  const isEmpty = entryId == null
  const label = isEmpty
    ? edit.selectedUnplacedEntryId
      ? 'Tap to place'
      : 'Empty / BYE'
    : side === 'home'
      ? match.home_display || `Entry #${entryId}`
      : match.away_display || `Entry #${entryId}`
  const tempId = match.temp_id
  const slotRef: BracketSlotRef | null = tempId
    ? {temp_id: tempId, slot: side}
    : null
  const key = slotRef ? slotKey(slotRef) : ''
  const selected = slotRef && drag ? sameSlot(drag.selected, slotRef) : false
  const hovered = slotRef && drag ? drag.hoverKey === key : false
  const isSource = !!(drag?.draggingKey && drag.draggingKey === key)
  const assignReady = !!(isEmpty && edit.selectedUnplacedEntryId && slotRef)

  const dragActionsRef = React.useRef(drag)
  dragActionsRef.current = drag
  const activeSV = useSharedValue(0)

  React.useEffect(() => {
    if (!editable || !tempId || !drag || isEmpty) return
    const entryRef: BracketSlotRef = {temp_id: tempId, slot: side}
    drag.registerSlot({key, ref: entryRef, label, viewRef})
    return () => drag.unregisterSlot(key)
  }, [editable, key, label, drag, tempId, side, isEmpty])

  const beginDragJS = React.useCallback(
    (r: BracketSlotRef, x: number, y: number) => {
      dragActionsRef.current?.beginDrag(r, x, y)
    },
    [],
  )
  const moveDragJS = React.useCallback((x: number, y: number) => {
    dragActionsRef.current?.moveDrag(x, y)
  }, [])
  const endDragJS = React.useCallback((x: number, y: number) => {
    dragActionsRef.current?.endDrag(x, y)
  }, [])

  const pan = React.useMemo(() => {
    if (!editable || !tempId || isEmpty) return Gesture.Pan().enabled(false)
    const captured: BracketSlotRef = {temp_id: tempId, slot: side}
    return Gesture.Pan()
      .activateAfterLongPress(160)
      .onStart(e => {
        activeSV.value = 1
        runOnJS(beginDragJS)(captured, e.absoluteX, e.absoluteY)
      })
      .onUpdate(e => {
        runOnJS(moveDragJS)(e.absoluteX, e.absoluteY)
      })
      .onEnd(e => {
        activeSV.value = 0
        runOnJS(endDragJS)(e.absoluteX, e.absoluteY)
      })
      .onFinalize(() => {
        activeSV.value = 0
      })
  }, [
    editable,
    tempId,
    side,
    isEmpty,
    activeSV,
    beginDragJS,
    moveDragJS,
    endDragJS,
  ])

  const placeholderStyle = useAnimatedStyle(() => ({
    opacity: activeSV.value ? 0.35 : 1,
  }))

  if (!editable || !slotRef || !drag) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          minHeight: 22,
        }}>
        <Text style={{flex: 1, fontWeight: '600'}} numberOfLines={1}>
          {side === 'home'
            ? match.home_display || 'TBD'
            : match.away_display || 'TBD'}
        </Text>
        {match.status_id === 3 ? (
          <Text style={{fontVariant: ['tabular-nums'], opacity: 0.75}}>
            {side === 'home'
              ? (match.home_frames ?? 0)
              : (match.away_frames ?? 0)}
          </Text>
        ) : null}
      </View>
    )
  }

  const row = (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          minHeight: 30,
          paddingVertical: 3,
          paddingHorizontal: 4,
          borderRadius: 6,
          backgroundColor: assignReady
            ? isDark
              ? '#14532d'
              : '#dcfce7'
            : hovered
              ? isDark
                ? '#1e3a5f'
                : '#dbeafe'
              : selected
                ? isDark
                  ? '#3b2f1a'
                  : '#fef3c7'
                : isDark
                  ? '#262626'
                  : '#f8fafc',
          borderWidth: 1,
          borderColor: assignReady
            ? isDark
              ? '#4ade80'
              : '#16a34a'
            : hovered
              ? isDark
                ? '#60a5fa'
                : '#3b82f6'
              : selected
                ? isDark
                  ? '#fbbf24'
                  : '#d97706'
                : isDark
                  ? '#333'
                  : '#e2e8f0',
          borderStyle: isEmpty ? 'dashed' : 'solid',
          opacity: isSource ? 0.35 : 1,
        },
        placeholderStyle,
      ]}>
      {!isEmpty ? (
        <Pressable
          onPress={() => drag.toggleSelect(slotRef)}
          hitSlop={6}
          style={{
            width: 22,
            height: 22,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            backgroundColor: isDark ? '#334155' : '#e2e8f0',
          }}>
          <Text style={{fontSize: 12, opacity: 0.7, fontWeight: '800'}}>
            ☰
          </Text>
        </Pressable>
      ) : null}
      <Text
        style={{
          flex: 1,
          fontWeight: isEmpty ? '500' : '600',
          fontSize: 13,
          opacity: isEmpty ? 0.55 : 1,
          fontStyle: isEmpty ? 'italic' : 'normal',
        }}
        numberOfLines={1}>
        {label}
      </Text>
      {!isEmpty && edit.onClearRound1Slot ? (
        <Pressable
          onPress={() => edit.onClearRound1Slot?.(slotRef)}
          hitSlop={8}
          style={{
            width: 22,
            height: 22,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            backgroundColor: isDark ? '#7f1d1d' : '#fee2e2',
          }}>
          <Text style={{fontSize: 14, fontWeight: '800', color: isDark ? '#fecaca' : '#b91c1c'}}>
            ×
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  )

  return (
    <View ref={viewRef} collapsable={false}>
      {isEmpty ? (
        <Pressable
          onPress={() => {
            if (assignReady) edit.onAssignRound1Slot?.(slotRef)
          }}
          disabled={!assignReady}>
          {row}
        </Pressable>
      ) : (
        <GestureDetector gesture={pan}>{row}</GestureDetector>
      )}
    </View>
  )
}

function MatchBox({
  match,
  onPress,
  disabled,
  isDark,
  editableRound1,
}: {
  match: BracketTreeMatch
  onPress?: (match: BracketTreeMatch) => void
  disabled?: boolean
  isDark: boolean
  editableRound1?: boolean
}) {
  const edit = React.useContext(EditContext)
  const editable = !!(editableRound1 && match.round === 1 && match.temp_id)
  const cardH = editable ? CARD_H_EDIT : CARD_H
  const hasSides =
    !!(match.home_team_id || match.home_tournament_team_id) &&
    !!(match.away_team_id || match.away_tournament_team_id)
  const playable = hasSides && match.status_id !== 3
  const canOpen =
    !editable &&
    !!onPress &&
    match.match_id > 0 &&
    (playable || match.status_id === 3) &&
    !disabled
  const tableLabel =
    match.table_number != null && Number(match.table_number) > 0
      ? `Table ${match.table_number}`
      : edit.tablesAvailable
        ? 'No table'
        : null
  const canCycleTable = !!(
    edit.tablesAvailable &&
    edit.tablesAvailable > 0 &&
    edit.onCycleMatchTable &&
    (match.temp_id || (match.match_id != null && match.match_id > 0))
  )

  const content = (
    <View
      style={{
        width: COL_WIDTH,
        height: cardH,
        paddingHorizontal: editable ? 6 : 10,
        paddingVertical: editable ? 6 : 8,
        borderRadius: 10,
        backgroundColor: isDark ? '#1f1f1f' : '#fff',
        borderWidth: 1,
        borderColor: isDark ? '#333' : '#e2e8f0',
        justifyContent: 'center',
        gap: editable ? 2 : 0,
        opacity:
          playable || match.status_id === 3 || !onPress || editable ? 1 : 0.85,
      }}>
      <PlayerSlot
        match={match}
        side="home"
        isDark={isDark}
        editable={editable}
      />
      <PlayerSlot
        match={match}
        side="away"
        isDark={isDark}
        editable={editable}
      />
      <View
        style={{
          marginTop: editable ? 2 : 6,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
          paddingHorizontal: editable ? 4 : 0,
        }}>
        <Text
          style={{
            flex: 1,
            fontSize: editable ? 9 : 10,
            opacity: 0.5,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
          numberOfLines={1}>
          {editable
            ? `R${match.round} · drag to swap`
            : `R${match.round} · ${match.bracket_side}`}
          {!editable && match.venue_name ? ` · ${match.venue_name}` : ''}
          {!editable && match.date ? ` · ${String(match.date).slice(0, 10)}` : ''}
        </Text>
        {tableLabel ? (
          <Pressable
            disabled={!canCycleTable}
            onPress={() => edit.onCycleMatchTable?.(match)}
            hitSlop={6}
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: canCycleTable
                ? isDark
                  ? '#1e3a5f'
                  : '#dbeafe'
                : isDark
                  ? '#333'
                  : '#f1f5f9',
            }}>
            <Text
              style={{
                fontSize: 9,
                fontWeight: '800',
                color: canCycleTable
                  ? isDark
                    ? '#93c5fd'
                    : '#1d4ed8'
                  : undefined,
                opacity: canCycleTable ? 1 : 0.65,
              }}>
              {tableLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )

  if (!canOpen) return content

  return (
    <Pressable onPress={() => onPress?.(match)} disabled={disabled}>
      {content}
    </Pressable>
  )
}

function SideTree({
  label,
  matches,
  onMatchPress,
  openingId,
  isDark,
  editableRound1,
}: {
  label: string
  matches: BracketTreeMatch[]
  onMatchPress?: (match: BracketTreeMatch) => void
  openingId?: number | null
  isDark: boolean
  editableRound1?: boolean
}) {
  const drag = React.useContext(DragContext)
  const hScrollRef = React.useRef<ScrollView>(null)
  const hOffsetRef = React.useRef(0)
  const scrollId = React.useId()

  React.useEffect(() => {
    if (!editableRound1 || !drag) return
    drag.registerHScroll({
      id: scrollId,
      ref: hScrollRef,
      offsetRef: hOffsetRef,
    })
    return () => drag.unregisterHScroll(scrollId)
  }, [editableRound1, drag, scrollId])

  const byRound = new Map<number, BracketTreeMatch[]>()
  for (const m of matches) {
    const list = byRound.get(m.round) ?? []
    list.push(m)
    byRound.set(m.round, list)
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b)
  if (!rounds.length) return null

  const cardH = editableRound1 ? CARD_H_EDIT : CARD_H
  const r1Step = cardH + CARD_GAP
  const firstRoundMatches = [...(byRound.get(rounds[0]) ?? [])].sort(
    (a, b) => a.position - b.position,
  )
  const r1Count = Math.max(firstRoundMatches.length, 1)
  const treeHeight = r1Count * r1Step - CARD_GAP
  const connectorColor = isDark ? '#475569' : '#cbd5e1'

  return (
    <View style={{marginBottom: 16}}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          opacity: 0.5,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          marginBottom: 8,
        }}>
        {label}
      </Text>
      <ScrollView
        ref={hScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={e => {
          hOffsetRef.current = e.nativeEvent.contentOffset.x
        }}
        contentContainerStyle={{paddingBottom: 4, paddingRight: 8}}>
        {rounds.map((round, roundIdx) => {
          const roundMatches = [...(byRound.get(round) ?? [])].sort(
            (a, b) => a.position - b.position,
          )
          const step = r1Step * Math.pow(2, roundIdx)
          const colWidth =
            COL_WIDTH + (roundIdx < rounds.length - 1 ? COL_GAP : 0)

          return (
            <View key={round} style={{width: colWidth}}>
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: '700',
                  opacity: 0.4,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                  width: COL_WIDTH,
                }}>
                Round {round}
              </Text>
              <View
                style={{
                  height: treeHeight,
                  width: COL_WIDTH,
                  position: 'relative',
                }}>
                {roundMatches.map((m, i) => {
                  const top = i * step + (step - cardH) / 2
                  const showOut = roundIdx < rounds.length - 1
                  const showIn = roundIdx > 0
                  const vHalf = step / 4

                  return (
                    <View
                      key={m.match_id || `${round}-${m.position}`}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top,
                        width: COL_WIDTH,
                      }}>
                      {showIn ? (
                        <>
                          <View
                            pointerEvents="none"
                            style={{
                              position: 'absolute',
                              left: -CONNECTOR_W,
                              top: cardH / 2 - vHalf,
                              width: 1,
                              height: vHalf * 2,
                              backgroundColor: connectorColor,
                            }}
                          />
                          <View
                            pointerEvents="none"
                            style={{
                              position: 'absolute',
                              left: -CONNECTOR_W,
                              top: cardH / 2 - 0.5,
                              width: CONNECTOR_W,
                              height: 1,
                              backgroundColor: connectorColor,
                            }}
                          />
                        </>
                      ) : null}
                      <MatchBox
                        match={m}
                        onPress={onMatchPress}
                        disabled={openingId === m.match_id}
                        isDark={isDark}
                        editableRound1={editableRound1}
                      />
                      {showOut ? (
                        <View
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            left: COL_WIDTH,
                            top: cardH / 2 - 0.5,
                            width: COL_GAP - CONNECTOR_W,
                            height: 1,
                            backgroundColor: connectorColor,
                          }}
                        />
                      ) : null}
                    </View>
                  )
                })}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

/**
 * Round-column bracket tree. Double-elim shows winners / losers / grand final.
 */
export default function BracketTree({
  stages,
  onMatchPress,
  openingId,
  editableRound1,
  onSwapRound1Slots,
  onClearRound1Slot,
  selectedUnplacedEntryId,
  onAssignRound1Slot,
  tablesAvailable,
  onCycleMatchTable,
  verticalScrollRef,
  verticalScrollOffsetRef,
}: Props) {
  const isDark = useColorScheme() === 'dark'
  const slotsRef = React.useRef<Map<string, SlotEntry>>(new Map())
  const hScrollsRef = React.useRef<Map<string, HScrollEntry>>(new Map())
  const [selected, setSelected] = React.useState<BracketSlotRef | null>(null)
  const [hoverKey, setHoverKey] = React.useState<string | null>(null)
  const [draggingKey, setDraggingKey] = React.useState<string | null>(null)
  const [overlay, setOverlay] = React.useState<DragOverlay | null>(null)
  const dragFrom = React.useRef<BracketSlotRef | null>(null)
  const swapRef = React.useRef(onSwapRound1Slots)
  swapRef.current = onSwapRound1Slots
  const selectedRef = React.useRef(selected)
  selectedRef.current = selected
  const lastPointer = React.useRef({x: 0, y: 0})
  const rafRef = React.useRef<number | null>(null)
  const verticalScrollRefStable = React.useRef(verticalScrollRef)
  verticalScrollRefStable.current = verticalScrollRef
  const verticalOffsetStable = React.useRef(verticalScrollOffsetRef)
  verticalOffsetStable.current = verticalScrollOffsetRef

  const findSlotAt = React.useCallback(async (pageX: number, pageY: number) => {
    const entries = [...slotsRef.current.values()]
    const measured = await Promise.all(
      entries.map(async entry => {
        const box = await measureView(entry.viewRef)
        return box ? {entry, box} : null
      }),
    )
    let best: {entry: SlotEntry; area: number} | null = null
    for (const item of measured) {
      if (!item) continue
      const {entry, box} = item
      if (
        pageX >= box.x &&
        pageX <= box.x + box.w &&
        pageY >= box.y &&
        pageY <= box.y + box.h
      ) {
        const area = box.w * box.h
        if (!best || area < best.area) best = {entry, area}
      }
    }
    return best?.entry ?? null
  }, [])

  const applyAutoScroll = React.useCallback((pageX: number, pageY: number) => {
    const {width, height} = Dimensions.get('window')
    const edgeSpeed = (pos: number, size: number) => {
      if (pos < EDGE_PX) {
        return -MAX_SCROLL_SPEED * ((EDGE_PX - pos) / EDGE_PX)
      }
      if (pos > size - EDGE_PX) {
        return MAX_SCROLL_SPEED * ((pos - (size - EDGE_PX)) / EDGE_PX)
      }
      return 0
    }
    const dy = edgeSpeed(pageY, height)
    const dx = edgeSpeed(pageX, width)

    if (dy !== 0) {
      const vRef = verticalScrollRefStable.current?.current
      const offsetRef = verticalOffsetStable.current
      if (vRef && offsetRef) {
        const nextY = Math.max(0, offsetRef.current + dy)
        offsetRef.current = nextY
        vRef.scrollTo({y: nextY, animated: false})
      }
    }

    if (dx !== 0) {
      for (const entry of hScrollsRef.current.values()) {
        const nextX = Math.max(0, entry.offsetRef.current + dx)
        entry.offsetRef.current = nextX
        entry.ref.current?.scrollTo({x: nextX, animated: false})
      }
    }
  }, [])

  const stopAutoScrollLoop = React.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const startAutoScrollLoop = React.useCallback(() => {
    stopAutoScrollLoop()
    const tick = () => {
      if (!dragFrom.current) {
        rafRef.current = null
        return
      }
      const {x, y} = lastPointer.current
      applyAutoScroll(x, y)
      setOverlay(prev =>
        prev ? {...prev, x: x - OVERLAY_W / 2, y: y - OVERLAY_H / 2} : prev,
      )
      void findSlotAt(x, y).then(hit => {
        const from = dragFrom.current
        if (
          hit &&
          from &&
          !(hit.ref.temp_id === from.temp_id && hit.ref.slot === from.slot)
        ) {
          setHoverKey(hit.key)
        } else {
          setHoverKey(null)
        }
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [applyAutoScroll, findSlotAt, stopAutoScrollLoop])

  React.useEffect(() => () => stopAutoScrollLoop(), [stopAutoScrollLoop])

  const actions = React.useMemo(
    () => ({
      registerSlot: (entry: SlotEntry) => {
        slotsRef.current.set(entry.key, entry)
      },
      unregisterSlot: (key: string) => {
        slotsRef.current.delete(key)
      },
      registerHScroll: (entry: HScrollEntry) => {
        hScrollsRef.current.set(entry.id, entry)
      },
      unregisterHScroll: (id: string) => {
        hScrollsRef.current.delete(id)
      },
      beginDrag: (ref: BracketSlotRef, pageX: number, pageY: number) => {
        dragFrom.current = ref
        lastPointer.current = {x: pageX, y: pageY}
        const key = slotKey(ref)
        const entry = slotsRef.current.get(key)
        setSelected(ref)
        setDraggingKey(key)
        setHoverKey(null)
        setOverlay({
          label: entry?.label ?? 'Player',
          x: pageX - OVERLAY_W / 2,
          y: pageY - OVERLAY_H / 2,
        })
        startAutoScrollLoop()
      },
      moveDrag: (pageX: number, pageY: number) => {
        lastPointer.current = {x: pageX, y: pageY}
        setOverlay(prev =>
          prev
            ? {
                ...prev,
                x: pageX - OVERLAY_W / 2,
                y: pageY - OVERLAY_H / 2,
              }
            : prev,
        )
        void findSlotAt(pageX, pageY).then(hit => {
          const from = dragFrom.current
          if (
            hit &&
            from &&
            !(hit.ref.temp_id === from.temp_id && hit.ref.slot === from.slot)
          ) {
            setHoverKey(hit.key)
          } else {
            setHoverKey(null)
          }
        })
      },
      endDrag: (pageX: number, pageY: number) => {
        stopAutoScrollLoop()
        const from = dragFrom.current
        setOverlay(null)
        setDraggingKey(null)
        void findSlotAt(pageX, pageY).then(hit => {
          setHoverKey(null)
          dragFrom.current = null
          if (
            from &&
            hit &&
            !(hit.ref.temp_id === from.temp_id && hit.ref.slot === from.slot)
          ) {
            swapRef.current?.(from, hit.ref)
            setSelected(null)
          }
        })
      },
      toggleSelect: (ref: BracketSlotRef) => {
        const cur = selectedRef.current
        if (sameSlot(cur, ref)) {
          setSelected(null)
          return
        }
        if (cur) {
          swapRef.current?.(cur, ref)
          setSelected(null)
          return
        }
        setSelected(ref)
      },
    }),
    [findSlotAt, startAutoScrollLoop, stopAutoScrollLoop],
  )

  const dragCtx = React.useMemo<DragCtx>(
    () => ({
      ...actions,
      selected,
      draggingKey,
      hoverKey,
    }),
    [actions, selected, draggingKey, hoverKey],
  )

  if (!stages?.length) return null

  const tree = (
    <View>
      {editableRound1 ? (
        <Text
          style={{
            marginTop: 8,
            fontSize: 12,
            opacity: 0.65,
          }}>
          Round 1: long-press to drag-swap, × to clear (moves to Unplaced).
          Select an unplaced player then tap an empty slot to place them.
          {tablesAvailable
            ? ' Tap a table badge to cycle table numbers.'
            : ''}{' '}
          Hold near the screen edge to auto-scroll.
        </Text>
      ) : null}
      {stages.map(stage => {
        const winners = stage.matches.filter(m => m.bracket_side === 'winners')
        const losers = stage.matches.filter(m => m.bracket_side === 'losers')
        const grand = stage.matches.filter(
          m => m.bracket_side === 'grand_final',
        )
        const other = stage.matches.filter(
          m =>
            m.bracket_side !== 'winners' &&
            m.bracket_side !== 'losers' &&
            m.bracket_side !== 'grand_final',
        )
        const hasDe = losers.length > 0 || grand.length > 0

        return (
          <View key={stage.stage_key} style={{marginTop: 24}}>
            <Text style={{fontSize: 17, fontWeight: '700', marginBottom: 10}}>
              {stage.label}
            </Text>
            {hasDe ? (
              <View>
                <SideTree
                  label="Winners"
                  matches={winners.length ? winners : other}
                  onMatchPress={onMatchPress}
                  openingId={openingId}
                  isDark={isDark}
                  editableRound1={editableRound1}
                />
                {losers.length > 0 ? (
                  <SideTree
                    label="Losers"
                    matches={losers}
                    onMatchPress={onMatchPress}
                    openingId={openingId}
                    isDark={isDark}
                    editableRound1={editableRound1}
                  />
                ) : null}
                {grand.length > 0 ? (
                  <SideTree
                    label="Grand final"
                    matches={grand}
                    onMatchPress={onMatchPress}
                    openingId={openingId}
                    isDark={isDark}
                    editableRound1={editableRound1}
                  />
                ) : null}
              </View>
            ) : (
              <SideTree
                label="Bracket"
                matches={stage.matches}
                onMatchPress={onMatchPress}
                openingId={openingId}
                isDark={isDark}
                editableRound1={editableRound1}
              />
            )}
          </View>
        )
      })}
    </View>
  )

  if (!editableRound1) return tree

  const editCtx: EditCtx = {
    onClearRound1Slot,
    selectedUnplacedEntryId,
    onAssignRound1Slot,
    tablesAvailable,
    onCycleMatchTable,
  }

  const chip =
    overlay != null ? (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View
          style={{
            position: 'absolute',
            left: overlay.x,
            top: overlay.y,
            width: OVERLAY_W,
            height: OVERLAY_H,
            borderRadius: 8,
            paddingHorizontal: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: isDark ? '#1e293b' : '#fff',
            borderWidth: 1,
            borderColor: isDark ? '#60a5fa' : '#2563eb',
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: {width: 0, height: 6},
            elevation: 30,
          }}>
          <Text style={{fontSize: 12, opacity: 0.7, fontWeight: '800'}}>
            ☰
          </Text>
          <Text
            style={{flex: 1, fontWeight: '700', fontSize: 13}}
            numberOfLines={1}>
            {overlay.label}
          </Text>
        </View>
      </View>
    ) : null

  return (
    <EditContext.Provider value={editCtx}>
      <DragContext.Provider value={dragCtx}>
        {tree}
        {overlay ? (
          Platform.OS === 'ios' ? (
            <FullWindowOverlay>{chip}</FullWindowOverlay>
          ) : (
            <Modal
              transparent
              visible
              animationType="none"
              statusBarTranslucent
              onRequestClose={() => {}}>
              {chip}
            </Modal>
          )
        ) : null}
      </DragContext.Provider>
    </EditContext.Provider>
  )
}
