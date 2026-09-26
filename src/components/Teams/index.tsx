import AppCheckbox from '@/components/AppCheckbox'
import {useStatColors} from '@/components/PlayerStatistics/statUi'
import {MiniLeagueTeamsPanel} from '@/components/mini-leagues/MiniLeagueTeamsPanel'
import config from '@/config'
import {Colors} from '@/constants/Colors'
import {useLeagueContext} from '@/context/LeagueContext'
import {useLeague} from '@/hooks'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import {isMiniCompetition} from '@/types/competition'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {Ionicons} from '@expo/vector-icons'
import {router} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  FlatList,
  Image,
  Pressable,
  Text,
  useColorScheme,
  View,
} from 'react-native'

type TeamType = {
  id: number
  name: string
  short_name?: string
  total_players: number
  division_name?: string
  division_short_name: string
  venue_logo?: string | null
}

function TeamMark({team}: {team: TeamType}) {
  const colors = useStatColors()
  const letter = (team.short_name || team.name || '?').charAt(0).toUpperCase()
  if (team.venue_logo) {
    return (
      <Image
        source={{uri: config.logoUrl + team.venue_logo}}
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: colors.chip,
          marginRight: 12,
        }}
        resizeMode="contain"
      />
    )
  }
  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.chip,
        marginRight: 12,
      }}>
      <Text style={{fontSize: 20, fontWeight: '800', color: colors.accent}}>
        {letter}
      </Text>
    </View>
  )
}

function TeamCard({team}: {team: TeamType}) {
  const colors = useStatColors()
  const {t} = useTranslation()
  const division = team.division_name || team.division_short_name
  const count = team.total_players ?? 0
  const playersLabel = `${count} ${count === 1 ? t('player') : t('players')}`

  function handlePress() {
    router.push(
      {
        pathname: './Team',
        params: {params: JSON.stringify({teamId: team.id})},
      },
      {
        relativeToDirectory: true,
      },
    )
  }

  return (
    <View style={{paddingHorizontal: 16, paddingBottom: 12}}>
      <Pressable
        accessibilityRole="button"
        onPress={handlePress}
        style={({pressed}) => ({opacity: pressed ? 0.75 : 1})}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 14,
          }}>
          <TeamMark team={team} />
          <View style={{flex: 1, marginRight: 8}}>
            <Text
              numberOfLines={2}
              style={{fontSize: 16, fontWeight: '700', color: colors.text}}>
              {team.name}
            </Text>
            {division ? (
              <Text
                numberOfLines={1}
                style={{marginTop: 3, fontSize: 13, color: colors.muted}}>
                {division}
              </Text>
            ) : null}
            <Text style={{marginTop: 6, fontSize: 13, fontWeight: '600', color: colors.accent}}>
              {playersLabel}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
      </Pressable>
    </View>
  )
}

function TeamsHeader() {
  const colors = useStatColors()
  const {t} = useTranslation()
  return (
    <View style={{paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4}}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/teams/mini-leagues')}
        style={({pressed}) => ({opacity: pressed ? 0.75 : 1, marginBottom: 12})}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 14,
            gap: 12,
          }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.chip,
            }}>
            <Ionicons name="layers-outline" size={20} color={colors.accent} />
          </View>
          <View style={{flex: 1}}>
            <Text style={{fontSize: 16, fontWeight: '700', color: colors.text}}>
              {t('mini_leagues')}
            </Text>
            <Text style={{marginTop: 2, fontSize: 13, color: colors.muted}}>
              {t('mini_leagues_section_description')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
      </Pressable>
    </View>
  )
}

export default function TeamList() {
  const {state} = useLeagueContext()
  const user = state.user
  const [teams, setTeams] = React.useState<TeamType[]>([])
  const [refreshing, setRefreshing] = React.useState(false)
  const [showMineOnly, setShowMineOnly] = React.useState(
    typeof user.id !== 'undefined' ? true : false,
  )
  const league = useLeague()
  const {t} = useTranslation()
  const pageBg = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'].background
  const colors = useStatColors()
  const listContentStyle = useTabListContentContainerStyle({
    backgroundColor: pageBg,
  })

  const userTeams = React.useMemo(() => {
    return user.teams?.map((team: {id: number}) => team.id) || []
  }, [user.teams])

  async function getTeams() {
    try {
      setRefreshing(true)
      const response = await league.GetTeams()
      const sortedTeams = response.sort((a: TeamType, b: TeamType) =>
        a.name.localeCompare(b.name),
      )
      if (showMineOnly) {
        setTeams(
          sortedTeams.filter((team: TeamType) => userTeams.includes(team.id)),
        )
      } else {
        setTeams(sortedTeams)
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setRefreshing(false)
    }
  }

  async function handleSetShowMineOnly(value: boolean) {
    await AsyncStorage.setItem(
      'my_teams_only',
      JSON.stringify({showMineOnly: value}),
    )
    setShowMineOnly(value)
  }

  async function loadShowMineOnly() {
    try {
      if (user?.id) {
        const stored = await AsyncStorage.getItem('my_teams_only')
        if (stored) {
          const {showMineOnly: value} = JSON.parse(stored)
          setShowMineOnly(value)
        } else {
          if (user.teams && user.teams.length > 0) {
            setShowMineOnly(true)
          } else {
            setShowMineOnly(false)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load show mine only preference:', error)
    }
  }

  React.useEffect(() => {
    if (isMiniCompetition(state.competition)) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getTeams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMineOnly, state.competition])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadShowMineOnly()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isMiniCompetition(state.competition)) {
    return <MiniLeagueTeamsPanel miniLeagueId={state.competition.id} />
  }

  const signedIn = typeof user.id !== 'undefined'

  return (
    <View style={{flex: 1, backgroundColor: pageBg}}>
      <FlatList
        style={{backgroundColor: pageBg}}
        contentContainerStyle={listContentStyle}
        ListHeaderComponent={
          signedIn ? (
            <View>
              <TeamsHeader />
              <View style={{paddingHorizontal: 16, paddingBottom: 12}}>
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}>
                  <AppCheckbox
                    label={t('show_my_teams')}
                    value={showMineOnly}
                    onValueChange={handleSetShowMineOnly}
                  />
                </View>
              </View>
            </View>
          ) : null
        }
        data={teams}
        renderItem={({item}) => <TeamCard team={item} />}
        keyExtractor={item => item.id.toString()}
        refreshing={refreshing}
        onRefresh={getTeams}
      />
    </View>
  )
}
