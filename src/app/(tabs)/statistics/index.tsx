/* eslint-disable react-hooks/exhaustive-deps */
import PlayerStatistics from '@/components/PlayerStatistics'
import {AdaptiveSplit} from '@/components/layout/AdaptiveSplit'
import {EmptySplitDetail} from '@/components/layout/EmptySplitDetail'
import LeagueStandings from '@/components/Statistics/LeagueStandings'
import HighlightsExplorer from '@/components/Statistics/Highlights'
import LeaguePlayerStatistics from '@/components/Statistics/PlayerStatistics'
import PlayerRankings from '@/components/Statistics/PlayerRankings'
import StatShortcuts, {
  type StatShortcutKey,
} from '@/components/Statistics/StatShortcuts'
import {useStatColors} from '@/components/PlayerStatistics/statUi'
import {useStatsScope} from '@/context/StatsScopeContext'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {MiniLeagueStats} from '@/components/mini-leagues/MiniLeagueStats'
import {
  MiniSeasonChips,
  useMiniSeasonSelection,
} from '@/components/mini-leagues/MiniSeasonChips'
import {useLeagueContext} from '@/context/LeagueContext'
import {useIsRegularLayout} from '@/hooks/useLayoutMode'
import {useLeague} from '@/hooks/useLeague'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import {isMiniCompetition} from '@/types/competition'
import type {PlayerInfo} from '@/types/player'
import TeamStatistics from '@/app/(tabs)/statistics/TeamStatistics'
import {Ionicons} from '@expo/vector-icons'
import {useTheme} from 'expo-router/react-navigation'
import {router, type Href} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View as RNView,
} from 'react-native'

type StatsPaneKey = 'me' | StatShortcutKey

function MiniStatsWithSeason({miniLeagueId}: {miniLeagueId: number}) {
  const {seasons, seasonId, setSeasonId} = useMiniSeasonSelection(miniLeagueId)
  return (
    <RNView className="flex-1">
      <RNView className="px-4 pt-3">
        <MiniSeasonChips
          seasons={seasons}
          seasonId={seasonId}
          onSelect={setSeasonId}
        />
      </RNView>
      <MiniLeagueStats miniLeagueId={miniLeagueId} seasonId={seasonId} />
    </RNView>
  )
}

function GuestStatisticsHome() {
  const listContentStyle = useTabListContentContainerStyle({
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  })
  const isRegular = useIsRegularLayout()
  const {t} = useTranslation()
  const [selectedShortcut, setSelectedShortcut] =
    React.useState<StatShortcutKey>('standings')

  const handleShortcut = React.useCallback(
    (key: StatShortcutKey, href: Href) => {
      if (isRegular) {
        setSelectedShortcut(key)
        return
      }
      router.push(href)
    },
    [isRegular],
  )

  if (!isRegular) {
    return (
      <View className="flex-1">
        <ScrollView contentContainerStyle={listContentStyle}>
          <Text type="title" className="mb-2">
            stats_home_title
          </Text>
          <Text className="mb-5" style={{opacity: 0.72}}>
            stats_home_subtitle
          </Text>
          <StatShortcuts variant="grid" showSignIn />
        </ScrollView>
      </View>
    )
  }

  return (
    <AdaptiveSplit
      listWidth={300}
      list={
        <ScrollView
          contentContainerStyle={{paddingBottom: 24}}
          style={{flex: 1}}>
          <RNView style={{paddingHorizontal: 16, paddingTop: 16}}>
            <Text type="title" style={{fontSize: 22, marginBottom: 4}}>
              {t('stats_home_title')}
            </Text>
            <Text style={{opacity: 0.65, marginBottom: 8, fontSize: 13}}>
              {t('stats_home_subtitle')}
            </Text>
          </RNView>
          <StatShortcuts
            variant="list"
            showSignIn
            onSelectShortcut={handleShortcut}
            selectedKey={selectedShortcut}
          />
        </ScrollView>
      }
      detail={<StatsDetailPane pane={selectedShortcut} />}
      emptyDetail={<EmptySplitDetail message={t('select_an_item')} />}
    />
  )
}

function MyStatsPane({
  playerInfo,
  isLoading,
  error,
}: {
  playerInfo: PlayerInfo | null
  isLoading: boolean
  error: string
}) {
  const statColors = useStatColors()

  if (isLoading || (!playerInfo && !error)) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={statColors.accent} />
      </View>
    )
  }
  if (error && !playerInfo) {
    return (
      <View className="flex-1 justify-center px-6">
        <Text style={{textAlign: 'center', color: statColors.muted}}>
          {error}
        </Text>
      </View>
    )
  }
  if (!playerInfo) return null
  return <PlayerStatistics playerInfo={playerInfo} path="/statistics" />
}

function StatsDetailPane({
  pane,
  playerInfo,
  isLoading,
  error,
}: {
  pane: StatsPaneKey
  playerInfo?: PlayerInfo | null
  isLoading?: boolean
  error?: string
}) {
  switch (pane) {
    case 'me':
      return (
        <MyStatsPane
          playerInfo={playerInfo ?? null}
          isLoading={Boolean(isLoading)}
          error={error ?? ''}
        />
      )
    case 'standings':
      return <LeagueStandings embedded />
    case 'teams':
      return <TeamStatistics embedded />
    case 'players':
      return <LeaguePlayerStatistics embedded />
    case 'rankings':
      return <PlayerRankings />
    case 'highlights':
      return <HighlightsExplorer />
    default:
      return null
  }
}

function MeNavRow({
  selected,
  onPress,
}: {
  selected: boolean
  onPress: () => void
}) {
  const {t} = useTranslation()
  const colors = useStatColors()
  const accent = colors.accent

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected}}
      accessibilityLabel={t('my_statistics')}
      onPress={onPress}
      style={({pressed}) => ({
        opacity: pressed ? 0.85 : 1,
        marginHorizontal: 12,
        marginTop: 12,
        marginBottom: 4,
        borderRadius: 14,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? accent : colors.border,
        backgroundColor: selected
          ? colors.isDark
            ? 'rgba(10,126,164,0.22)'
            : 'rgba(10,126,164,0.1)'
          : colors.card,
      })}>
      <RNView
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 12,
          gap: 12,
        }}>
        <RNView
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.isDark
              ? 'rgba(10,126,164,0.28)'
              : 'rgba(10,126,164,0.14)',
          }}>
          <Ionicons name="person-circle" size={20} color={accent} />
        </RNView>
        <RNView style={{flex: 1, minWidth: 0}}>
          <Text
            numberOfLines={1}
            style={{fontSize: 15, fontWeight: '700', color: colors.text}}>
            {t('my_statistics')}
          </Text>
          <Text
            numberOfLines={1}
            style={{marginTop: 2, fontSize: 12, color: colors.muted}}>
            {t('stats_home_me_hint')}
          </Text>
        </RNView>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={selected ? accent : colors.muted}
        />
      </RNView>
    </Pressable>
  )
}

export default function StatisticsHome() {
  const league = useLeague()
  const [playerInfo, setPlayerInfo] = React.useState<PlayerInfo | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const {t} = useTranslation()
  const {state} = useLeagueContext()
  const {scope} = useStatsScope()
  const user = state.user
  const {colors} = useTheme()
  const isGuest = user?.id == null
  const isRegular = useIsRegularLayout()
  const [selectedPane, setSelectedPane] = React.useState<StatsPaneKey>('me')

  React.useEffect(() => {
    async function fetchPlayerInfo(userId: number) {
      try {
        setIsLoading(true)
        setError('')
        const info = await league.GetPlayerStatsInfo(userId)
        setPlayerInfo(info)
      } catch (e) {
        setError(t('failed_to_load_player_info'))
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    const userId = user?.id
    if (userId != null && !isMiniCompetition(state.competition)) {
      fetchPlayerInfo(userId)
    }
  }, [user?.id, state.competition, scope])

  const handleShortcut = React.useCallback(
    (key: StatShortcutKey, href: Href) => {
      if (isRegular) {
        setSelectedPane(key)
        return
      }
      router.push(href)
    },
    [isRegular],
  )

  if (isMiniCompetition(state.competition)) {
    return <MiniStatsWithSeason miniLeagueId={state.competition.id} />
  }

  if (isGuest) {
    return <GuestStatisticsHome />
  }

  if (!isRegular) {
    return (
      <View className="flex-1" style={{backgroundColor: colors.background}}>
        <StatShortcuts variant="compact" />
        <View className="flex-1" style={{backgroundColor: 'transparent'}}>
          <MyStatsPane
            playerInfo={playerInfo}
            isLoading={isLoading}
            error={error}
          />
        </View>
      </View>
    )
  }

  const shortcutSelected =
    selectedPane === 'me' ? null : (selectedPane as StatShortcutKey)

  return (
    <AdaptiveSplit
      listWidth={300}
      list={
        <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom: 28}}>
          <MeNavRow
            selected={selectedPane === 'me'}
            onPress={() => setSelectedPane('me')}
          />
          <StatShortcuts
            variant="list"
            onSelectShortcut={handleShortcut}
            selectedKey={shortcutSelected}
          />
        </ScrollView>
      }
      detail={
        <StatsDetailPane
          pane={selectedPane}
          playerInfo={playerInfo}
          isLoading={isLoading}
          error={error}
        />
      }
      emptyDetail={<EmptySplitDetail message={t('select_an_item')} />}
    />
  )
}
