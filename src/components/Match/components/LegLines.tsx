import {useMatchContext} from '@/context/MatchContext'
import {
  isValidDartCheckout,
  MAX_DART_CHECKOUT,
} from '@/lib/dartCheckouts'
import type {LegRow, PlayerLegStat} from '@/components/Match/types'
import {hydrateFrameLegs} from '@/lib/hydrateFrameLegs'
import {useTranslation} from 'react-i18next'
import {Text, View} from 'react-native'
import {useScoresheetTheme} from './scoresheetTheme'
import StatStepper from './StatStepper'
import StatValueInput from './StatValueInput'

type Props = {
  frameIndex: number
  trackTons?: boolean
  trackHeavyTons?: boolean
  trackCloses?: boolean
  locked?: boolean
}

function emptyStat(): PlayerLegStat {
  return {tons: 0, heavyTons: 0, closes: 0}
}

function SideLegStats({
  frameIndex,
  legIndex,
  side,
  playerIds,
  stats,
  showTons,
  showHeavyTons,
  showCloses,
  locked,
}: {
  frameIndex: number
  legIndex: number
  side: 'home' | 'away'
  playerIds: number[]
  stats: PlayerLegStat[]
  showTons: boolean
  showHeavyTons: boolean
  showCloses: boolean
  locked: boolean
}) {
  const {state, UpdateFrameStats}: any = useMatchContext()
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const palette = side === 'home' ? theme.home : theme.away
  const teamId =
    side === 'home'
      ? state.matchInfo.home_team_id
      : state.matchInfo.away_team_id
  const slots = (playerIds ?? []).filter(id => id != null && Number(id) > 0)
  if (slots.length === 0) {
    return (
      <View style={{flex: 1, minWidth: 0}}>
        <Text style={{color: theme.muted, fontSize: 11, fontWeight: '600'}}>
          {t('player')}
        </Text>
      </View>
    )
  }
  if (!showTons && !showHeavyTons && !showCloses) return null

  return (
    <View style={{gap: 6, flex: 1, minWidth: 0}}>
      {slots.map((playerId, slot) => {
        const nickname =
          state?.teams?.[teamId]?.[playerId]?.nickname ?? t('player')
        const slotStat = stats[slot] ?? emptyStat()
        return (
          <View key={`${side}-${slot}`} style={{gap: 2}}>
            <Text
              numberOfLines={1}
              style={{
                color: palette.ink,
                fontSize: 11,
                fontWeight: '700',
              }}>
              {nickname}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
              }}>
              {showTons ? (
                <StatStepper
                  size="compact"
                  label={t('stat_abbr_tons')}
                  value={Number(slotStat.tons ?? 0)}
                  ink={palette.ink}
                  accent={palette.button}
                  disabled={locked}
                  onDelta={d =>
                    UpdateFrameStats(
                      frameIndex,
                      side,
                      'tons',
                      d,
                      slot,
                      legIndex,
                    )
                  }
                />
              ) : null}
              {showHeavyTons ? (
                <StatStepper
                  size="compact"
                  label={t('stat_abbr_heavy')}
                  value={Number(slotStat.heavyTons ?? 0)}
                  ink={palette.ink}
                  accent={palette.button}
                  disabled={locked}
                  onDelta={d =>
                    UpdateFrameStats(
                      frameIndex,
                      side,
                      'heavyTons',
                      d,
                      slot,
                      legIndex,
                    )
                  }
                />
              ) : null}
              {showCloses ? (
                <StatValueInput
                  size="compact"
                  label={t('stat_abbr_closes')}
                  value={Number(slotStat.closes ?? 0)}
                  ink={palette.ink}
                  accent={palette.button}
                  disabled={locked}
                  max={MAX_DART_CHECKOUT}
                  isValid={isValidDartCheckout}
                  invalidTitle={t('invalid_checkout_title')}
                  invalidMessage={t('invalid_checkout_message')}
                  onChange={next =>
                    UpdateFrameStats(
                      frameIndex,
                      side,
                      'closes',
                      next - Number(slotStat.closes ?? 0),
                      slot,
                      legIndex,
                    )
                  }
                />
              ) : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}

export default function LegLines({
  frameIndex,
  trackTons = true,
  trackHeavyTons = true,
  trackCloses = true,
  locked = false,
}: Props) {
  const {state}: any = useMatchContext()
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const live = state.frameData?.[frameIndex]
  // Race to N must always show N lines even at 0–0.
  const hydrated = live ? hydrateFrameLegs(live) : null
  const legs: LegRow[] = Array.isArray(hydrated?.legs) ? hydrated!.legs! : []

  if (legs.length === 0) {
    return (
      <Text
        style={{
          marginTop: 4,
          color: theme.muted,
          fontSize: 11,
          fontWeight: '600',
          textAlign: 'center',
        }}>
        {t('scoresheet_legs_hint')}
      </Text>
    )
  }

  return (
    <View style={{gap: 8, marginTop: 4}}>
      {legs.map((leg, legIndex) => {
        const homeWon = leg.winner === 'home'
        const awayWon = leg.winner === 'away'
        const open = !homeWon && !awayWon
        const palette = homeWon
          ? theme.home
          : awayWon
            ? theme.away
            : null
        return (
          <View
            key={`leg-${legIndex}`}
            style={{
              borderRadius: 12,
              padding: 10,
              backgroundColor: open
                ? theme.faint
                : homeWon
                  ? theme.home.panelWinner
                  : theme.away.panelWinner,
              borderWidth: open ? 1 : 1.5,
              borderColor: open
                ? theme.cardBorder
                : palette!.accent,
              gap: 8,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text
                style={{
                  color: open ? theme.muted : palette!.ink,
                  fontSize: 12,
                  fontWeight: '800',
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}>
                {t('legs')} {legIndex + 1}
              </Text>
              <Text
                style={{
                  color: open
                    ? theme.muted
                    : palette!.accent,
                  fontSize: 12,
                  fontWeight: '800',
                  textTransform: 'uppercase',
                }}>
                {homeWon ? t('home') : awayWon ? t('away') : '—'}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
              }}>
              <SideLegStats
                frameIndex={frameIndex}
                legIndex={legIndex}
                side="home"
                playerIds={live?.homePlayerIds ?? []}
                stats={leg.homePlayerStats ?? []}
                showTons={trackTons}
                showHeavyTons={trackHeavyTons}
                showCloses={trackCloses}
                locked={locked}
              />
              <SideLegStats
                frameIndex={frameIndex}
                legIndex={legIndex}
                side="away"
                playerIds={live?.awayPlayerIds ?? []}
                stats={leg.awayPlayerStats ?? []}
                showTons={trackTons}
                showHeavyTons={trackHeavyTons}
                showCloses={trackCloses}
                locked={locked}
              />
            </View>
          </View>
        )
      })}
    </View>
  )
}
