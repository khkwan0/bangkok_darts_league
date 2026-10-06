import Row from '@/components/Row'
import {useLeagueContext} from '@/context/LeagueContext'
import {useMatchContext} from '@/context/MatchContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import type {ScoresheetStatsView} from '@/lib/scoresheetStatsView'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import {router} from 'expo-router'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Alert, Pressable, Text, View} from 'react-native'
import {useScoresheetTheme} from './scoresheetTheme'
import StatStepper from './StatStepper'

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
  /** @deprecated prefer layout; kept for callers that pass statsView */
  statsView?: ScoresheetStatsView
  layout?: PlayerLayout
  refreshing?: boolean
  ink: string
  mark: string
  /** Focus layout: which slot is expanded for stats */
  focusedSlot?: number | null
  onFocusSlot?: (slot: number | null) => void
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

function StatsBlock({
  size,
  tons,
  heavyTons,
  closes,
  ink,
  accent,
  locked,
  onDelta,
  horizontal,
}: {
  size: 'default' | 'compact'
  tons: number
  heavyTons: number
  closes: number
  ink: string
  accent: string
  locked: boolean
  onDelta: (field: 'tons' | 'heavyTons' | 'closes', delta: number) => void
  horizontal?: boolean
}) {
  const {t} = useTranslation()
  const abbrev = size === 'compact'
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: horizontal ? 'nowrap' : 'wrap',
        justifyContent: horizontal ? 'flex-end' : 'center',
        alignItems: 'center',
        gap: horizontal ? 12 : size === 'compact' ? 4 : 8,
        marginTop: horizontal ? 0 : size === 'compact' ? 4 : 6,
      }}>
      <StatStepper
        size={size}
        label={abbrev ? t('stat_abbr_tons') : t('tons')}
        value={tons}
        ink={ink}
        accent={accent}
        disabled={locked}
        onDelta={d => onDelta('tons', d)}
      />
      <StatStepper
        size={size}
        label={abbrev ? t('stat_abbr_heavy') : t('heavy')}
        value={heavyTons}
        ink={ink}
        accent={accent}
        disabled={locked}
        onDelta={d => onDelta('heavyTons', d)}
      />
      <StatStepper
        size={size}
        label={abbrev ? t('stat_abbr_closes') : t('closes')}
        value={closes}
        ink={ink}
        accent={accent}
        disabled={locked}
        onDelta={d => onDelta('closes', d)}
      />
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
  statsView,
  layout: layoutProp,
  refreshing = false,
  ink,
  mark,
  focusedSlot = null,
  onFocusSlot,
}: PlayerProps) {
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

  const hasBreak =
    (teamId === homeTeamId &&
      state.firstBreak === homeTeamId &&
      state.frameData[frameIndex].frameNumber % 2 === 1) ||
    (teamId === homeTeamId &&
      state.firstBreak === awayTeamId &&
      state.frameData[frameIndex].frameNumber % 2 === 0) ||
    (teamId === awayTeamId &&
      state.firstBreak === awayTeamId &&
      state.frameData[frameIndex].frameNumber % 2 === 1) ||
    (teamId === awayTeamId &&
      state.firstBreak === homeTeamId &&
      state.frameData[frameIndex].frameNumber % 2 === 0)

  function slotMeta(slot: number) {
    const playerId = playerIds[slot]
    const nickname = state?.teams?.[teamId]?.[playerId]?.nickname
    const filled = typeof playerId !== 'undefined' && !!nickname
    const slotStat = playerStats[slot] ?? {tons: 0, heavyTons: 0, closes: 0}
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
            const {nickname, filled, slotStat} = slotMeta(slot)
            const selected = filled && activeFocus === slot
            return (
              <Pressable
                key={slot}
                onPress={() => {
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
                  paddingVertical: 8,
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
                }}>
                {filled ? (
                  <>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: ink,
                        fontWeight: '800',
                        fontSize: 14,
                      }}>
                      {nickname}
                    </Text>
                    {trackStats && !selected ? (
                      <Text
                        style={{
                          color: ink,
                          opacity: 0.55,
                          fontSize: 10,
                          fontWeight: '600',
                          marginTop: 2,
                        }}>
                        {t('stat_abbr_tons')}
                        {Number(slotStat.tons ?? 0)}{' '}
                        {t('stat_abbr_heavy')}
                        {Number(slotStat.heavyTons ?? 0)}{' '}
                        {t('stat_abbr_closes')}
                        {Number(slotStat.closes ?? 0)}
                      </Text>
                    ) : null}
                  </>
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
                {t('break').toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>
        {trackStats &&
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
              ink={ink}
              accent={accent}
              locked={locked}
              onDelta={(field, d) =>
                UpdateFrameStats(frameIndex, side, field, d, activeFocus)
              }
            />
            <Pressable
              onPress={() => openChoosePlayer(activeFocus)}
              style={{marginTop: 10, alignItems: 'center'}}>
              <Text style={{color: accent, fontWeight: '700', fontSize: 12}}>
                {t('change_player')}
              </Text>
            </Pressable>
          </View>
        ) : trackStats ? (
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
                paddingVertical: 6,
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
                onPressIn={() => setPressedSlot(slot)}
                onPressOut={() => setPressedSlot(null)}
                style={{flex: 1, minWidth: 0}}>
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
              {trackStats && filled ? (
                <StatsBlock
                  size="compact"
                  horizontal
                  tons={Number(slotStat.tons ?? 0)}
                  heavyTons={Number(slotStat.heavyTons ?? 0)}
                  closes={Number(slotStat.closes ?? 0)}
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
                {t('break').toUpperCase()}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    )
  }

  // —— Full panel: stacked name + large steppers (2-col parent) ——
  return (
    <View style={{alignItems: 'center', width: '100%'}}>
      {Array.from({length: slotCount}, (_, slot) => {
        const {nickname, filled, slotStat} = slotMeta(slot)
        const pressed = pressedSlot === slot
        const color = pressed ? theme.win : ink
        return (
          <View
            key={slot}
            style={
              slot > 0
                ? {marginTop: 10, alignItems: 'center', width: '100%'}
                : {alignItems: 'center', width: '100%'}
            }>
            <Pressable
              onPress={() => openChoosePlayer(slot)}
              onLongPress={
                filled ? () => handleRemovePlayer(slot) : undefined
              }
              onPressIn={() => setPressedSlot(slot)}
              onPressOut={() => setPressedSlot(null)}
              style={{paddingVertical: 2}}>
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
            {trackStats && filled ? (
              <StatsBlock
                size="default"
                tons={Number(slotStat.tons ?? 0)}
                heavyTons={Number(slotStat.heavyTons ?? 0)}
                closes={Number(slotStat.closes ?? 0)}
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
            {t('break').toUpperCase()}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
