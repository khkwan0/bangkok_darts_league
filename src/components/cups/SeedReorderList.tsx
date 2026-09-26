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

export type SeedListEntry = {
  id: number
  seed: number
  participant_type: string
  team_id?: number | null
  player_id?: number | null
  label?: string | null
  display_name?: string | null
}

type Props = {
  entries: SeedListEntry[]
  editable: boolean
  busy?: boolean
  /** Called with full ordered ids after a swap (optimistic parent update). */
  onReorder: (orderedIds: number[]) => void
  onRemove?: (entryId: number) => void
  onDraggingChange?: (dragging: boolean) => void
  verticalScrollRef?: React.RefObject<ScrollView | null>
  verticalScrollOffsetRef?: React.MutableRefObject<number>
}

const OVERLAY_W = 220
const OVERLAY_H = 44
const EDGE_PX = 64
const MAX_SCROLL_SPEED = 18
const ROW_GAP = 10

function rowLabel(e: SeedListEntry) {
  return e.display_name || e.label || e.participant_type
}

function sortEntries(entries: SeedListEntry[]) {
  return [...entries].sort((a, b) => a.seed - b.seed || a.id - b.id)
}

function withDenseSeeds(list: SeedListEntry[]): SeedListEntry[] {
  return list.map((e, i) => ({...e, seed: i + 1}))
}

function measureView(
  ref: React.RefObject<View | null>,
): Promise<{x: number; y: number; w: number; h: number} | null> {
  return new Promise(resolve => {
    const node = ref.current
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

type RowSlot = {
  id: number
  label: string
  viewRef: React.RefObject<View | null>
}

type DragOverlay = {label: string; x: number; y: number}

export default function SeedReorderList({
  entries,
  editable,
  busy,
  onReorder,
  onRemove,
  onDraggingChange,
  verticalScrollRef,
  verticalScrollOffsetRef,
}: Props) {
  const isDark = useColorScheme() === 'dark'
  const sortedProp = React.useMemo(() => sortEntries(entries), [entries])
  const [local, setLocal] = React.useState(sortedProp)
  const draggingIdRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (draggingIdRef.current == null) {
      setLocal(sortedProp)
    }
  }, [sortedProp])

  const slotsRef = React.useRef<Map<number, RowSlot>>(new Map())
  const [selectedId, setSelectedId] = React.useState<number | null>(null)
  const [hoverId, setHoverId] = React.useState<number | null>(null)
  const [draggingId, setDraggingId] = React.useState<number | null>(null)
  const [overlay, setOverlay] = React.useState<DragOverlay | null>(null)
  const lastPointer = React.useRef({x: 0, y: 0})
  const rafRef = React.useRef<number | null>(null)
  const localRef = React.useRef(local)
  localRef.current = local
  const reorderRef = React.useRef(onReorder)
  reorderRef.current = onReorder
  const onDraggingChangeRef = React.useRef(onDraggingChange)
  onDraggingChangeRef.current = onDraggingChange
  const verticalScrollRefStable = React.useRef(verticalScrollRef)
  verticalScrollRefStable.current = verticalScrollRef
  const verticalOffsetStable = React.useRef(verticalScrollOffsetRef)
  verticalOffsetStable.current = verticalScrollOffsetRef

  const applySwap = React.useCallback((fromId: number, toId: number) => {
    if (fromId === toId) return
    const list = [...localRef.current]
    const from = list.findIndex(e => e.id === fromId)
    const to = list.findIndex(e => e.id === toId)
    if (from < 0 || to < 0) return
    ;[list[from], list[to]] = [list[to], list[from]]
    const next = withDenseSeeds(list)
    setLocal(next)
    reorderRef.current(next.map(e => e.id))
  }, [])

  const findRowAt = React.useCallback(async (pageX: number, pageY: number) => {
    const entries = [...slotsRef.current.values()]
    const measured = await Promise.all(
      entries.map(async entry => {
        const box = await measureView(entry.viewRef)
        return box ? {entry, box} : null
      }),
    )
    let best: {entry: RowSlot; area: number} | null = null
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

  const applyAutoScroll = React.useCallback((pageY: number) => {
    const {height} = Dimensions.get('window')
    let dy = 0
    if (pageY < EDGE_PX) {
      dy = -MAX_SCROLL_SPEED * ((EDGE_PX - pageY) / EDGE_PX)
    } else if (pageY > height - EDGE_PX) {
      dy = MAX_SCROLL_SPEED * ((pageY - (height - EDGE_PX)) / EDGE_PX)
    }
    if (dy === 0) return
    const vRef = verticalScrollRefStable.current?.current
    const offsetRef = verticalOffsetStable.current
    if (vRef && offsetRef) {
      const nextY = Math.max(0, offsetRef.current + dy)
      offsetRef.current = nextY
      vRef.scrollTo({y: nextY, animated: false})
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
      if (draggingIdRef.current == null) {
        rafRef.current = null
        return
      }
      const {x, y} = lastPointer.current
      applyAutoScroll(y)
      setOverlay(prev =>
        prev ? {...prev, x: x - OVERLAY_W / 2, y: y - OVERLAY_H / 2} : prev,
      )
      void findRowAt(x, y).then(hit => {
        const from = draggingIdRef.current
        if (hit && from && hit.id !== from) setHoverId(hit.id)
        else setHoverId(null)
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [applyAutoScroll, findRowAt, stopAutoScrollLoop])

  React.useEffect(() => () => stopAutoScrollLoop(), [stopAutoScrollLoop])

  const beginDrag = React.useCallback(
    (id: number, pageX: number, pageY: number) => {
      draggingIdRef.current = id
      lastPointer.current = {x: pageX, y: pageY}
      const slot = slotsRef.current.get(id)
      setSelectedId(id)
      setDraggingId(id)
      setHoverId(null)
      setOverlay({
        label: slot?.label ?? 'Entry',
        x: pageX - OVERLAY_W / 2,
        y: pageY - OVERLAY_H / 2,
      })
      onDraggingChangeRef.current?.(true)
      startAutoScrollLoop()
    },
    [startAutoScrollLoop],
  )

  const moveDrag = React.useCallback((pageX: number, pageY: number) => {
    lastPointer.current = {x: pageX, y: pageY}
    setOverlay(prev =>
      prev
        ? {...prev, x: pageX - OVERLAY_W / 2, y: pageY - OVERLAY_H / 2}
        : prev,
    )
    void findRowAt(pageX, pageY).then(hit => {
      const from = draggingIdRef.current
      if (hit && from && hit.id !== from) setHoverId(hit.id)
      else setHoverId(null)
    })
  }, [findRowAt])

  const endDrag = React.useCallback(
    (pageX: number, pageY: number) => {
      stopAutoScrollLoop()
      const from = draggingIdRef.current
      setOverlay(null)
      setDraggingId(null)
      onDraggingChangeRef.current?.(false)
      void findRowAt(pageX, pageY).then(hit => {
        setHoverId(null)
        draggingIdRef.current = null
        if (from && hit && hit.id !== from) {
          applySwap(from, hit.id)
          setSelectedId(null)
        }
      })
    },
    [applySwap, findRowAt, stopAutoScrollLoop],
  )

  const toggleSelect = React.useCallback(
    (id: number) => {
      if (selectedId === id) {
        setSelectedId(null)
        return
      }
      if (selectedId != null && selectedId !== id) {
        applySwap(selectedId, id)
        setSelectedId(null)
        return
      }
      setSelectedId(id)
    },
    [applySwap, selectedId],
  )

  const registerRow = React.useCallback((slot: RowSlot) => {
    slotsRef.current.set(slot.id, slot)
  }, [])
  const unregisterRow = React.useCallback((id: number) => {
    slotsRef.current.delete(id)
  }, [])

  if (local.length === 0) return null

  const list = (
    <View style={{marginTop: 8}}>
      {editable ? (
        <Text style={{fontSize: 12, opacity: 0.55, marginBottom: 8}}>
          Long-press to drag-swap seeds (1 at the top), or tap two rows to swap.
          Hold near the screen edge to auto-scroll.
        </Text>
      ) : null}
      {local.map(e => (
        <SeedRow
          key={e.id}
          entry={e}
          editable={editable}
          busy={busy}
          isDark={isDark}
          selected={selectedId === e.id}
          hovered={hoverId === e.id}
          isSource={draggingId === e.id}
          onRemove={onRemove}
          registerRow={registerRow}
          unregisterRow={unregisterRow}
          beginDrag={beginDrag}
          moveDrag={moveDrag}
          endDrag={endDrag}
          toggleSelect={toggleSelect}
        />
      ))}
    </View>
  )

  if (!editable) return list

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
    <>
      {list}
      {Platform.OS === 'ios' ? (
        <FullWindowOverlay>{chip}</FullWindowOverlay>
      ) : (
        <Modal visible={overlay != null} transparent animationType="none">
          {chip}
        </Modal>
      )}
    </>
  )
}

function SeedRow({
  entry,
  editable,
  busy,
  isDark,
  selected,
  hovered,
  isSource,
  onRemove,
  registerRow,
  unregisterRow,
  beginDrag,
  moveDrag,
  endDrag,
  toggleSelect,
}: {
  entry: SeedListEntry
  editable: boolean
  busy?: boolean
  isDark: boolean
  selected: boolean
  hovered: boolean
  isSource: boolean
  onRemove?: (entryId: number) => void
  registerRow: (slot: RowSlot) => void
  unregisterRow: (id: number) => void
  beginDrag: (id: number, x: number, y: number) => void
  moveDrag: (x: number, y: number) => void
  endDrag: (x: number, y: number) => void
  toggleSelect: (id: number) => void
}) {
  const viewRef = React.useRef<View>(null)
  const label = `#${entry.seed} ${rowLabel(entry)}`
  const activeSV = useSharedValue(0)

  React.useEffect(() => {
    if (!editable) return
    registerRow({id: entry.id, label, viewRef})
    return () => unregisterRow(entry.id)
  }, [editable, entry.id, label, registerRow, unregisterRow])

  const beginDragJS = React.useCallback(
    (id: number, x: number, y: number) => beginDrag(id, x, y),
    [beginDrag],
  )
  const moveDragJS = React.useCallback(
    (x: number, y: number) => moveDrag(x, y),
    [moveDrag],
  )
  const endDragJS = React.useCallback(
    (x: number, y: number) => endDrag(x, y),
    [endDrag],
  )

  const pan = React.useMemo(() => {
    if (!editable) return Gesture.Pan().enabled(false)
    const id = entry.id
    return Gesture.Pan()
      .enabled(!busy)
      .activateAfterLongPress(160)
      .onStart(e => {
        activeSV.value = 1
        runOnJS(beginDragJS)(id, e.absoluteX, e.absoluteY)
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
  }, [editable, busy, entry.id, activeSV, beginDragJS, moveDragJS, endDragJS])

  const placeholderStyle = useAnimatedStyle(() => ({
    opacity: activeSV.value ? 0.35 : 1,
  }))

  const borderColor = hovered
    ? isDark
      ? '#60a5fa'
      : '#2563eb'
    : selected
      ? isDark
        ? '#93c5fd'
        : '#3b82f6'
      : isDark
        ? '#333'
        : '#e2e8f0'

  const body = (
    <Animated.View
      ref={viewRef}
      style={[
        {
          marginBottom: ROW_GAP,
          borderRadius: 10,
          borderWidth: selected || hovered ? 2 : 1,
          borderColor,
          backgroundColor: isDark
            ? isSource
              ? '#0f172a'
              : '#1f1f1f'
            : isSource
              ? '#f1f5f9'
              : '#fff',
          padding: 12,
        },
        placeholderStyle,
      ]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}>
        {editable ? (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 10,
              borderRadius: 6,
              backgroundColor: isDark ? '#334155' : '#e2e8f0',
            }}>
            <Text style={{fontSize: 14, opacity: 0.7, fontWeight: '800'}}>
              ☰
            </Text>
          </View>
        ) : null}
        <Pressable
          disabled={!editable || busy}
          onPress={() => editable && toggleSelect(entry.id)}
          style={{flex: 1, paddingRight: 8}}>
          <Text style={{fontWeight: '700'}}>{label}</Text>
          <Text style={{marginTop: 2, fontSize: 12, opacity: 0.55}}>
            {entry.participant_type}
            {entry.team_id ? ` · team ${entry.team_id}` : ''}
            {entry.player_id ? ` · player ${entry.player_id}` : ''}
          </Text>
        </Pressable>
        {editable && onRemove ? (
          <Pressable onPress={() => onRemove(entry.id)} disabled={busy}>
            <Text style={{color: '#dc2626', fontWeight: '600'}}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  )

  if (!editable) return body

  return <GestureDetector gesture={pan}>{body}</GestureDetector>
}
