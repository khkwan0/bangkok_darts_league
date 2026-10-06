import React, {useEffect, useState} from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import config from '@/config'
import {useLeague} from '@/hooks'
import {useTranslation} from 'react-i18next'
import {router, useNavigation} from 'expo-router'
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
  location?: string
  logo?: string | null
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

function VenueRow({item, index}: {item: Venue; index: number}) {
  const {t} = useTranslation()
  const accent = ACCENTS[index % ACCENTS.length]
  const teamCount = item.teams.length
  const teamsLabel = `${teamCount} ${
    teamCount === 1 ? t('team') : t('teams')
  }`.toLowerCase()

  return (
    <View style={styles.rowWrap}>
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/Settings/Venues/Venue',
            params: {params: JSON.stringify({venueId: item.id})},
          })
        }
        style={({pressed}) => ({
          opacity: pressed ? 0.92 : 1,
          transform: [{scale: pressed ? 0.985 : 1}],
        })}>
        <View style={styles.board}>
          <View style={[styles.stripe, {backgroundColor: accent}]} />
          <View style={styles.row}>
            {item.logo ? (
              <View style={styles.logoWell}>
                <Image
                  source={{uri: config.logoUrl + item.logo}}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={[styles.iconWell, {backgroundColor: `${accent}22`}]}>
                <Text style={[styles.initial, {color: accent}]}>
                  {(item.name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.rowBody}>
              <Text style={styles.venueName} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={styles.chipsWrap}>
                <Chip
                  icon="account-group"
                  label={teamsLabel}
                  color={accent}
                  background={`${accent}22`}
                />
                {item.location ? (
                  <Chip
                    icon="map-outline"
                    label={item.location}
                    color="#E2E8F0"
                    background="rgba(148,163,184,0.16)"
                  />
                ) : null}
              </View>
            </View>
            <MCI name="chevron-right" size={22} color="rgba(226,232,240,0.45)" />
          </View>
        </View>
      </Pressable>
    </View>
  )
}

export default function Venues() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const league = useLeague()
  const {t} = useTranslation()
  const navigation = useNavigation()
  const {state} = useLeagueContext()
  const currentSeason = state.season

  useEffect(() => {
    navigation.setOptions({
      title: t('venues'),
    })
  }, [navigation, t])

  useEffect(() => {
    async function loadVenues() {
      try {
        const response = await league.GetVenues()
        const list = Array.isArray(response) ? response : []
        const seasonId = Number(currentSeason)
        const filteredVenues = list
          .map((venue: Venue) => ({
            ...venue,
            teams:
              venue.teams?.filter(
                (team: Team) => Number(team.season_id) === seasonId,
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

  const ListHeader = () => (
    <View style={styles.headerWrap}>
      <View style={styles.board}>
        <View style={[styles.stripe, {backgroundColor: '#8B5CF6'}]} />
        <View style={styles.chipsWrap}>
          <Chip
            icon="calendar"
            label={`${t('season')} ${currentSeason}`}
            color="#E2E8F0"
            background="rgba(148,163,184,0.16)"
          />
          <Chip
            icon="map-marker-radius"
            label={`${venues.length} ${t('venues').toLowerCase()}`}
            color="#A78BFA"
            background="rgba(139,92,246,0.22)"
          />
        </View>
      </View>
    </View>
  )

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
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.mutedText}>{t('loading')}</Text>
      </View>
    )
  }

  if (venues.length === 0) {
    return (
      <View style={[styles.centered, {padding: 32}]}>
        {ScreenBackdrop}
        <View style={styles.emptyIcon}>
          <MCI name="map-marker-off" size={32} color="#A78BFA" />
        </View>
        <Text style={styles.emptyTitle}>{t('no_venues_with_teams')}</Text>
        <Text style={styles.emptySubtitle}>{t('check_back_later')}</Text>
      </View>
    )
  }

  return (
    <View style={{flex: 1, backgroundColor: '#0B1220'}}>
      {ScreenBackdrop}
      <FlatList
        data={venues}
        renderItem={({item, index}) => <VenueRow item={item} index={index} />}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  headerWrap: {
    marginBottom: 16,
  },
  rowWrap: {
    marginBottom: 14,
  },
  board: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    backgroundColor: 'rgba(15,23,42,0.92)',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingLeft: 18,
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWell: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  logoWell: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    overflow: 'hidden',
  },
  logo: {
    width: 40,
    height: 40,
  },
  initial: {
    fontSize: 18,
    fontWeight: '800',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  venueName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,92,246,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: 'rgba(226,232,240,0.55)',
    fontSize: 13,
    textAlign: 'center',
  },
})
