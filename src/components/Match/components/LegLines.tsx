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
  /** Only this side’s tallies (lives next to that side’s Legs stepper). */
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
  if (!showTons && !showHeavyTons && !showCloses) return null

  if (slots.length === 0) {
    return (
      <Text style={{color: theme.muted, fontSize: 11, fontWeight: '600'}}>
        {t('player')}
      </Text>
    )
  }

  return (
    <View style={{gap: 6, width: '100%'}}>
      {slots.map((playerId, slot) => {
        const nickname =
          state?.teams?.[teamId]?.[playerId]?.nickname ?? t('player')
        const slotStat = stats[slot] ?? emptyStat()
        return (
          <View key={`${side}-${slot}`} style={{gap: 2}}>
            {slots.length > 1 ? (
              <Text
                numberOfLines={1}
                style={{
                  color: palette.ink,
                  fontSize: 11,
                  fontWeight: '700',
                  textAlign: 'center',
                }}>
                {nickname}
              </Text>
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
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
  const legs: LegRow[] = hydrateFrameLegs(merged).legs ?? []
  const playerIds =
    side === 'home' ? (merged.homePlayerIds ?? []) : (merged.awayPlayerIds ?? [])

  if (legs.length === 0) return null

  return (
    <View style={{gap: 6, width: '100%', marginTop: 4}}>
      {legs.map((leg, legIndex) => {
        const won = leg.winner === side
        const lost = leg.winner != null && leg.winner !== side
        const stats =
          side === 'home'
            ? (leg.homePlayerStats ?? [])
            : (leg.awayPlayerStats ?? [])
        return (
          <View
            key={`leg-${side}-${legIndex}`}
            style={{
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 8,
              backgroundColor: won
                ? palette.panelWinner
                : lost
                  ? theme.faint
                  : theme.card,
              borderWidth: won ? 1.5 : 1,
              borderColor: won ? palette.accent : theme.cardBorder,
              opacity: lost ? 0.7 : 1,
              gap: 4,
              alignItems: 'center',
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
            />
          </View>
        )
      })}
    </View>
  )
}
