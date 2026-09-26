import {useEffect, useState} from 'react'
import {Image, ScrollView, Linking, Pressable} from 'react-native'
import {ThemedView as View} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeague} from '@/hooks'
import {useTranslation} from 'react-i18next'
import {useLocalSearchParams, useNavigation, router} from 'expo-router'
import config from '@/config'
import {useTheme} from "expo-router/react-navigation"
import {useLeagueContext} from '@/context/LeagueContext'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import Feather from '@expo/vector-icons/Feather'

type Team = {
  id: number
  name: string
  season_id: number
}

type Venue = {
  id: number
  name: string
  teams: Team[]
  logo?: string
  location?: string
  latitude?: number
  longitude?: number
  plus?: string
  phone?: string
  email?: string
  website?: string
}

const ContactItem = ({
  icon,
  text,
  onPress,
  type,
}: {
  icon: React.ReactNode
  text: string
  onPress?: () => void
  type?: 'link' | 'text'
}) => {
  const {colors} = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center py-2">
      <View className="w-8 mr-2">{icon}</View>
      <Text
        className={type === 'link' ? 'text-blue-500' : ''}
        style={type === 'link' ? {textDecorationLine: 'underline'} : {}}>
        {text}
      </Text>
    </Pressable>
  )
}

export default function Venue() {
  const [venue, setVenue] = useState<Venue | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const params = useLocalSearchParams()
  const {t} = useTranslation()
  const navigation = useNavigation()
  const league = useLeague()
  const {colors} = useTheme()
  const {state} = useLeagueContext()
  const currentSeason = state.season

  // Parse the venue ID from params
  const venueId = params.params
    ? JSON.parse(params.params as string).venueId
    : null

  useEffect(() => {
    navigation.setOptions({
      title: venue?.name || t('venue'),
    })
  }, [navigation, venue, t])

  useEffect(() => {
    async function loadVenueDetails() {
      if (!venueId) return

      try {
        const response = await league.GetVenues()
        const venueData = response.find((v: Venue) => v.id === venueId)
        if (venueData) {
          const filteredTeams =
            venueData.teams?.filter(
              (team: Team) => team.season_id === currentSeason,
            ) || []
          setVenue({...venueData, teams: filteredTeams})
        }
      } catch (error) {
        console.error('Failed to load venue details:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadVenueDetails()
  }, [venueId, currentSeason])

  const handleOpenMaps = () => {
    if (venue?.latitude && venue?.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`
      Linking.openURL(url)
    } else if (venue?.plus) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        venue.plus,
      )}`
      Linking.openURL(url)
    }
  }

  const handleCall = () => {
    if (venue?.phone) {
      Linking.openURL(`tel:${venue.phone}`)
    }
  }

  const handleEmail = () => {
    if (venue?.email) {
      Linking.openURL(`mailto:${venue.email}`)
    }
  }

  const handleWebsite = () => {
    if (venue?.website) {
      Linking.openURL(venue.website)
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>{t('loading')}</Text>
      </View>
    )
  }

  if (!venue) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-center text-gray-500">
          {t('venue_not_found')}
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView className="flex-1">
        {/* Header Section */}
        <View className="bg-white dark:bg-gray-800 rounded-b-[32px] shadow-sm px-6 pt-6 pb-8 mb-6">
          {/* Venue Logo and Name */}
          <View className="items-center">
            {venue.logo ? (
              <Image
                source={{uri: config.logoUrl + venue.logo}}
                className="w-32 h-32 mb-4 rounded-2xl shadow-lg"
                resizeMode="contain"
              />
            ) : (
              <View className="w-32 h-32 mb-4 bg-gray-100 dark:bg-gray-700 rounded-2xl items-center justify-center shadow-lg">
                <Text className="text-4xl font-bold text-gray-500 dark:text-gray-400">
                  {venue.name.charAt(0)}
                </Text>
              </View>
            )}
            <Text className="text-2xl font-bold text-center mb-1">
              {venue.name}
            </Text>
          </View>

          {/* Contact Information */}
          <View className="mt-6">
            <View className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
              {(venue.location ||
                (venue.latitude && venue.longitude) ||
                venue.plus) && (
                <ContactItem
                  icon={
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                      <MCI
                        name="map-marker-radius"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                  }
                  text={
                    venue.location
                      ? venue.location
                      : venue.latitude && venue.longitude
                        ? `${venue.latitude}, ${venue.longitude}`
                        : venue.plus || ''
                  }
                  onPress={handleOpenMaps}
                  type="link"
                />
              )}
              {venue.phone && (
                <ContactItem
                  icon={
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                      <Feather name="phone" size={20} color={colors.primary} />
                    </View>
                  }
                  text={venue.phone}
                  onPress={handleCall}
                  type="link"
                />
              )}
              {venue.email && (
                <ContactItem
                  icon={
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                      <MCI name="email" size={20} color={colors.primary} />
                    </View>
                  }
                  text={venue.email}
                  onPress={handleEmail}
                  type="link"
                />
              )}
              {venue.website && (
                <ContactItem
                  icon={
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                      <MCI name="web" size={20} color={colors.primary} />
                    </View>
                  }
                  text={venue.website}
                  onPress={handleWebsite}
                  type="link"
                />
              )}
            </View>
          </View>
        </View>

        {/* Teams Section */}
        <View className="px-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold" style={{color: colors.primary}}>
              {t('teams')}
            </Text>
            <View className="bg-primary/10 px-4 py-1.5 rounded-full">
              <Text className="font-medium text-primary">
                {venue.teams.length.toString()}
              </Text>
            </View>
          </View>

          {venue.teams.length > 0 ? (
            <View className="space-y-3">
              {venue.teams.map(team => (
                <Pressable
                  key={team.id}
                  onPress={() =>
                    router.push({
                      pathname: './Venue/Team',
                      params: {params: JSON.stringify({teamId: team.id})},
                    })
                  }
                  className="active:opacity-70 my-2">
                  <View className="flex-row items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                    <View className="flex-row items-center space-x-4">
                      <View className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full items-center justify-center">
                        <Text className="text-xl font-semibold text-gray-500 dark:text-gray-400">
                          {team.name.charAt(0)}
                        </Text>
                      </View>
                      <Text className="text-lg font-medium">{team.name}</Text>
                    </View>
                    <MCI
                      name="chevron-right"
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="bg-white dark:bg-gray-800 rounded-xl p-8 items-center">
              <View className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full items-center justify-center mb-4">
                <MCI
                  name="account-group"
                  size={32}
                  color={colors.text}
                  style={{opacity: 0.5}}
                />
              </View>
              <Text className="text-center text-gray-500 text-lg">
                {t('no_teams_in_current_season')}
              </Text>
            </View>
          )}
        </View>
        <View className="h-8" />
      </ScrollView>
    </View>
  )
}
