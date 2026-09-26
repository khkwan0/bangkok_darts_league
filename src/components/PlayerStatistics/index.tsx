/* eslint-disable react-hooks/exhaustive-deps */
import StatsDoubles from '@/components/PlayerStatistics/StatsDoubles'
import StatsMatchPerformance from '@/components/PlayerStatistics/StatsMatchPerformance'
import {
  EmptyNote,
  formatWinLabel,
  SectionTitle,
  Surface,
  useStatColors,
  WinRateBar,
  winRateColor,
  winRatePercent,
} from '@/components/PlayerStatistics/statUi'
import {MiniSeasonChips} from '@/components/mini-leagues/MiniSeasonChips'
import config from '@/config'
import {useLeagueContext} from '@/context/LeagueContext'
import {useLeagueSeasonSelection} from '@/hooks/useLeagueSeasonSelection'
import {useSeason} from '@/hooks/useSeason'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import {
  PANEL_I18N_KEY,
  PANEL_STATS_KEY,
  resolveHomePanels,
  type HomePanelId,
} from '@/lib/homePanels'
import React, {useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text as RNText,
  View as RNView,
} from 'react-native'

interface PlayerInfo {
  player_id: number
  name?: string
  firstname?: string
  lastname?: string
  nationality?: {en?: string; th?: string}
  flag?: string
  profile_picture?: string
  gender?: string
  pic?: string | null
  teams?: string[]
}

type StatBucket = {
  played: number
  won: number
  winp: number | string
}

export default function PlayerStatistics({
  playerInfo,
  path,
}: {
  playerInfo: PlayerInfo
  path: string | undefined
}) {
  const season = useSeason()
  const {state} = useLeagueContext()
  const {seasons, seasonId, setSeasonId, selectedSeason, pastSeasonId} =
    useLeagueSeasonSelection()
  const [stats, setStats] = useState<any>(null)
  const [doublesStats, setDoublesStats] = useState<any>(null)
  const [matchPerformance, setMatchPerformance] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDoubleStatsLoading, setIsDoubleStatsLoading] = useState(false)
  const [isMatchPerformanceLoading, setIsMatchPerformanceLoading] =
    useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const {t, i18n} = useTranslation()
  const colors = useStatColors()
  const listContentStyle = useTabListContentContainerStyle({
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  })

  const homePanels = useMemo(
    () =>
      resolveHomePanels(
        state.homePanelsStored ?? state.homePanels,
        state.user?.preferences?.home_panels,
        state.sport === 'darts' ? 'darts' : 'pool',
      ) as HomePanelId[],
    [
      state.homePanelsStored,
      state.homePanels,
      state.user?.preferences?.home_panels,
      state.sport,
    ],
  )

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true)
  }, [playerInfo.player_id])

  async function GetStats() {
    try {
      const res = await season.GetPlayerStats(playerInfo.player_id, pastSeasonId)
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e as string)
    }
  }

  async function GetDoublesStats() {
    try {
      const res = await season.GetDoublesStats(
        playerInfo.player_id,
        pastSeasonId,
      )
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e as string)
    }
  }

  async function GetMatchPerformance() {
    try {
      const res = await season.GetMatchPerformance(
        playerInfo.player_id,
        pastSeasonId,
      )
      return res
    } catch (e) {
      console.log(e)
      throw new Error(e as string)
    }
  }

  React.useEffect(() => {
    ;(async () => {
      try {
        setIsLoading(true)
        const res = await GetStats()
        setStats(res)
      } catch (e) {
        console.log(e)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    })()
  }, [playerInfo.player_id, isRefreshing, pastSeasonId])

  React.useEffect(() => {
    ;(async () => {
      try {
        setIsDoubleStatsLoading(true)
        const res = await GetDoublesStats()
        setDoublesStats(res)
      } catch (e) {
        console.log(e)
      } finally {
        setIsDoubleStatsLoading(false)
        setIsRefreshing(false)
      }
    })()
  }, [playerInfo.player_id, isRefreshing, pastSeasonId])

  React.useEffect(() => {
    ;(async () => {
      try {
        setIsMatchPerformanceLoading(true)
        const res = await GetMatchPerformance()
        setMatchPerformance(res)
      } catch (e) {
        console.log(e)
      } finally {
        setIsMatchPerformanceLoading(false)
        setIsRefreshing(false)
      }
    })()
  }, [playerInfo.player_id, isRefreshing, pastSeasonId])

  const nationalityName =
    (i18n.language?.startsWith('th')
      ? playerInfo.nationality?.th
      : playerInfo.nationality?.en) ||
    playerInfo.nationality?.en ||
    ''
  const nationLine = [playerInfo.flag, nationalityName].filter(Boolean).join(' ')
  const teams = Array.isArray(playerInfo.teams) ? playerInfo.teams : []

  const seasonRows = useMemo(() => {
    if (!stats) return []
    return homePanels
      .map(panelId => {
        const statsKey = PANEL_STATS_KEY[panelId]
        const bucket = stats[statsKey] as StatBucket | undefined
        if (!bucket || bucket.played <= 0) return null
        return {
          key: statsKey,
          label: t(PANEL_I18N_KEY[panelId], {defaultValue: statsKey}),
          bucket,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
  }, [stats, homePanels, t])

  const total = stats?.Total as StatBucket | undefined

  return (
    <ScrollView
      contentContainerStyle={listContentStyle}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          progressBackgroundColor="#000"
        />
      }>
      <Surface style={{padding: 16, marginBottom: 16}}>
        <RNView style={{flexDirection: 'row', alignItems: 'center'}}>
          <RNView
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              padding: 3,
              backgroundColor: colors.accent,
              marginRight: 14,
            }}>
            <Image
              source={{
                uri: `${config.profileUrl}${
                  playerInfo.pic ||
                  (playerInfo.gender === 'Female'
                    ? 'default_female.png'
                    : 'default_male.png')
                }`,
              }}
              style={{
                width: 78,
                height: 78,
                borderRadius: 39,
                backgroundColor: colors.track,
              }}
              resizeMode="cover"
            />
          </RNView>
          <RNView style={{flex: 1}}>
            <RNText
              numberOfLines={2}
              style={{fontSize: 20, fontWeight: '700', color: colors.text}}>
              {playerInfo.name || t('player_profile')}
            </RNText>
            {nationLine ? (
              <RNText
                style={{marginTop: 4, fontSize: 14, color: colors.muted}}>
                {nationLine}
              </RNText>
            ) : null}
            <RNView
              style={{
                alignSelf: 'flex-start',
                marginTop: 8,
                borderRadius: 999,
                backgroundColor: colors.chip,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}>
              <RNText style={{fontSize: 12, fontWeight: '600', color: colors.text}}>
                {`${t('player_id')} ${playerInfo.player_id}`}
              </RNText>
            </RNView>
            {teams.length > 0 ? (
              <RNView
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 8,
                }}>
                {teams.map(team => (
                  <RNView
                    key={team}
                    style={{
                      borderRadius: 999,
                      backgroundColor: colors.chip,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}>
                    <RNText style={{fontSize: 12, color: colors.text}}>
                      {team}
                    </RNText>
                  </RNView>
                ))}
              </RNView>
            ) : null}
          </RNView>
        </RNView>
      </Surface>

      <MiniSeasonChips
        seasons={seasons}
        seasonId={seasonId}
        onSelect={setSeasonId}
      />

      <SectionTitle
        label={
          pastSeasonId != null && selectedSeason
            ? selectedSeason.name
            : 'season_performance'
        }
      />
      {isLoading ? (
        <LoadingCard label="loading_singles_statistics" />
      ) : seasonRows.length === 0 && !(total && total.played > 0) ? (
        <EmptyNote label="no_frames_this_season" />
      ) : (
        <>
          {seasonRows.map(row => (
            <StatCard key={row.key} label={row.label} bucket={row.bucket} />
          ))}
          {total && total.played > 0 ? <TotalCard bucket={total} /> : null}
        </>
      )}

      <SectionTitle label="doubles_performance" />
      {isDoubleStatsLoading ? (
        <LoadingCard label="loading_doubles_statistics" />
      ) : Array.isArray(doublesStats) && doublesStats.length > 0 ? (
        <StatsDoubles stats={doublesStats} path={path} variant="cards" />
      ) : (
        <EmptyNote label="no_doubles_this_season" />
      )}

      <SectionTitle label="match_performance" />
      {isMatchPerformanceLoading ? (
        <LoadingCard label="loading_match_performance" />
      ) : Array.isArray(matchPerformance) && matchPerformance.length > 0 ? (
        <StatsMatchPerformance
          stats={matchPerformance}
          path={path}
          variant="cards"
        />
      ) : (
        <EmptyNote label="no_matches_this_season" />
      )}

      <Surface style={{padding: 16, marginTop: 8}}>
        <RNText
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
            marginBottom: 8,
          }}>
          {t('statistics_legend')}
        </RNText>
        <RNText style={{color: colors.muted, fontSize: 13, lineHeight: 18}}>
          {t('statistics_legend_confirmed')}
        </RNText>
        <RNText
          style={{
            color: colors.muted,
            fontSize: 13,
            lineHeight: 18,
            marginTop: 8,
          }}>
          {t('statistics_legend_weighted')}
        </RNText>
        <RNText
          style={{
            color: colors.muted,
            fontSize: 13,
            lineHeight: 18,
            marginTop: 8,
          }}>
          {t('statistics_legend_adjusted')}
        </RNText>
      </Surface>
    </ScrollView>
  )
}

function LoadingCard({label}: {label: string}) {
  const {t} = useTranslation()
  const colors = useStatColors()
  return (
    <Surface
      style={{
        padding: 20,
        marginBottom: 12,
        alignItems: 'center',
      }}>
      <ActivityIndicator color={colors.accent} />
      <RNText style={{marginTop: 8, color: colors.muted}}>{t(label)}</RNText>
    </Surface>
  )
}

function StatCard({label, bucket}: {label: string; bucket: StatBucket}) {
  const {t} = useTranslation()
  const colors = useStatColors()
  const percent = winRatePercent(bucket.played, bucket.won, bucket.winp)
  return (
    <Surface style={{padding: 14, marginBottom: 8}}>
      <RNView
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}>
        <RNText
          numberOfLines={2}
          style={{
            flex: 1,
            marginRight: 8,
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
          }}>
          {label}
        </RNText>
        <RNText
          style={{fontSize: 18, fontWeight: '700', color: winRateColor(percent)}}>
          {formatWinLabel(percent)}
        </RNText>
      </RNView>
      <RNText style={{color: colors.muted, fontSize: 13, marginBottom: 8}}>
        {`${t('played')} ${bucket.played}  ·  ${t('won')} ${bucket.won}`}
      </RNText>
      <WinRateBar played={bucket.played} won={bucket.won} winp={bucket.winp} />
    </Surface>
  )
}

function TotalCard({bucket}: {bucket: StatBucket}) {
  const {t} = useTranslation()
  const colors = useStatColors()
  const percent = winRatePercent(bucket.played, bucket.won, bucket.winp)
  return (
    <Surface
      style={{
        padding: 16,
        marginTop: 4,
        marginBottom: 8,
        borderColor: colors.accent,
      }}>
      <RNText
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: colors.text,
          marginBottom: 12,
        }}>
        {t('total')}
      </RNText>
      <RNView style={{flexDirection: 'row', marginBottom: 12}}>
        <TotalStat label={t('played')} value={String(bucket.played)} />
        <TotalStat label={t('won')} value={String(bucket.won)} />
        <TotalStat
          label={t('win_rate')}
          value={formatWinLabel(percent)}
          valueColor={winRateColor(percent)}
        />
      </RNView>
      <WinRateBar played={bucket.played} won={bucket.won} winp={bucket.winp} />
    </Surface>
  )
}

function TotalStat({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  const colors = useStatColors()
  return (
    <RNView style={{flex: 1}}>
      <RNText
        style={{
          fontSize: 22,
          fontWeight: '700',
          color: valueColor || colors.text,
        }}>
        {value}
      </RNText>
      <RNText style={{marginTop: 2, fontSize: 12, color: colors.muted}}>
        {label}
      </RNText>
    </RNView>
  )
}
