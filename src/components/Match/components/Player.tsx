import Row from '@/components/Row'
import {useLeagueContext} from '@/context/LeagueContext'
import {useMatchContext} from '@/context/MatchContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import type {ScoresheetStatsView} from '@/lib/scoresheetStatsView'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import {useRouter} from 'expo-router'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Alert, Pressable, Text, View} from 'react-native'
import {useScoresheetTheme} from './scoresheetTheme'

/** Ignore a second roster open from the same tap (the scoresheet card is also pressable). */
let childPressAt = 0
let choosePlayerNavAt = 0

export function noteScoresheetChildPress() {
  childPressAt = Date.now()
}

export function scoresheetChildHandledPress() {
  return Date.now() - childPressAt < 700
}

function claimChoosePlayerNav() {
  const now = Date.now()
  if (now - choosePlayerNavAt < 700) return false
  choosePlayerNavAt = now
  return true
}
import {
  isValidDartCheckout,
  MAX_DART_CHECKOUT,
} from '@/lib/dartCheckouts'
import StatStepper from './StatStepper'
import StatValueInput from './StatValueInput'

export type PlayerLayout = 'panel' | 'ledger' | 'chips'

interface PlayerProps {
  teamId: number | string
  side: 'home' | 'away' | string
  frameIndex: number
  frameNumber: number
  frameType?: string
  minPlayers?: number
  maxPlayers?: number
  noPlayers?: number
  playerIds: number[]
  trackStats?: boolean
  trackTons?: boolean
  trackHeavyTons?: boolean
  trackCloses?: boolean
  /** @deprecated prefer layout; kept for callers that pass statsView */
  statsView?: ScoresheetStatsView
  layout?: PlayerLayout
  refreshing?: boolean
  ink: string
  mark: string
  /** Focus layout: which slot is expanded for stats */
  focusedSlot?: number | null
  onFocusSlot?: (slot: number | null) => void
  /** When true, show the manual ton / 180 / close editors instead of the table. */
  manualStats?: boolean
  /**
   * Close games keep manual tallies on the per-leg rows, not beside names.
   */
  hideStats?: boolean
}

function PlayerSkeleton({ink}: {ink: string}) {
  return (
    <View
      style={{
        height: 18,
        width: 72,
        borderRadius: 6,
        backgroundColor: ink,
        opacity: 0.25,
      }}
    />
  )
}

function PlayerStatTable({
  slots,
  showTons,
  showHeavyTons,
  showCloses,
  ink,
  accent,
  pressedSlot,
  onPressSlot,
  onLongPressSlot,
  onPressIn,
  onPressOut,
}: {
  slots: Array<{
    slot: number
    nickname?: string
    filled: boolean
    tons: number
    heavyTons: number
    closes: number
  }>
  showTons: boolean
  showHeavyTons: boolean
  showCloses: boolean
  ink: string
  accent: string
  pressedSlot: number | null
  onPressSlot: (slot: number) => void
  onLongPressSlot: (slot: number) => void
  onPressIn: (slot: number) => void
  onPressOut: () => void
}) {
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const columns = [
    showTons ? {key: 'tons', label: t('stat_abbr_tons')} : null,
    showHeavyTons ? {key: 'heavy', label: t('stat_abbr_heavy')} : null,
    showCloses ? {key: 'closes', label: t('stat_abbr_closes')} : null,
  ].filter((col): col is {key: string; label: string} => col != null)
  return (
    <View style={{width: '100%', maxWidth: '100%', gap: 1}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
        <View style={{flex: 1}} />
        {columns.map(col => (
          <Text
            key={col.key}
            style={{
              width: 36,
              textAlign: 'center',
              color: theme.muted,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 0.3,
            }}>
            {col.label}
          </Text>
        ))}
      </View>
      {slots.map(row => {
        const pressed = pressedSlot === row.slot
        const values = {
          tons: row.tons,
          heavy: row.heavyTons,
          closes: row.closes,
        }
        return (
          <Pressable
            key={row.slot}
            onPress={() => onPressSlot(row.slot)}
            onLongPress={
              row.filled ? () => onLongPressSlot(row.slot) : undefined
            }
            onPressIn={() => {
              noteScoresheetChildPress()
              onPressIn(row.slot)
            }}
            onPressOut={onPressOut}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              minHeight: 28,
              paddingVertical: 2,
            }}>
            <View style={{flex: 1, minWidth: 0, justifyContent: 'center'}}>
              {row.filled ? (
                <Text
                  numberOfLines={1}
                  style={{
                    color: pressed ? accent : ink,
                    fontSize: 14,
                    fontWeight: '800',
                  }}>
                  {row.nickname}
                </Text>
              ) : (
                <Row alignItems="center" style={{gap: 4}}>
                  <MCI name="plus" size={14} color={ink} />
                  <Text style={{color: ink, fontSize: 13, fontWeight: '700'}}>
                    {t('player')}
                  </Text>
                </Row>
              )}
            </View>
            {row.filled
              ? columns.map(col => (
                  <Text
                    key={col.key}
                    style={{
                      width: 36,
                      textAlign: 'center',
                      color: ink,
                      fontSize: 14,
                      fontWeight: '800',
                      fontVariant: ['tabular-nums'],
                    }}>
                    {values[col.key as 'tons' | 'heavy' | 'closes']}
                  </Text>
                ))
              : null}
          </Pressable>
        )
      })}
    </View>
  )
}

function StatsBlock({
  size,
  tons,
  heavyTons,
  closes,
  showTons = true,
  showHeavyTons = true,
  showCloses = true,
  ink,
  accent,
  locked,
  onDelta,
  horizontal,
  stacked,
}: {
  size: 'default' | 'compact'
  tons: number
  heavyTons: number
  closes: number
  showTons?: boolean
  showHeavyTons?: boolean
  showCloses?: boolean
  ink: string
  accent: string
  locked: boolean
  onDelta: (field: 'tons' | 'heavyTons' | 'closes', delta: number) => void
  horizontal?: boolean
  stacked?: boolean
}) {
  const {t} = useTranslation()
  const abbrev = size === 'compact' || stacked
  if (!showTons && !showHeavyTons && !showCloses) return null
  if (stacked) {
    return (
      <View
        style={{
          gap: 6,
          width: '100%',
          maxWidth: '100%',
          marginTop: 6,
          alignSelf: 'stretch',
        }}>
        {showTons ? (
          <StatStepper
            layout="inline"
            size={size}
            label={abbrev ? t('stat_abbr_tons') : t('tons')}
            value={tons}
            ink={ink}
            accent={accent}
            disabled={locked}
            onDelta={d => onDelta('tons', d)}
          />
        ) : null}
        {showHeavyTons ? (
          <StatStepper
            layout="inline"
            size={size}
            label={abbrev ? t('stat_abbr_heavy') : t('heavy')}
            value={heavyTons}
            ink={ink}
            accent={accent}
            disabled={locked}
            onDelta={d => onDelta('heavyTons', d)}
          />
        ) : null}
        {showCloses ? (
          <StatValueInput
            layout="inline"
            size={size}
            label={abbrev ? t('stat_abbr_closes') : t('closes')}
            value={closes}
            ink={ink}
            accent={accent}
            disabled={locked}
            max={MAX_DART_CHECKOUT}
            isValid={isValidDartCheckout}
            invalidTitle={t('invalid_checkout_title')}
            invalidMessage={t('invalid_checkout_message')}
            onChange={next => onDelta('closes', next - closes)}
          />
        ) : null}
      </View>
    )
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: horizontal ? 'nowrap' : 'wrap',
        justifyContent: horizontal ? 'flex-end' : 'center',
        alignItems: 'center',
        gap: horizontal ? 12 : size === 'compact' ? 4 : 8,
        marginTop: horizontal ? 0 : size === 'compact' ? 4 : 6,
        maxWidth: '100%',
      }}>
      {showTons ? (
        <StatStepper
          size={size}
          label={abbrev ? t('stat_abbr_tons') : t('tons')}
          value={tons}
          ink={ink}
          accent={accent}
          disabled={locked}
          onDelta={d => onDelta('tons', d)}
        />
      ) : null}
      {showHeavyTons ? (
        <StatStepper
          size={size}
          label={abbrev ? t('stat_abbr_heavy') : t('heavy')}
          value={heavyTons}
          ink={ink}
          accent={accent}
          disabled={locked}
          onDelta={d => onDelta('heavyTons', d)}
        />
      ) : null}
      {showCloses ? (
        <StatValueInput
          size={size}
          label={abbrev ? t('stat_abbr_closes') : t('closes')}
          value={closes}
          ink={ink}
          accent={accent}
          disabled={locked}
          max={MAX_DART_CHECKOUT}
          isValid={isValidDartCheckout}
          invalidTitle={t('invalid_checkout_title')}
          invalidMessage={t('invalid_checkout_message')}
          onChange={next => onDelta('closes', next - closes)}
        />
      ) : null}
    </View>
  )
}

function resolveLayout(
  layout: PlayerLayout | undefined,
  statsView: ScoresheetStatsView | undefined,
): PlayerLayout {
  if (layout) return layout
  if (statsView === 'compact') return 'ledger'
  if (statsView === 'focus') return 'chips'
  return 'panel'
}

export default function Player({
  teamId,
  side,
  frameIndex,
  frameNumber,
  frameType,
  minPlayers,
  maxPlayers,
  noPlayers,
  playerIds,
  trackStats = false,
  trackTons,
  trackHeavyTons,
  trackCloses,
  statsView,
  layout: layoutProp,
  refreshing = false,
  ink,
  mark,
  focusedSlot = null,
  onFocusSlot,
  manualStats = false,
  hideStats = false,
}: PlayerProps) {
  const router = useRouter()
  const {state, UpdateFramePlayers, UpdateFrameStats}: any = useMatchContext()
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const [pressedSlot, setPressedSlot] = useState<number | null>(null)
  const [localFocused, setLocalFocused] = useState<number | null>(null)
  const {state: playerState}: any = useLeagueContext()
  const user = playerState.user
  const {home_team_id: homeTeamId, away_team_id: awayTeamId} = state.matchInfo
  const minCount = Math.max(1, Number(minPlayers ?? noPlayers ?? 1))
  const maxCount = Math.max(minCount, Number(maxPlayers ?? minCount))
  const assigned = (playerIds ?? []).filter(
    id => id != null && Number(id) > 0,
  )
  const isFlexible = maxCount > minCount
  const slotCount = isFlexible
    ? Math.min(maxCount, assigned.length + 1)
    : maxCount
  const trackedTons = Boolean(trackTons ?? trackStats)
  const trackedHeavy = Boolean(trackHeavyTons ?? trackStats)
  const trackedCloses = Boolean(trackCloses ?? trackStats)
  const showAnyTracked = trackedTons || trackedHeavy || trackedCloses
  const showTons = manualStats && !hideStats && trackedTons
  const showHeavyTons = manualStats && !hideStats && trackedHeavy
  const showCloses = manualStats && !hideStats && trackedCloses
  const showAnyPlayerStats = showTons || showHeavyTons || showCloses
  const locked = !!(state.finalizedHome && state.finalizedAway)
  const statsKey = side === 'home' ? 'homePlayerStats' : 'awayPlayerStats'
  const playerStats = state.frameData?.[frameIndex]?.[statsKey] ?? []
  const accent = side === 'home' ? theme.home.button : theme.away.button
  const layout = resolveLayout(layoutProp, statsView)
  const activeFocus = onFocusSlot ? focusedSlot : localFocused
  const setFocus = (slot: number | null) => {
    if (onFocusSlot) onFocusSlot(slot)
    else setLocalFocused(slot)
  }

  const isPlayerOnTeam = () => {
    try {
      const playerList = [
        ...Object.keys(state.teams[awayTeamId]),
        ...Object.keys(state.teams[homeTeamId]),
      ]
      return (
        playerList.includes(user.id.toString()) || isLeagueAdmin(user)
      )
    } catch (e) {
      console.error(e)
      return false
    }
  }

  const openChoosePlayer = (slot: number) => {
    if (!claimChoosePlayerNav()) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    if (state.finalizedHome && state.finalizedAway) {
      Alert.alert(t('match_completed'))
      return
    }
    if (typeof user?.id === 'undefined') {
      Alert.alert(t('user_not_logged_in'))
      return
    }
    if (!isPlayerOnTeam()) {
      Alert.alert(t('user_not_on_team'))
      return
    }
    router.push({
      pathname: '/Match/ChoosePlayer',
      params: {
        params: JSON.stringify({
          teamId,
          side,
          frameIndex,
          frameNumber,
          frameType,
          slot,
          mfpp: state.matchInfo.initialFrames[frameIndex].mfpp,
        }),
      },
    })
  }

  const handleRemovePlayer = (slot: number) => {
    if (state.finalizedHome && state.finalizedAway) {
      Alert.alert(t('match_completed'))
      return
    }
    if (!isPlayerOnTeam()) {
      Alert.alert(t('user_not_on_team'))
      return
    }
    const initial = state.matchInfo.initialFrames[frameIndex]
    Alert.alert(t('remove_player'), t('remove_player_confirm'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('remove'),
        style: 'destructive',
        onPress: () => {
          if (activeFocus === slot) setFocus(null)
          UpdateFramePlayers(
            frameIndex,
            side,
            slot,
            0,
            '',
            false,
            frameType || initial?.type,
            frameNumber,
          )
        },
      },
    ])
  }

  // Darts: first dart is per game (this row), not alternating from match break.
  const gameFirstDart = Number(
    state.frameData?.[frameIndex]?.firstDart ?? 0,
  )
  const hasBreak = gameFirstDart > 0 && gameFirstDart === teamId

  function slotMeta(slot: number) {
    const playerId = playerIds[slot]
    const nickname = state?.teams?.[teamId]?.[playerId]?.nickname
    const filled = typeof playerId !== 'undefined' && !!nickname
    const frame = state.frameData?.[frameIndex]
    const legKey = side === 'home' ? 'homePlayerStats' : 'awayPlayerStats'
    const legs = Array.isArray(frame?.legs) ? frame.legs : []
    const fromLegs = legs.some(
      (leg: any) => Array.isArray(leg?.[legKey]) && leg[legKey].length > 0,
    )
    const slotStat = fromLegs
      ? {
          tons: Math.max(
            Number(playerStats[slot]?.tons ?? 0),
            legs.reduce(
              (sum: number, leg: any) =>
                sum + Number(leg?.[legKey]?.[slot]?.tons ?? 0),
              0,
            ),
          ),
          heavyTons: Math.max(
            Number(playerStats[slot]?.heavyTons ?? 0),
            legs.reduce(
              (sum: number, leg: any) =>
                sum + Number(leg?.[legKey]?.[slot]?.heavyTons ?? 0),
              0,
            ),
          ),
          closes: Math.max(
            Number(playerStats[slot]?.closes ?? 0),
            legs.reduce(
              (sum: number, leg: any) =>
                sum + Number(leg?.[legKey]?.[slot]?.closes ?? 0),
              0,
            ),
          ),
        }
      : (playerStats[slot] ?? {tons: 0, heavyTons: 0, closes: 0})
    return {playerId, nickname, filled, slotStat}
  }

  if (refreshing) {
    return (
      <View style={{alignItems: 'center', gap: 10}}>
        {Array.from({length: Math.min(slotCount, 4)}, (_, slot) => (
          <PlayerSkeleton key={slot} ink={ink} />
        ))}
      </View>
    )
  }

  if (showAnyTracked && !manualStats) {
    const rows = Array.from({length: slotCount}, (_, slot) => {
      const meta = slotMeta(slot)
      return {
        slot,
        nickname: meta.nickname,
        filled: meta.filled,
        tons: Number(meta.slotStat.tons ?? 0),
        heavyTons: Number(meta.slotStat.heavyTons ?? 0),
        closes: Number(meta.slotStat.closes ?? 0),
      }
    })
    return (
      <View style={{width: '100%', maxWidth: '100%', minWidth: 0}}>
        <PlayerStatTable
          slots={rows}
          showTons={trackedTons}
          showHeavyTons={trackedHeavy}
          showCloses={trackedCloses}
          ink={ink}
          accent={accent}
          pressedSlot={pressedSlot}
          onPressSlot={openChoosePlayer}
          onLongPressSlot={handleRemovePlayer}
          onPressIn={setPressedSlot}
          onPressOut={() => setPressedSlot(null)}
        />
        {hasBreak ? (
          <View style={{alignItems: 'flex-start', marginTop: 6}}>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: mark,
              }}>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 0.6,
                }}>
                {t('first_break').toUpperCase()}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    )
  }

  // —— Focus: horizontal name chips; stats only for selected chip ——
  if (layout === 'chips') {
    return (
      <View style={{width: '100%'}}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
          }}>
          {Array.from({length: slotCount}, (_, slot) => {
            const {nickname, filled} = slotMeta(slot)
            const selected = filled && activeFocus === slot
            return (
              <Pressable
                key={slot}
                onPressIn={noteScoresheetChildPress}
                onPress={() => {
                  noteScoresheetChildPress()
                  if (!filled) {
                    openChoosePlayer(slot)
                    return
                  }
                  Haptics.selectionAsync()
                  setFocus(selected ? null : slot)
                }}
                onLongPress={
                  filled ? () => handleRemovePlayer(slot) : undefined
                }
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: filled ? 8 : 14,
                  minHeight: filled ? undefined : 44,
                  borderRadius: 999,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? accent : theme.cardBorder,
                  backgroundColor: selected
                    ? side === 'home'
                      ? theme.home.panelWinner
                      : theme.away.panelWinner
                    : theme.faint,
                  minWidth: 72,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {filled ? (
                  <Text
                    numberOfLines={1}
                    style={{
                      color: ink,
                      fontWeight: '800',
                      fontSize: 14,
                    }}>
                    {nickname}
                  </Text>
                ) : (
                  <Row alignItems="center" style={{gap: 4}}>
                    <MCI name="plus" size={14} color={ink} />
                    <Text style={{color: ink, fontWeight: '700', fontSize: 13}}>
                      {t('player')}
                    </Text>
                  </Row>
                )}
              </Pressable>
            )
          })}
          {hasBreak ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: mark,
              }}>
              <Text
                style={{
                  color: '#FFF',
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 0.5,
                }}>
                {t('first_break').toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>
        {showAnyPlayerStats &&
        activeFocus != null &&
        slotMeta(activeFocus).filled ? (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              backgroundColor:
                side === 'home' ? theme.home.panel : theme.away.panel,
              borderWidth: 1,
              borderColor:
                side === 'home' ? theme.home.border : theme.away.border,
            }}>
            <Text
              style={{
                color: ink,
                fontWeight: '800',
                fontSize: 15,
                marginBottom: 8,
                textAlign: 'center',
              }}>
              {slotMeta(activeFocus).nickname}
            </Text>
            <StatsBlock
              size="default"
              tons={Number(slotMeta(activeFocus).slotStat.tons ?? 0)}
              heavyTons={Number(slotMeta(activeFocus).slotStat.heavyTons ?? 0)}
              closes={Number(slotMeta(activeFocus).slotStat.closes ?? 0)}
              showTons={showTons}
              showHeavyTons={showHeavyTons}
              showCloses={showCloses}
              ink={ink}
              accent={accent}
              locked={locked}
              onDelta={(field, d) =>
                UpdateFrameStats(frameIndex, side, field, d, activeFocus)
              }
            />
          </View>
        ) : showAnyPlayerStats ? (
          <Text
            style={{
              marginTop: 8,
              color: theme.muted,
              fontSize: 11,
              fontWeight: '600',
              textAlign: 'center',
            }}>
            {t('scoresheet_focus_hint')}
          </Text>
        ) : null}
      </View>
    )
  }

  // —— Compact ledger: one horizontal row per player ——
  if (layout === 'ledger') {
    return (
      <View style={{width: '100%', gap: 6}}>
        {Array.from({length: slotCount}, (_, slot) => {
          const {nickname, filled, slotStat} = slotMeta(slot)
          const pressed = pressedSlot === slot
          return (
            <View
              key={slot}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: filled ? 6 : 12,
                minHeight: filled ? undefined : 48,
                paddingHorizontal: 8,
                borderRadius: 10,
                backgroundColor: theme.faint,
                borderWidth: 1,
                borderColor: theme.cardBorder,
              }}>
              <Pressable
                onPress={() => openChoosePlayer(slot)}
                onLongPress={
                  filled ? () => handleRemovePlayer(slot) : undefined
                }
                onPressIn={() => {
                  noteScoresheetChildPress()
                  setPressedSlot(slot)
                }}
                onPressOut={() => setPressedSlot(null)}
                style={{flex: 1, minWidth: 0, justifyContent: 'center'}}>
                {filled ? (
                  <Text
                    numberOfLines={1}
                    style={{
                      color: pressed ? theme.win : ink,
                      fontWeight: '800',
                      fontSize: 14,
                    }}>
                    {nickname}
                  </Text>
                ) : (
                  <Row alignItems="center" style={{gap: 4}}>
                    <MCI name="plus" size={14} color={ink} />
                    <Text style={{color: ink, fontWeight: '700', fontSize: 13}}>
                      {t('player')}
                    </Text>
                  </Row>
                )}
              </Pressable>
              {showAnyPlayerStats && filled ? (
                <StatsBlock
                  size="compact"
                  horizontal
                  tons={Number(slotStat.tons ?? 0)}
                  heavyTons={Number(slotStat.heavyTons ?? 0)}
                  closes={Number(slotStat.closes ?? 0)}
                  showTons={showTons}
                  showHeavyTons={showHeavyTons}
                  showCloses={showCloses}
                  ink={ink}
                  accent={accent}
                  locked={locked}
                  onDelta={(field, d) =>
                    UpdateFrameStats(frameIndex, side, field, d, slot)
                  }
                />
              ) : null}
            </View>
          )
        })}
        {hasBreak ? (
          <View style={{alignItems: 'flex-start'}}>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: mark,
              }}>
              <Text
                style={{
                  color: '#FFF',
                  fontSize: 10,
                  fontWeight: '800',
                }}>
                {t('first_break').toUpperCase()}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    )
  }

  // —— Full panel: stacked name + large steppers (2-col parent) ——
  return (
    <View
      style={{
        alignItems: 'center',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
      }}>
      {Array.from({length: slotCount}, (_, slot) => {
        const {nickname, filled, slotStat} = slotMeta(slot)
        const pressed = pressedSlot === slot
        const color = pressed ? theme.win : ink
        return (
          <View
            key={slot}
            style={
              slot > 0
                ? {
                    marginTop: 10,
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
                  }
                : {
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
                  }
            }>
            <Pressable
              onPress={() => openChoosePlayer(slot)}
              onLongPress={
                filled ? () => handleRemovePlayer(slot) : undefined
              }
              onPressIn={() => {
                noteScoresheetChildPress()
                setPressedSlot(slot)
              }}
              onPressOut={() => setPressedSlot(null)}
              style={{
                paddingVertical: filled ? 2 : 14,
                minHeight: filled ? undefined : 48,
                justifyContent: 'center',
                alignSelf: 'stretch',
                maxWidth: '100%',
              }}>
              {filled ? (
                <Text
                  numberOfLines={2}
                  style={{
                    color,
                    fontSize: 16,
                    lineHeight: 20,
                    fontWeight: '800',
                    textAlign: 'center',
                  }}>
                  {nickname}
                </Text>
              ) : (
                <Row
                  alignItems="center"
                  justifyContent="center"
                  style={{gap: 6}}>
                  <MCI name="plus" size={16} color={color} />
                  <Text style={{color, fontSize: 15, fontWeight: '700'}}>
                    {t('player')}
                  </Text>
                </Row>
              )}
            </Pressable>
            {showAnyPlayerStats && filled ? (
              <StatsBlock
                size="default"
                stacked
                tons={Number(slotStat.tons ?? 0)}
                heavyTons={Number(slotStat.heavyTons ?? 0)}
                closes={Number(slotStat.closes ?? 0)}
                showTons={showTons}
                showHeavyTons={showHeavyTons}
                showCloses={showCloses}
                ink={ink}
                accent={accent}
                locked={locked}
                onDelta={(field, d) =>
                  UpdateFrameStats(frameIndex, side, field, d, slot)
                }
              />
            ) : null}
          </View>
        )
      })}
      {hasBreak ? (
        <View
          style={{
            marginTop: 8,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: mark,
          }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 0.6,
            }}>
            {t('first_break').toUpperCase()}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
