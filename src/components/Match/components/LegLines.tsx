import {useMatchContext} from '@/context/MatchContext'
import {
  isValidDartCheckout,
  MAX_DART_CHECKOUT,
} from '@/lib/dartCheckouts'
import type {FrameType, LegRow, PlayerLegStat} from '@/components/Match/types'
import {hydrateFrameLegs} from '@/lib/hydrateFrameLegs'
import {useTranslation} from 'react-i18next'
import {Text, View} from 'react-native'
import {useScoresheetTheme} from './scoresheetTheme'
import StatStepper from './StatStepper'
import StatValueInput from './StatValueInput'

type Props = {
  frameIndex: number
  /** Only this side’s per-leg tallies (closes decide the leg winner). */
  side: 'home' | 'away'
  /** From format template — live redis frames often omit these. */
  games?: number
  seriesMode?: 'best_of' | 'race_to'
  trackTons?: boolean
  trackHeavyTons?: boolean
  trackCloses?: boolean
  locked?: boolean
}

function emptyStat(): PlayerLegStat {
  return {tons: 0, heavyTons: 0, closes: 0}
}

function sumCloses(stats: PlayerLegStat[] | undefined): number {
  return (stats ?? []).reduce((n, s) => n + Number(s?.closes ?? 0), 0)
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
  closeDisabled,
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
  /** Other side closed this leg (or won via Win) — close input is read-only. */
  closeDisabled: boolean
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
  if (!showTons && !showHeavyTons && !showCloses) return null

  if (slots.length === 0) {
    return (
      <Text style={{color: theme.muted, fontSize: 11, fontWeight: '600'}}>
        {t('player')}
      </Text>
    )
  }

  return (
    <View style={{gap: 8, width: '100%'}}>
      {slots.map((playerId, slot) => {
        const nickname =
          state?.teams?.[teamId]?.[playerId]?.nickname ?? t('player')
        const slotStat = stats[slot] ?? emptyStat()
        return (
          <View key={`${side}-${slot}`} style={{gap: 4, width: '100%'}}>
            {slots.length > 1 ? (
              <Text
                numberOfLines={1}
                style={{
                  color: palette.ink,
                  fontSize: 11,
                  fontWeight: '700',
                  textAlign: 'left',
                  opacity: 0.85,
                }}>
                {nickname}
              </Text>
            ) : null}
            {/* Full-width stacked rows — cramped 3-across wraps were hard to tap */}
            <View style={{gap: 6, width: '100%'}}>
              {showTons ? (
                <StatStepper
                  layout="inline"
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
                  layout="inline"
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
                  layout="inline"
                  label={t('stat_abbr_closes')}
                  value={Number(slotStat.closes ?? 0)}
                  ink={palette.ink}
                  accent={palette.button}
                  disabled={locked || closeDisabled}
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
  side,
  games,
  seriesMode,
  trackTons = true,
  trackHeavyTons = true,
  trackCloses = true,
  locked = false,
}: Props) {
  const {state}: any = useMatchContext()
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const palette = side === 'home' ? theme.home : theme.away
  const live = state.frameData?.[frameIndex] as FrameType | undefined
  const initial = state.matchInfo?.initialFrames?.[frameIndex] as
    | FrameType
    | undefined

  const merged: FrameType = {
    ...(initial ?? ({} as FrameType)),
    ...(live ?? ({} as FrameType)),
    games: Number(games ?? live?.games ?? initial?.games ?? 1),
    seriesMode:
      seriesMode ??
      live?.seriesMode ??
      initial?.seriesMode ??
      (Number(games ?? live?.games ?? initial?.games ?? 1) > 1
        ? 'best_of'
        : undefined),
    homeScore: Number(live?.homeScore ?? 0),
    awayScore: Number(live?.awayScore ?? 0),
    homePlayerIds: live?.homePlayerIds ?? initial?.homePlayerIds ?? [],
    awayPlayerIds: live?.awayPlayerIds ?? initial?.awayPlayerIds ?? [],
    legs: live?.legs ?? initial?.legs ?? [],
    homePlayerStats: live?.homePlayerStats,
    awayPlayerStats: live?.awayPlayerStats,
    homeTons: live?.homeTons,
    awayTons: live?.awayTons,
    homeHeavyTons: live?.homeHeavyTons,
    awayHeavyTons: live?.awayHeavyTons,
    homeCloses: live?.homeCloses,
    awayCloses: live?.awayCloses,
  }
  // Series hydrates N rows; single-game Close still needs one open tallies row.
  const legs: LegRow[] = (() => {
    const hydrated = hydrateFrameLegs(merged).legs ?? []
    if (hydrated.length > 0) return hydrated
    return [{winner: null, homePlayerStats: [], awayPlayerStats: []}]
  })()
  const playerIds =
    side === 'home' ? (merged.homePlayerIds ?? []) : (merged.awayPlayerIds ?? [])

  return (
    <View style={{gap: 8, width: '100%', marginTop: 4}}>
      {legs.map((leg, legIndex) => {
        const won = leg.winner === side
        const lost = leg.winner != null && leg.winner !== side
        const stats =
          side === 'home'
            ? (leg.homePlayerStats ?? [])
            : (leg.awayPlayerStats ?? [])
        const oppCloses =
          side === 'home'
            ? sumCloses(leg.awayPlayerStats)
            : sumCloses(leg.homePlayerStats)
        // Losing side cannot enter a close; clear the winning close to re-open.
        const closeDisabled = lost || oppCloses > 0
        return (
          <View
            key={`leg-${side}-${legIndex}`}
            style={{
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 10,
              backgroundColor: won
                ? palette.panelWinner
                : lost
                  ? theme.faint
                  : theme.card,
              borderWidth: won ? 1.5 : 1,
              borderColor: won ? palette.accent : theme.cardBorder,
              opacity: lost ? 0.7 : 1,
              gap: 8,
              alignItems: 'stretch',
              width: '100%',
            }}>
            <Text
              style={{
                color: won ? palette.accent : theme.muted,
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}>
              {t('legs')} {legIndex + 1}
              {won ? ` · ${t('win')}` : ''}
            </Text>
            <SideLegStats
              frameIndex={frameIndex}
              legIndex={legIndex}
              side={side}
              playerIds={playerIds}
              stats={stats}
              showTons={trackTons}
              showHeavyTons={trackHeavyTons}
              showCloses={trackCloses}
              locked={locked}
              closeDisabled={closeDisabled}
            />
          </View>
        )
      })}
    </View>
  )
}
