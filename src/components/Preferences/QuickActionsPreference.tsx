import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import {Gesture, GestureDetector} from 'react-native-gesture-handler'
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import {scheduleOnRN} from 'react-native-worklets'
import {FullWindowOverlay} from 'react-native-screens'
import {Ionicons} from '@expo/vector-icons'
import {useTranslation} from 'react-i18next'
import {useTheme} from 'expo-router/react-navigation'
import {useLeagueContext} from '@/context/LeagueContext'
import {useAccount} from '@/hooks/useAccount'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {
  DEFAULT_FAB_QUICK_ACTIONS,
  filterPreferenceQuickActions,
  getPreferenceQuickActionIds,
  QUICK_ACTION_DEFS,
  resolveFabQuickActions,
  type QuickActionId,
} from '@/lib/quickActions'

type CrudButtonProps = {
  onPress: () => void
  disabled?: boolean
  label: string
  labelColor: string
  background: string
  pressedBackground: string
  style?: StyleProp<ViewStyle>
}

function CrudButton({
  onPress,
  disabled,
  label,
  labelColor,
  background,
  pressedBackground,
  style,
}: CrudButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        {
          minWidth: 52,
          minHeight: 52,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.35 : 1,
          backgroundColor:
            pressed && !disabled ? pressedBackground : background,
          transform: [{scale: pressed && !disabled ? 0.96 : 1}],
        },
        style,
      ]}>
      {({pressed}) => (
        <Text
          style={{
            color: labelColor,
            fontSize: 20,
            lineHeight: 24,
            fontWeight: pressed && !disabled ? '700' : '600',
          }}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

const OVERLAY_W = 240
const OVERLAY_H = 48
const HANDLE_BG = 'rgba(37, 99, 235, 0.12)'
const HIDE_BG = 'rgba(220, 38, 38, 0.12)'
const HIDE_PRESSED = 'rgba(220, 38, 38, 0.28)'
const ADD_HIGHLIGHT = 'rgba(37, 99, 235, 0.15)'
/** Auto-scroll band inside the list viewport (not the device screen). */
const EDGE_PX = 72
const MAX_SCROLL_SPEED = 16

type RowLayout = {id: QuickActionId; y: number; h: number}

function moveId(
  list: QuickActionId[],
  fromId: QuickActionId,
  toId: QuickActionId,
): QuickActionId[] {
  const from = list.indexOf(fromId)
  const to = list.indexOf(toId)
  if (from < 0 || to < 0 || from === to) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

/** Sync hit-test against cached content layouts — no measureInWindow. */
function findDropTargetSync(
  layouts: RowLayout[],
  contentY: number,
  fromId: QuickActionId | null,
): QuickActionId | null {
  let direct: QuickActionId | null = null
  let nearestId: QuickActionId | null = null
  let nearestDist = Infinity
  for (const row of layouts) {
    if (fromId && row.id === fromId) continue
    const mid = row.y + row.h / 2
    const dist = Math.abs(contentY - mid)
    if (dist < nearestDist) {
      nearestDist = dist
      nearestId = row.id
    }
    if (contentY >= row.y && contentY <= row.y + row.h) {
      direct = row.id
    }
  }
  if (direct) return direct
  if (nearestId != null && nearestDist < 56) return nearestId
  return null
}

type ActionRowProps = {
  id: QuickActionId
  label: string
  colors: {text: string; card: string; border?: string}
  isSource: boolean
  isHovered: boolean
  onHide: () => void
  onRowLayout: (id: QuickActionId, y: number, h: number) => void
  overlayX: SharedValue<number>
  overlayY: SharedValue<number>
  beginDrag: (id: QuickActionId, x: number, y: number) => void
  moveDrag: (x: number, y: number) => void
  endDrag: (x: number, y: number) => void
  hideLabel: string
}

function ActionRow({
  id,
  label,
  colors,
  isSource,
  isHovered,
  onHide,
  onRowLayout,
  overlayX,
  overlayY,
  beginDrag,
  moveDrag,
  endDrag,
  hideLabel,
}: ActionRowProps) {
  const activeSV = useSharedValue(0)

  const pan = useMemo(() => {
    return Gesture.Pan()
      .activateAfterLongPress(140)
      .onStart(e => {
        activeSV.set(1)
        overlayX.set(e.absoluteX - OVERLAY_W / 2)
        overlayY.set(e.absoluteY - OVERLAY_H / 2)
        scheduleOnRN(beginDrag, id, e.absoluteX, e.absoluteY)
      })
      .onUpdate(e => {
        // Keep the chip on the UI thread — no React re-render per frame.
        overlayX.set(e.absoluteX - OVERLAY_W / 2)
        overlayY.set(e.absoluteY - OVERLAY_H / 2)
        scheduleOnRN(moveDrag, e.absoluteX, e.absoluteY)
      })
      .onFinalize(e => {
        activeSV.set(0)
        scheduleOnRN(endDrag, e.absoluteX, e.absoluteY)
      })
    // activeSV is a stable shared value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beginDrag, endDrag, id, moveDrag, overlayX, overlayY])

  const rowStyle = useAnimatedStyle(() => ({
    opacity: activeSV.get() ? 0.35 : 1,
  }))

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={(e: LayoutChangeEvent) => {
          const {y, height} = e.nativeEvent.layout
          onRowLayout(id, y, height)
        }}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 10,
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 12,
            backgroundColor: colors.card,
            borderWidth: isHovered ? 2 : 0,
            borderColor: isHovered ? '#2563eb' : 'transparent',
          },
          rowStyle,
        ]}>
        <View
          accessibilityRole="button"
          accessibilityLabel="Reorder"
          style={{
            minWidth: 44,
            minHeight: 44,
            marginRight: 4,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: HANDLE_BG,
            opacity: isSource ? 0.5 : 1,
          }}>
          <Ionicons name="reorder-three" size={28} color={colors.text} />
        </View>
        <Text
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 17,
            lineHeight: 22,
            fontWeight: '600',
            paddingRight: 8,
          }}>
          {label}
        </Text>
        <CrudButton
          label={hideLabel}
          labelColor="#dc2626"
          background={HIDE_BG}
          pressedBackground={HIDE_PRESSED}
          onPress={onHide}
          style={{minWidth: 72}}
        />
      </Animated.View>
    </GestureDetector>
  )
}

function DragChip({
  label,
  colors,
  overlayX,
  overlayY,
}: {
  label: string
  colors: {text: string; card: string}
  overlayX: SharedValue<number>
  overlayY: SharedValue<number>
}) {
  const style = useAnimatedStyle(() => ({
    transform: [
      {translateX: overlayX.get()},
      {translateY: overlayY.get()},
    ],
  }))

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            width: OVERLAY_W,
            height: OVERLAY_H,
            borderRadius: 12,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: '#2563eb',
            shadowColor: '#000',
            shadowOpacity: 0.28,
            shadowRadius: 10,
            shadowOffset: {width: 0, height: 6},
            elevation: 30,
          },
          style,
        ]}>
        <Ionicons name="reorder-three" size={22} color={colors.text} />
        <Text
          style={{
            flex: 1,
            fontWeight: '700',
            fontSize: 15,
            color: colors.text,
          }}
          numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </View>
  )
}

/**
 * Show/hide + reorder FAB quick-action items; persists via user preferences API.
 */
export default function QuickActionsPreference() {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const {state} = useLeagueContext()
  const account = useAccount()
  const isAdmin = isLeagueAdmin(state.user)
  const catalogIds = useMemo(
    () => getPreferenceQuickActionIds(isAdmin),
    [isAdmin],
  )

  const storedFab = state.user?.preferences?.fab_quick_actions
  const storedKey = `${JSON.stringify(storedFab ?? null)}:${isAdmin ? 1 : 0}`
  const resolved = filterPreferenceQuickActions(
    resolveFabQuickActions(storedFab),
    isAdmin,
  )
  const [actions, setActions] = useState<QuickActionId[]>(resolved)
  const [syncedKey, setSyncedKey] = useState(storedKey)
  if (storedKey !== syncedKey) {
    setSyncedKey(storedKey)
    setActions(resolved)
  }

  const selected = new Set(actions)
  const scrollRef = useRef<ScrollView>(null)
  const viewportHostRef = useRef<View>(null)
  const scrollOffsetRef = useRef(0)
  const rowLayoutMap = useRef(new Map<QuickActionId, {y: number; h: number}>())
  const layoutsRef = useRef<RowLayout[]>([])
  const viewportRef = useRef({top: 0, bottom: 0, height: 0})

  const draggingIdRef = useRef<QuickActionId | null>(null)
  const hoverIdRef = useRef<QuickActionId | null>(null)
  const lastPointer = useRef({x: 0, y: 0})
  const rafRef = useRef<number | null>(null)
  const actionsRef = useRef(actions)
  useEffect(() => {
    actionsRef.current = actions
  }, [actions])

  const overlayX = useSharedValue(0)
  const overlayY = useSharedValue(0)
  const [draggingId, setDraggingId] = useState<QuickActionId | null>(null)
  const [hoverId, setHoverId] = useState<QuickActionId | null>(null)
  const [overlayLabel, setOverlayLabel] = useState<string | null>(null)

  const rebuildLayouts = useCallback(() => {
    const next: RowLayout[] = []
    for (const id of actionsRef.current) {
      const box = rowLayoutMap.current.get(id)
      if (box) next.push({id, y: box.y, h: box.h})
    }
    layoutsRef.current = next
  }, [])

  const onRowLayout = useCallback(
    (id: QuickActionId, y: number, h: number) => {
      rowLayoutMap.current.set(id, {y, h})
      rebuildLayouts()
    },
    [rebuildLayouts],
  )

  const measureViewport = useCallback(() => {
    viewportHostRef.current?.measureInWindow((_x, y, _w, h) => {
      if (h > 0) {
        viewportRef.current = {top: y, bottom: y + h, height: h}
      }
    })
  }, [])

  const pageYToContentY = useCallback((pageY: number) => {
    // Map finger position → ScrollView content coordinates using the list
    // viewport (not the device screen) and the current scroll offset.
    return scrollOffsetRef.current + (pageY - viewportRef.current.top)
  }, [])

  const setHoverIfChanged = useCallback((target: QuickActionId | null) => {
    if (!target) return
    if (hoverIdRef.current === target) return
    hoverIdRef.current = target
    setHoverId(target)
  }, [])

  const persist = useCallback(
    async (next: QuickActionId[] | null) => {
      if (next != null) {
        next = filterPreferenceQuickActions(next, isAdmin)
        if (next.length === 0) next = null
      }
      if (next == null) {
        setActions(
          filterPreferenceQuickActions(
            [...DEFAULT_FAB_QUICK_ACTIONS],
            isAdmin,
          ),
        )
      } else {
        setActions(next)
      }
      await account.SetFabQuickActions(next)
    },
    [account, isAdmin],
  )

  function toggle(id: QuickActionId) {
    if (!catalogIds.includes(id)) return
    if (selected.has(id)) {
      const next = actions.filter(a => a !== id)
      if (next.length === 0) return
      void persist(next)
      return
    }
    void persist([...actions, id])
  }

  const applyAutoScroll = useCallback((pageY: number) => {
    const {top, bottom, height} = viewportRef.current
    if (height <= 0) return
    let dy = 0
    if (pageY < top + EDGE_PX) {
      const t = (top + EDGE_PX - pageY) / EDGE_PX
      dy = -MAX_SCROLL_SPEED * Math.min(1, Math.max(0, t))
    } else if (pageY > bottom - EDGE_PX) {
      const t = (pageY - (bottom - EDGE_PX)) / EDGE_PX
      dy = MAX_SCROLL_SPEED * Math.min(1, Math.max(0, t))
    }
    if (dy === 0) return
    const nextY = Math.max(0, scrollOffsetRef.current + dy)
    scrollOffsetRef.current = nextY
    scrollRef.current?.scrollTo({y: nextY, animated: false})
  }, [])

  const stopAutoScrollLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const startAutoScrollLoop = useCallback(() => {
    stopAutoScrollLoop()
    const tick = () => {
      if (draggingIdRef.current == null) {
        rafRef.current = null
        return
      }
      const {y} = lastPointer.current
      const {top, bottom} = viewportRef.current
      const nearEdge = y < top + EDGE_PX || y > bottom - EDGE_PX
      if (nearEdge) {
        applyAutoScroll(y)
        const contentY = pageYToContentY(y)
        const target = findDropTargetSync(
          layoutsRef.current,
          contentY,
          draggingIdRef.current,
        )
        setHoverIfChanged(target)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [applyAutoScroll, pageYToContentY, setHoverIfChanged, stopAutoScrollLoop])

  useEffect(() => () => stopAutoScrollLoop(), [stopAutoScrollLoop])

  const beginDrag = useCallback(
    (id: QuickActionId, pageX: number, pageY: number) => {
      draggingIdRef.current = id
      hoverIdRef.current = null
      lastPointer.current = {x: pageX, y: pageY}
      rebuildLayouts()
      measureViewport()
      const slotLabel = QUICK_ACTION_DEFS[id]
        ? t(QUICK_ACTION_DEFS[id].labelKey)
        : id
      setDraggingId(id)
      setHoverId(null)
      setOverlayLabel(slotLabel)
      startAutoScrollLoop()
    },
    [measureViewport, rebuildLayouts, startAutoScrollLoop, t],
  )

  const moveDrag = useCallback(
    (pageX: number, pageY: number) => {
      lastPointer.current = {x: pageX, y: pageY}
      const from = draggingIdRef.current
      if (!from) return
      const contentY = pageYToContentY(pageY)
      const target = findDropTargetSync(layoutsRef.current, contentY, from)
      setHoverIfChanged(target)
    },
    [pageYToContentY, setHoverIfChanged],
  )

  const endDrag = useCallback(
    (_pageX: number, pageY: number) => {
      stopAutoScrollLoop()
      const from = draggingIdRef.current
      const remembered = hoverIdRef.current
      setOverlayLabel(null)
      setDraggingId(null)
      setHoverId(null)
      hoverIdRef.current = null
      draggingIdRef.current = null
      if (!from) return

      const contentY = pageYToContentY(pageY)
      const measured = findDropTargetSync(layoutsRef.current, contentY, from)
      const to = remembered ?? measured
      if (!to || to === from) return
      const next = moveId(actionsRef.current, from, to)
      if (next === actionsRef.current) return
      void persist(next)
    },
    [pageYToContentY, persist, stopAutoScrollLoop],
  )

  const chip =
    overlayLabel != null ? (
      <DragChip
        label={overlayLabel}
        colors={colors}
        overlayX={overlayX}
        overlayY={overlayY}
      />
    ) : null

  return (
    <View
      ref={viewportHostRef}
      style={{flex: 1, backgroundColor: colors.background}}
      onLayout={measureViewport}>
      <ScrollView
        ref={scrollRef}
        style={{flex: 1}}
        contentContainerStyle={{padding: 16, paddingBottom: 40}}
        scrollEnabled={draggingId == null}
        onScroll={e => {
          scrollOffsetRef.current = e.nativeEvent.contentOffset.y
        }}
        scrollEventThrottle={16}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 6,
          }}>
          {t('fab_quick_actions_settings')}
        </Text>
        <Text
          style={{
            color: colors.text,
            opacity: 0.7,
            fontSize: 16,
            lineHeight: 22,
            marginBottom: 12,
          }}>
          {t('fab_quick_actions_settings_description')}
        </Text>
        <Text
          style={{
            color: colors.text,
            opacity: 0.5,
            fontSize: 13,
            marginBottom: 16,
          }}>
          Long-press the grip to drag and reorder.
        </Text>

        {actions.map(id => {
          const def = QUICK_ACTION_DEFS[id]
          const label = t(def.labelKey)
          return (
            <ActionRow
              key={id}
              id={id}
              label={label}
              colors={colors}
              isSource={draggingId === id}
              isHovered={hoverId === id}
              onHide={() => {
                const next = actions.filter(a => a !== id)
                if (next.length === 0) return
                void persist(next)
              }}
              onRowLayout={onRowLayout}
              overlayX={overlayX}
              overlayY={overlayY}
              beginDrag={beginDrag}
              moveDrag={moveDrag}
              endDrag={endDrag}
              hideLabel={t('hide')}
            />
          )
        })}

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 8,
            marginBottom: 32,
          }}>
          {catalogIds.filter(id => !selected.has(id)).map(id => {
            const def = QUICK_ACTION_DEFS[id]
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                onPress={() => toggle(id)}
                style={({pressed}) => ({
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: pressed
                    ? '#2563eb'
                    : colors.border || colors.text,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  justifyContent: 'center',
                  backgroundColor: pressed ? ADD_HIGHLIGHT : 'transparent',
                  transform: [{scale: pressed ? 0.97 : 1}],
                })}>
                {({pressed}) => (
                  <Text
                    style={{
                      color: pressed ? '#2563eb' : colors.text,
                      fontSize: 16,
                      lineHeight: 20,
                      fontWeight: pressed ? '600' : '500',
                    }}>
                    + {t(def.labelKey)}
                  </Text>
                )}
              </Pressable>
            )
          })}
        </View>

        <View style={{height: 24}} />

        <View className="w-full items-center px-2">
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Alert.alert(
                t('fab_quick_actions_reset_default'),
                t('fab_quick_actions_reset_confirm'),
                [
                  {text: t('cancel'), style: 'cancel'},
                  {
                    text: t('reset'),
                    style: 'destructive',
                    onPress: () => void persist(null),
                  },
                ],
              )
            }}
            className="w-11/12 items-center justify-center rounded-2xl bg-slate-600 px-7 py-4 active:bg-slate-700 dark:bg-slate-500 dark:active:bg-slate-600"
            style={({pressed}) => ({
              opacity: pressed ? 0.92 : 1,
              transform: [{scale: pressed ? 0.98 : 1}],
            })}>
            <Text className="text-center text-lg font-bold text-white">
              {t('fab_quick_actions_reset_default')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {Platform.OS === 'ios' ? (
        <FullWindowOverlay>{chip}</FullWindowOverlay>
      ) : (
        <Modal visible={overlayLabel != null} transparent animationType="none">
          {chip}
        </Modal>
      )}
    </View>
  )
}
