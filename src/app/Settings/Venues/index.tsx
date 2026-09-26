import {useEffect, useState} from 'react'
import {FlatList, Pressable, ActivityIndicator} from 'react-native'
import {ThemedView as View} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeague} from '@/hooks'
import {useTranslation} from 'react-i18next'
import {router, useNavigation} from 'expo-router'
import {useLeagueContext} from '@/context/LeagueContext'
import {useTheme} from "expo-router/react-navigation"
import {Ionicons} from '@expo/vector-icons'

type Team = {
  id: number
  name: string
  season_id: number
}

type Venue = {
  id: number
  name: string
  teams: Team[]
}

type Season = {
  id: number
  name: string
}

export default function Venues() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const league = useLeague()
  const {t} = useTranslation()
  const navigation = useNavigation()
  const {colors} = useTheme()
  const {state} = useLeagueContext()
  const currentSeason = state.season
  const user = state.user

  useEffect(() => {
    navigation.setOptions({
      title: t('venues'),
    })
  }, [navigation, t])

  useEffect(() => {
    async function loadVenues() {
      try {
        const response = await league.GetVenues()
        // Filter venues to only include those with teams in the current season
        const filteredVenues = response
          .map((venue: Venue) => ({
            ...venue,
            teams:
              venue.teams?.filter(
                (team: Team) => team.season_id === currentSeason,
              ) || [],
          }))
          .filter((venue: Venue) => venue.teams.length > 0)
        setVenues(filteredVenues)
      } catch (error) {
        console.error('Failed to load venues:', error)
      } finally {
        setIsLoading(false)
      }
    }
    if (currentSeason) {
      loadVenues()
    }
  }, [currentSeason])

  const renderVenue = ({item}: {item: Venue}) => (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/Settings/Venues/Venue',
          params: {params: JSON.stringify({venueId: item.id})},
        })
      }
      className="mb-3">
      <View className="flex-row justify-between items-center bg-gray-800/30 p-5 rounded-xl shadow-sm">
        <View className="flex-row items-center flex-1">
          <View className="bg-gray-700/50 p-2 rounded-lg mr-4">
            <Ionicons name="location" size={24} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-medium mb-1">{item.name}</Text>
            <Text className="text-sm opacity-60">
              {item.teams.length} {t('teams').toLowerCase()}
            </Text>
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.text}
          style={{opacity: 0.5}}
        />
      </View>
    </Pressable>
  )

  const ListHeader = () => (
    <View className="mb-6">
      <View className="bg-gray-800/30 rounded-xl p-5 shadow-sm">
        <View className="flex-row items-center mb-2">
          <View className="bg-gray-700/50 p-2 rounded-lg mr-3">
            <Ionicons name="calendar" size={20} color={colors.primary} />
          </View>
          <Text
            className="text-sm uppercase tracking-wider"
            style={{color: colors.primary}}>
            {t('season')} {currentSeason}
          </Text>
        </View>
      </View>
    </View>
  )

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-base opacity-60">{t('loading')}</Text>
      </View>
    )
  }

  if (venues.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <View className="bg-gray-800/20 p-4 rounded-full mb-4">
          <Ionicons name="alert-circle" size={32} color={colors.primary} />
        </View>
        <Text className="text-center text-base opacity-60 mb-2">
          {t('no_venues_with_teams')}
        </Text>
        <Text className="text-center text-sm opacity-40">
          {t('check_back_later')}
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 px-4 pt-4">
      <FlatList
        data={venues}
        renderItem={renderVenue}
        keyExtractor={item => item.id.toString()}
        contentContainerClassName="pb-6"
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}
