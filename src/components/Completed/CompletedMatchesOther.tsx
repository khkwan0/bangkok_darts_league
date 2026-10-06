/* eslint-disable react-hooks/exhaustive-deps */
import {Colors} from '@/constants/Colors'
import {
  View,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  Text,
} from 'react-native'
import {useSeason} from '@/hooks/useSeason'
import {useLeagueSeasonSelection} from '@/hooks/useLeagueSeasonSelection'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import React, {useMemo} from 'react'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  filterMatchesByScope,
  useStatsScope,
} from '@/context/StatsScopeContext'
import MatchDateItem from './MatchDateItem'
import {MiniSeasonChips} from '@/components/mini-leagues/MiniSeasonChips'
import StatsScopeChips from '@/components/Statistics/StatsScopeChips'
import {useTranslation} from 'react-i18next'
import {useStatColors} from '@/components/PlayerStatistics/statUi'

type MatchDate = {
  date: string
  matches: {
    match_id: number
    match_status_id: number
    match_date: string
    home_team_name: string
    away_team_name: string
    home_frames: number
    away_frames: number
    tournament_id?: number
  }[]
}

export type SeasonSelection = ReturnType<typeof useLeagueSeasonSelection>

export default function CompletedMatchesOther({
  seasonSelection,
}: {
  /** Share a parent's season chips state instead of owning one. */
  seasonSelection?: SeasonSelection
}) {
  const {GetCompletedMatchesBySeason} = useSeason()
  const {state} = useLeagueContext()
  const {scope} = useStatsScope()
  const ownSelection = useLeagueSeasonSelection()
  const {seasons, seasonId, setSeasonId, pastSeasonId} =
    seasonSelection ?? ownSelection
  const season = pastSeasonId ?? state.season
  const [matchDates, setMatchDates] = React.useState<MatchDate[]>([])
  const {t} = useTranslation()
  const colors = useStatColors()
  const [loadedSeason, setLoadedSeason] = React.useState<number | null>(null)
  const listContentStyle = useTabListContentContainerStyle()
  const pageBg = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'].background
  const isMounted = loadedSeason !== null
  const isLoading = loadedSeason !== season

  const filteredMatchDates = useMemo(() => {
    return matchDates
      .map(group => ({
        ...group,
        matches: filterMatchesByScope(
          // Completed tab: never surface unfinished fixtures from the season API.
          group.matches.filter(m => Number(m.match_status_id) === 3),
          scope,
        ),
      }))
      .filter(group => group.matches.length > 0)
  }, [matchDates, scope])

  React.useEffect(() => {
    let cancelled = false
    const getCompletedMatches = async () => {
      try {
        const res = await GetCompletedMatchesBySeason(season)
        if (!cancelled) setMatchDates(res?.data ?? [])
      } catch (e) {
        console.log(e)
      } finally {
        if (!cancelled) setLoadedSeason(season)
      }
    }
    getCompletedMatches()
    return () => {
      cancelled = true
    }
  }, [season])

  if (!isMounted) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{backgroundColor: pageBg}}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    )
  }

  return (
    <FlatList
      style={{backgroundColor: pageBg, flex: 1}}
      data={isLoading ? [] : filteredMatchDates}
      contentContainerStyle={listContentStyle}
      renderItem={({item}) => <MatchDateItem date={item} />}
      keyExtractor={(item, index) => `${index.toString()}_${item.date}`}
      ListHeaderComponent={
        <View style={{paddingHorizontal: 16, paddingTop: 8}}>
          <MiniSeasonChips
            seasons={seasons}
            seasonId={seasonId}
            onSelect={setSeasonId}
          />
          <StatsScopeChips />
        </View>
      }
      ListEmptyComponent={() =>
        isLoading ? (
          <View className="p-4 items-center justify-center">
            <ActivityIndicator color="#0a7ea4" />
          </View>
        ) : (
          <View className="p-4 items-center justify-center">
            <View className="p-2">
              <Text style={{fontSize: 15, color: colors.text}}>
                {t('no_completed_matches')}
              </Text>
            </View>
          </View>
        )
      }
    />
  )
}
