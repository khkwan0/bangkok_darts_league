import React, {useEffect, useState} from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native'
import {Image} from 'expo-image'
import {LinearGradient} from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import {ThemedText as Text} from '@/components/ThemedText'
import {useAccount, useLeague} from '@/hooks'
import {useTranslation} from 'react-i18next'
import {useLocalSearchParams, useNavigation, router} from 'expo-router'
import {useTheme} from 'expo-router/react-navigation'
import {useLeagueContext} from '@/context/LeagueContext'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {
  venueInitial,
  venueLogoRecyclingKey,
  venueLogoSource,
} from '@/lib/venueLogo'

type Team = {
  id: number
  name: string
  season_id: number
  status_id?: number
}

type Venue = {
  id: number
  name: string
  teams: Team[]
  logo?: string
  modified?: string | null
  location?: string
  latitude?: number
  longitude?: number
  plus?: string
  phone?: string
  email?: string
  website?: string
}

function MetaPill({
  icon,
  label,
  color,
  background,
  border,
}: {
  icon: React.ComponentProps<typeof MCI>['name']
  label: string
  color: string
  background: string
  border: string
}) {
  return (
    <View
      className="flex-row items-center"
      style={[styles.metaPill, {backgroundColor: background, borderColor: border}]}>
      <MCI name={icon} size={13} color={color} />
      <Text className="ml-1 text-xs font-semibold" style={{color}} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

function VenueHero({
  venue,
  seasonLabel,
  teamsLabel,
  locationText,
  isFavorite,
  onToggleFavorite,
}: {
  venue: Venue
  seasonLabel: string
  teamsLabel: string
  locationText: string
  isFavorite: boolean
  onToggleFavorite: () => void
}) {
  const {colors} = useTheme()
  const {t} = useTranslation()
  const isDark = (useColorScheme() ?? 'light') === 'dark'
  const wash = isDark
    ? (['rgba(59,130,246,0.28)', 'rgba(15,23,42,0)'] as const)
    : (['rgba(16,68,153,0.14)', 'rgba(255,255,255,0)'] as const)
  const pillBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(16,68,153,0.08)'
  const pillBorder = isDark ? 'rgba(148,163,184,0.28)' : 'rgba(16,68,153,0.16)'
  const logoWell = isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF'
  const starColor = isFavorite ? '#F59E0B' : colors.text
  const logoOpts = {
    logo: venue.logo,
    venueId: venue.id,
    modified: venue.modified,
  }
  const logoSource = venueLogoSource(logoOpts)

  return (
    <View
      className="mb-6 overflow-hidden rounded-2xl"
      style={[styles.heroCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
      <LinearGradient
        colors={[...wash]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={StyleSheet.absoluteFill}
      />
      <View className="flex-row items-center px-4 pt-4 pb-3">
        <View
          style={[
            styles.logoWell,
            {
              backgroundColor: logoWell,
              borderColor: isDark
                ? 'rgba(148,163,184,0.28)'
                : 'rgba(15,23,42,0.08)',
            },
          ]}>
          {logoSource ? (
            <Image
              source={logoSource}
              style={styles.logo}
              contentFit="contain"
              cachePolicy="disk"
              recyclingKey={venueLogoRecyclingKey(logoOpts)}
            />
          ) : (
            <Text className="text-3xl font-bold" style={{color: colors.primary}}>
              {venueInitial(venue.name)}
            </Text>
          )}
        </View>
        <View className="ml-3.5 flex-1" style={{minWidth: 0}}>
          <Text
            type="defaultSemiBold"
            style={{color: colors.text}}
            numberOfLines={2}>
            {venue.name}
          </Text>
          {locationText ? (
            <View className="mt-1 flex-row items-center">
              <MCI
                name="map-marker-outline"
                size={14}
                color={colors.text}
                style={{opacity: 0.55}}
              />
              <Text
                className="ml-1 flex-1 text-sm opacity-60"
                style={{color: colors.text}}
                numberOfLines={1}>
                {locationText}
              </Text>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite ? t('unfavorite_venue') : t('favorite_venue')
          }
          accessibilityState={{selected: isFavorite}}
          hitSlop={10}
          onPress={onToggleFavorite}
          style={({pressed}) => [
            styles.favoriteButton,
            {
              backgroundColor: isFavorite
                ? 'rgba(245,158,11,0.16)'
                : isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(15,23,42,0.06)',
              opacity: pressed ? 0.85 : 1,
              transform: [{scale: pressed ? 0.94 : 1}],
            },
          ]}>
          <MCI
            name={isFavorite ? 'star' : 'star-outline'}
            size={36}
            color={starColor}
          />
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2 px-4 pb-4">
        <MetaPill
          icon="calendar-month-outline"
          label={seasonLabel}
          color={colors.text}
          background={pillBg}
          border={pillBorder}
        />
        <MetaPill
          icon="account-group-outline"
          label={teamsLabel}
          color={colors.primary}
          background={pillBg}
          border={pillBorder}
        />
      </View>
    </View>
  )
}

type ContactRowProps = {
  icon: React.ComponentProps<typeof MCI>['name']
  label: string
  value: string
  onPress?: () => void
  showDivider?: boolean
}

function ContactRow({
  icon,
  label,
  value,
  onPress,
  showDivider = true,
}: ContactRowProps) {
  const {colors} = useTheme()
  const interactive = Boolean(onPress)
  const [pressed, setPressed] = React.useState(false)

  return (
    <Pressable
      disabled={!interactive}
      accessibilityRole={interactive ? 'button' : undefined}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      style={{
        borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: colors.border,
        backgroundColor: pressed && interactive ? colors.border : 'transparent',
      }}>
      <View className="flex-row items-center px-4 py-3.5">
        <MCI name={icon} size={22} color={colors.text} />
        <View className="ml-3 mr-2 flex-1" style={{minWidth: 0}}>
          <Text
            className="text-xs font-semibold opacity-60"
            style={{color: colors.text}}>
            {label}
          </Text>
          <Text
            className="text-base"
            style={{color: interactive ? colors.primary : colors.text}}
            numberOfLines={2}
            selectable={!interactive}>
            {value}
          </Text>
        </View>
        {interactive ? (
          <MCI name="chevron-right" size={22} color={colors.text} />
        ) : null}
      </View>
    </Pressable>
  )
}

function TeamRow({
  team,
  showDivider,
}: {
  team: Team
  showDivider: boolean
}) {
  const {colors} = useTheme()
  const [pressed, setPressed] = React.useState(false)

  return (
    <Pressable
      accessibilityRole="button"
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() =>
        router.push({
          pathname: './Venue/Team',
          params: {params: JSON.stringify({teamId: team.id})},
        })
      }
      style={{
        borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: colors.border,
        backgroundColor: pressed ? colors.border : 'transparent',
      }}>
      <View className="flex-row items-center justify-between px-4 py-3.5">
        <Text
          className="mr-3 flex-1 text-base"
          style={{color: colors.text}}
          numberOfLines={2}>
          {team.name}
        </Text>
        <MCI name="chevron-right" size={22} color={colors.text} />
      </View>
    </Pressable>
  )
}

export default function Venue() {
  const [venue, setVenue] = useState<Venue | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const params = useLocalSearchParams()
  const {t} = useTranslation()
  const navigation = useNavigation()
  const league = useLeague()
  const account = useAccount()
  const {colors} = useTheme()
  const {state} = useLeagueContext()
  const currentSeason = state.season
  const favoriteVenueIds = Array.isArray(state.user?.preferences?.favorite_venues)
    ? state.user.preferences.favorite_venues.map(Number)
    : []

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
      if (!venueId) {
        setIsLoading(false)
        setError(true)
        return
      }

      try {
        setError(false)
        const response = await league.GetVenues()
        const list = Array.isArray(response) ? response : []
        const seasonId = Number(currentSeason)
        const venueData = list.find((v: Venue) => v.id === venueId)
        if (venueData) {
          const filteredTeams =
            venueData.teams?.filter(
              (team: Team) =>
                Number(team.season_id) === seasonId &&
                Number(team.status_id) === 1,
            ) || []
          setVenue({...venueData, teams: filteredTeams})
        } else {
          setVenue(null)
          setError(true)
        }
      } catch (err) {
        console.error('Failed to load venue details:', err)
        setError(true)
      } finally {
        setIsLoading(false)
      }
    }

    loadVenueDetails()
  }, [venueId, currentSeason])

  const handleOpenMaps = () => {
    if (venue?.latitude && venue?.longitude) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`,
      )
    } else if (venue?.plus) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.plus)}`,
      )
    } else if (venue?.location) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.location)}`,
      )
    }
  }

  const handleOpenWebsite = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    void Linking.openURL(url)
  }

  async function handleToggleFavorite() {
    if (!venue?.id) return
    if (!state.user?.id) {
      router.push({pathname: '/Auth', params: {from: '/Settings/Venues/Venue'}})
      return
    }
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {
      // Haptics unavailable on some platforms / simulators.
    }
    await account.ToggleFavoriteVenue(venue.id)
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{backgroundColor: colors.background}}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-3 opacity-70" style={{color: colors.text}}>
          {t('loading')}
        </Text>
      </View>
    )
  }

  if (error || !venue) {
    return (
      <View
        className="flex-1 items-center justify-center p-6"
        style={{backgroundColor: colors.background}}>
        <Text
          className="text-center text-base font-semibold"
          style={{color: colors.text}}>
          {t('venue_not_found')}
        </Text>
      </View>
    )
  }

  const locationText = venue.location
    ? venue.location
    : venue.latitude && venue.longitude
      ? `${venue.latitude}, ${venue.longitude}`
      : venue.plus || ''
  const canOpenMaps = Boolean(
    (venue.latitude && venue.longitude) || venue.plus || venue.location,
  )
  const teamCount = venue.teams.length

  const contactRows: Array<{
    key: string
    icon: React.ComponentProps<typeof MCI>['name']
    label: string
    value: string
    onPress?: () => void
  }> = []

  if (locationText) {
    contactRows.push({
      key: 'address',
      icon: 'map-marker-outline',
      label: t('venue_address'),
      value: locationText,
      onPress: canOpenMaps ? handleOpenMaps : undefined,
    })
  }
  if (venue.phone) {
    contactRows.push({
      key: 'phone',
      icon: 'phone-outline',
      label: t('phone'),
      value: venue.phone,
      onPress: () => Linking.openURL(`tel:${venue.phone}`),
    })
  }
  if (venue.email) {
    contactRows.push({
      key: 'email',
      icon: 'email-outline',
      label: t('email'),
      value: venue.email,
      onPress: () => Linking.openURL(`mailto:${venue.email}`),
    })
  }
  if (venue.website) {
    contactRows.push({
      key: 'web',
      icon: 'web',
      label: t('venue_website'),
      value: venue.website.replace(/^https?:\/\//i, ''),
      onPress: () => handleOpenWebsite(venue.website!),
    })
  }

  return (
    <ScrollView
      className="flex-1"
      style={{backgroundColor: colors.background}}
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}>
      <VenueHero
        venue={venue}
        locationText={locationText}
        seasonLabel={`${t('season')} ${currentSeason}`}
        teamsLabel={`${teamCount} ${
          teamCount === 1 ? t('team') : t('teams')
        }`}
        isFavorite={favoriteVenueIds.includes(Number(venue.id))}
        onToggleFavorite={handleToggleFavorite}
      />

      <View className="mb-6">
        <Text
          className="mb-2 text-sm font-semibold opacity-70"
          style={{color: colors.text}}>
          {t('schedules')}
        </Text>
        <View
          className="overflow-hidden rounded-xl"
          style={{backgroundColor: colors.card}}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/Settings/Venues/Venue/Matches' as any,
                params: {
                  params: JSON.stringify({
                    venueId: venue.id,
                    venueName: venue.name,
                  }),
                },
              })
            }
            style={({pressed}) => ({
              backgroundColor: pressed ? colors.border : 'transparent',
            })}>
            <View className="flex-row items-center px-4 py-3.5">
              <MCI name="calendar-month-outline" size={22} color={colors.text} />
              <Text
                className="ml-3 mr-2 flex-1 text-base"
                style={{color: colors.text}}>
                {t('matches')}
              </Text>
              <MCI name="chevron-right" size={22} color={colors.text} />
            </View>
          </Pressable>
        </View>
      </View>

      {contactRows.length > 0 ? (
        <View className="mb-6">
          <Text
            className="mb-2 text-sm font-semibold opacity-70"
            style={{color: colors.text}}>
            {t('general')}
          </Text>
          <View
            className="overflow-hidden rounded-xl"
            style={{backgroundColor: colors.card}}>
            {contactRows.map((row, index) => (
              <ContactRow
                key={row.key}
                icon={row.icon}
                label={row.label}
                value={row.value}
                onPress={row.onPress}
                showDivider={index < contactRows.length - 1}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View className="mb-6">
        <Text
          className="mb-2 text-sm font-semibold opacity-70"
          style={{color: colors.text}}>
          {t('teams')}
        </Text>
        {teamCount > 0 ? (
          <View
            className="overflow-hidden rounded-xl"
            style={{backgroundColor: colors.card}}>
            {venue.teams.map((team, index) => (
              <TeamRow
                key={team.id}
                team={team}
                showDivider={index < venue.teams.length - 1}
              />
            ))}
          </View>
        ) : (
          <View
            className="rounded-xl px-4 py-5"
            style={{backgroundColor: colors.card}}>
            <Text
              className="text-center text-sm opacity-60"
              style={{color: colors.text}}>
              {t('no_teams_in_current_season')}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  heroCard: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  favoriteButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  logoWell: {
    width: 76,
    height: 76,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  metaPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
  },
})
