/*
import React from 'react'
import {FlatList, RefreshControl} from 'react-native'
import {Pressable} from 'react-native'
import {ThemedView as View} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'
import {useAccount, useLeague} from '@/hooks'
import {useNavigation, useFocusEffect, useTheme} from 'expo-router/react-navigation'
import {router} from 'expo-router'
import {useTranslation} from 'react-i18next'
import AppCheckbox from '@/components/AppCheckbox'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useLeagueContext} from '@/context/LeagueContext'

type TeamType = {
  id: number
  name: string
  division_short_name: string
  total_players: number
}

type TeamCardPropType = {
  idx: number
  team: TeamType
}

function TeamCard({team, idx}: TeamCardPropType) {
  const {colors} = useTheme()
  const bgColor = idx % 2 ? colors.teamCard : colors.teamCardAlt

  function HandlePress() {
    router.push({pathname: '/Settings/Teams/Team', params: {team: team.id}})
  }

  return (
    <Pressable onPress={() => HandlePress()}>
      <View style={{backgroundColor: bgColor, padding: 15}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <View>
            <Text>{team.name}</Text>
            <Text>{team.division_short_name}</Text>
          </View>
          <View>
            <Text>{team.total_players} players &gt;</Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
}

export default function TeamsHome() {
  const {colors} = useTheme()
  const league = useLeague()
  const [teams, setTeams] = React.useState([])
  const [refreshing, setRefreshing] = React.useState(false)
  const [showMineOnly, setShowMineOnly] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)
  const {state, dispatch} = useLeagueContext()
  const user = state.user
  const {t} = useTranslation()
  const account = useAccount()
  const navigation = useNavigation()

  const userTeams =
    typeof user?.teams !== 'undefined'
      ? user?.teams.map((_team: TeamType) => _team.id)
      : []

  async function GetTeams() {
    try {
      setRefreshing(true)
      const res = await league.GetTeams()
      if (showMineOnly) {
        const _teams = res.filter((team: TeamType) =>
          userTeams.includes(team.id),
        )
        setTeams(_teams)
      } else {
        setTeams(res)
      }
      setIsMounted(true)
    } catch (e) {
      console.log(e)
    } finally {
      setRefreshing(false)
    }
  }

  async function GetShowMineOnly() {
    try {
      const fromStorage = await AsyncStorage.getItem('my_teams_only')
      if (typeof fromStorage !== 'undefined' && fromStorage) {
        const temp = JSON.parse(fromStorage)
        if (
          typeof temp !== 'undefined' &&
          typeof temp.showMineOnly !== 'undefined' &&
          typeof user.id !== 'undefined' &&
          user.id
        ) {
          setShowMineOnly(temp.showMineOnly)
        } else {
          setShowMineOnly(false)
        }
      }
    } catch (e) {
      console.log(e)
    } finally {
      setIsMounted(true)
    }
  }

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setIsMounted(false)
    })
    return unsubscribe
  }, [navigation])

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      GetShowMineOnly()
    })
    return unsubscribe
  }, [navigation])

  React.useEffect(() => {
    ;(async () => {
      if (isMounted) {
        await GetTeams()
      }
    })()
  }, [isMounted])

  React.useEffect(() => {
    if (isMounted) {
      GetTeams()
    }
  }, [showMineOnly])

  async function onRefresh() {
    await GetTeams()
  }

  async function HandleSetShowMineOnly() {
    await AsyncStorage.setItem(
      'my_teams_only',
      JSON.stringify({showMineOnly: !showMineOnly}),
    )
    setShowMineOnly(s => !s)
  }

  React.useEffect(() => {
    account.FetchUser()
  }, [teams])

  if (isMounted) {
    return (
      <FlatList
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            {typeof user?.teams !== 'undefined' && user.teams.length > 0 && (
              <View className="my-10 px-10">
                <AppCheckbox
                  label={t('show_my_teams')}
                  value={showMineOnly}
                  onValueChange={value => {
                    AsyncStorage.setItem(
                      'my_teams_only',
                      JSON.stringify({showMineOnly: value}),
                    )
                    setShowMineOnly(value)
                  }}
                />
              </View>
            )}
          </View>
        }
        contentContainerStyle={{backgroundColor: colors.background}}
        data={teams.sort((a: TeamType, b: TeamType) =>
          a.name > b.name ? 1 : -1,
        )}
        renderItem={({item, index}) => <TeamCard team={item} idx={index} />}
      />
    )
  } else {
    return null
  }
}
*/
import TeamList from '@/components/Teams'
import {useNavigation} from 'expo-router'
import React from 'react'

export default function TeamsHome() {
  const navigation = useNavigation()

  React.useEffect(() => {
    navigation.setOptions({
      title: 'Teams',
    })
  }, [])

  return <TeamList />
}
