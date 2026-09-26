import CompletedMatch from '@/components/Completed/CompletedMatch'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {
  MiniSeasonChips,
  useMiniSeasonSelection,
} from '@/components/mini-leagues/MiniSeasonChips'
import {Colors} from '@/constants/Colors'
import {useMiniLeagues} from '@/hooks/useMiniLeagues'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import React from 'react'
import {ActivityIndicator, FlatList, useColorScheme} from 'react-native'

type CompletedMatchType = {
  match_id: number
  date: string
  original_date: string
  home_team_name: string
  away_team_name: string
  home_frames: number
  away_frames: number
}

export function MiniLeagueCompleted({miniLeagueId}: {miniLeagueId: number}) {
  const api = useMiniLeagues()
  const [matches, setMatches] = React.useState<CompletedMatchType[]>([])
  const [refreshing, setRefreshing] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)
  const listContentStyle = useTabListContentContainerStyle()
  const pageBg = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'].background
  const {seasons, seasonId, setSeasonId} = useMiniSeasonSelection(miniLeagueId)

  const load = React.useCallback(async () => {
    setRefreshing(true)
    try {
      const opts =
        seasonId != null && Number(seasonId) > 0
          ? {season_id: Number(seasonId)}
          : undefined
      const res = await api.listMatches(miniLeagueId, opts)
      if (res?.status === 'ok') {
        const completed = (res.data || [])
          .filter((m: any) => Number(m.status_id) === 3)
          .map(
            (m: any): CompletedMatchType => ({
              match_id: m.id,
              date: m.date,
              original_date: m.original_date || '',
              home_team_name: m.home_team_name || 'Home',
              away_team_name: m.away_team_name || 'Away',
              home_frames: Number(m.home_frames) || 0,
              away_frames: Number(m.away_frames) || 0,
            }),
          )
        setMatches(completed)
      }
    } finally {
      setRefreshing(false)
      setIsMounted(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miniLeagueId, seasonId])

  React.useEffect(() => {
    load()
  }, [load])

  return (
    <View className="flex-1" style={{backgroundColor: pageBg}}>
      {!isMounted ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          style={{backgroundColor: pageBg}}
          data={matches}
          keyExtractor={item => item.match_id.toString()}
          ListHeaderComponent={
            <View className="px-4 pt-2">
              <MiniSeasonChips
                seasons={seasons}
                seasonId={seasonId}
                onSelect={setSeasonId}
              />
            </View>
          }
          renderItem={({item, index}) => (
            <CompletedMatch item={item} index={index} />
          )}
          refreshing={refreshing}
          onRefresh={load}
          contentContainerClassName="py-4"
          contentContainerStyle={listContentStyle}
          ListEmptyComponent={
            <Text className="text-center opacity-60 mt-10 px-4">
              no_completed_matches
            </Text>
          }
          ListFooterComponent={<View className="h-4" />}
        />
      )}
    </View>
  )
}
