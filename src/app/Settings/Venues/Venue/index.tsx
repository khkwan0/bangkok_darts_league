import React, {useEffect, useState} from 'react'
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeague} from '@/hooks'
import {useTranslation} from 'react-i18next'
import {useLocalSearchParams, useNavigation, router} from 'expo-router'
import config from '@/config'
import {useLeagueContext} from '@/context/LeagueContext'
import {LinearGradient} from 'expo-linear-gradient'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'

const ACCENTS = [
  '#3B82F6',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#F43F5E',
  '#8B5CF6',
] as const

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

function Chip({
  icon,
  label,
  color,
  background,
}: {
  icon: React.ComponentProps<typeof MCI>['name']
  label: string
  color: string
  background: string
}) {
  return (
    <View style={[styles.chip, {backgroundColor: background}]}>
      <MCI name={icon} size={13} color={color} />
      <Text style={[styles.chipText, {color}]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

function ContactRow({
  icon,
  label,
  value,
  accent,
  onPress,
}: {
  icon: React.ComponentProps<typeof MCI>['name']
  label: string
  value: string
  accent: string
  onPress?: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({pressed}) => [
        styles.contactRow,
        {opacity: pressed && onPress ? 0.85 : 1},
      ]}>
      <View style={[styles.contactIcon, {backgroundColor: `${accent}22`}]}>
        <MCI name={icon} size={18} color={accent} />
      </View>
      <View style={{flex: 1, minWidth: 0}}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text
          style={[styles.contactValue, onPress ? styles.contactLink : null]}
          numberOfLines={2}>
          {value}
        </Text>
      </View>
      {onPress ? (
        <MCI name="open-in-new" size={16} color="rgba(226,232,240,0.45)" />
      ) : null}
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
  const {state} = useLeagueContext()
  const currentSeason = state.season
  const accent = ACCENTS[0]

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
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`,
      )
    } else if (venue?.plus) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.plus)}`,
      )
    }
  }

  const ScreenBackdrop = (
    <LinearGradient
      colors={['#0B1220', '#111827', '#0F172A']}
      locations={[0, 0.55, 1]}
      start={{x: 0.2, y: 0}}
      end={{x: 0.9, y: 1}}
      style={StyleSheet.absoluteFillObject}
    />
  )

  if (isLoading) {
    return (
      <View style={styles.centered}>
        {ScreenBackdrop}
        <ActivityIndicator size="large" color={accent} />
        <Text style={styles.mutedText}>{t('loading')}</Text>
      </View>
    )
  }

  if (!venue) {
    return (
      <View style={[styles.centered, {padding: 24}]}>
        {ScreenBackdrop}
        <Text style={styles.emptyTitle}>{t('venue_not_found')}</Text>
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

  return (
    <View style={{flex: 1, backgroundColor: '#0B1220'}}>
      {ScreenBackdrop}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.board}>
          <View style={[styles.stripe, {backgroundColor: accent}]} />

          <View style={styles.hero}>
            {venue.logo ? (
              <View style={styles.logoRing}>
                <Image
                  source={{uri: config.logoUrl + venue.logo}}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={[styles.logoRing, styles.logoPlaceholder]}>
                <Text style={styles.logoLetter}>
                  {venue.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.venueTitle}>{venue.name}</Text>
            <View style={styles.chipsWrap}>
              <Chip
                icon="calendar"
                label={`${t('season')} ${currentSeason}`}
                color="#E2E8F0"
                background="rgba(148,163,184,0.16)"
              />
              <Chip
                icon="account-group"
                label={`${teamCount} ${t('teams').toLowerCase()}`}
                color={accent}
                background={`${accent}22`}
              />
            </View>
          </View>

          {(locationText || venue.phone || venue.email || venue.website) && (
            <View style={styles.contactCard}>
              {locationText ? (
                <ContactRow
                  icon="map-marker-radius"
                  label={t('venue_address')}
                  value={locationText}
                  accent="#F59E0B"
                  onPress={canOpenMaps ? handleOpenMaps : undefined}
                />
              ) : null}
              {venue.phone ? (
                <ContactRow
                  icon="phone"
                  label={t('phone')}
                  value={venue.phone}
                  accent="#10B981"
                  onPress={() => Linking.openURL(`tel:${venue.phone}`)}
                />
              ) : null}
              {venue.email ? (
                <ContactRow
                  icon="email"
                  label={t('email')}
                  value={venue.email}
                  accent="#06B6D4"
                  onPress={() => Linking.openURL(`mailto:${venue.email}`)}
                />
              ) : null}
              {venue.website ? (
                <ContactRow
                  icon="web"
                  label={t('venue_website')}
                  value={venue.website}
                  accent="#8B5CF6"
                  onPress={() =>
                    venue.website ? Linking.openURL(venue.website) : undefined
                  }
                />
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('teams')}</Text>
          <Chip
            icon="shield-outline"
            label={String(teamCount)}
            color={accent}
            background={`${accent}22`}
          />
        </View>

        {teamCount > 0 ? (
          venue.teams.map((team, index) => {
            const teamAccent = ACCENTS[index % ACCENTS.length]
            return (
              <Pressable
                key={team.id}
                onPress={() =>
                  router.push({
                    pathname: './Venue/Team',
                    params: {params: JSON.stringify({teamId: team.id})},
                  })
                }
                style={({pressed}) => ({
                  opacity: pressed ? 0.92 : 1,
                  transform: [{scale: pressed ? 0.985 : 1}],
                  marginBottom: 10,
                })}>
                <View style={styles.teamBoard}>
                  <View
                    style={[styles.stripe, {backgroundColor: teamAccent}]}
                  />
                  <View style={styles.teamRow}>
                    <View
                      style={[
                        styles.teamMark,
                        {backgroundColor: `${teamAccent}22`},
                      ]}>
                      <Text style={[styles.teamLetter, {color: teamAccent}]}>
                        {team.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.teamName} numberOfLines={2}>
                      {team.name}
                    </Text>
                    <MCI
                      name="chevron-right"
                      size={22}
                      color="rgba(226,232,240,0.45)"
                    />
                  </View>
                </View>
              </Pressable>
            )
          })
        ) : (
          <View style={styles.emptyTeams}>
            <MCI
              name="account-group-outline"
              size={28}
              color="rgba(226,232,240,0.45)"
            />
            <Text style={styles.emptyTeamsText}>
              {t('no_teams_in_current_season')}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  board: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    backgroundColor: 'rgba(15,23,42,0.92)',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    paddingLeft: 18,
    marginBottom: 20,
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  logoRing: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    marginBottom: 4,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 16,
  },
  logoPlaceholder: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  logoLetter: {
    fontSize: 36,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  venueTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  contactCard: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    backgroundColor: 'rgba(2,6,23,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  contactIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    color: 'rgba(226,232,240,0.55)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  contactValue: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '600',
  },
  contactLink: {
    color: '#93C5FD',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  teamBoard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    backgroundColor: 'rgba(15,23,42,0.92)',
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingLeft: 16,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  teamLetter: {
    fontSize: 18,
    fontWeight: '800',
  },
  teamName: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyTeams: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    backgroundColor: 'rgba(15,23,42,0.92)',
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyTeamsText: {
    color: 'rgba(226,232,240,0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedText: {
    marginTop: 14,
    color: 'rgba(226,232,240,0.7)',
    fontSize: 14,
  },
  emptyTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
})
