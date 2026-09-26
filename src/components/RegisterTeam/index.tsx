import React, {useState} from 'react'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView} from '@/components/ThemedView'
import {useLeague} from '@/hooks/useLeague'
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import TextInput from '@/components/TextInput'
import {useTranslation} from 'react-i18next'
import {
  router,
  useNavigation,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'

// Define venue type
interface Venue {
  id: number
  name: string
}

export default function RegisterTeam() {
  const league = useLeague()
  const [venues, setVenues] = useState<Venue[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamShortName, setNewTeamShortName] = useState('')
  const [newTeamVeryShortName, setNewTeamVeryShortName] = useState('')
  const [newTeamVenueId, setNewTeamVenueId] = useState(0)
  const [err, setErr] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingVenues, setLoadingVenues] = useState(true)
  const {t} = useTranslation()
  const navigation = useNavigation()

  useFocusEffect(
    React.useCallback(() => {
      getVenues()
    }, []),
  )

  async function getVenues() {
    try {
      setLoadingVenues(true)
      const venues = await league.GetVenues()
      setVenues(venues)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingVenues(false)
    }
  }

  function handleCancel() {
    setNewTeamName('')
    setNewTeamShortName('')
    setNewTeamVeryShortName('')
    setNewTeamVenueId(0)
  }

  async function handleSave() {
    setStatus('')
    if (!newTeamName) {
      setErr('team_name_required')
    } else if (!newTeamVenueId) {
      setErr('venue_required')
    } else {
      try {
        setErr('')
        setLoading(true)
        const res = await league.SaveNewTeamV2(
          newTeamName,
          newTeamVenueId,
          newTeamShortName,
          newTeamVeryShortName,
        )
        if (typeof res.status !== 'undefined' && res.status === 'ok') {
          handleCancel()
          setStatus('team_created')
        } else {
          setErr(res.error)
        }
      } catch (e: unknown) {
        console.log(e)
        setErr(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
  }

  function navigateToAddVenue() {
    router.push('/Settings/RegisterTeam/AddNewVenue')
  }

  React.useEffect(() => {
    navigation.setOptions({
      title: t('register_team'),
    })
  }, [])

  return (
    <>
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
        <View className="p-4">
          <ThemedView className="rounded-xl shadow-sm p-5 mb-4">
            <Text className="text-2xl font-bold mb-4 text-center">
              {t('register_team')}
            </Text>

            <View className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex-row items-start">
              <Ionicons
                name="information-circle-outline"
                size={22}
                color="#b45309"
                style={{marginTop: 1}}
              />
              <Text className="ml-2 flex-1">
                {t('team_requires_admin_approval')}
              </Text>
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('team_name')}
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800"
                value={newTeamName}
                onChangeText={setNewTeamName}
                placeholder={t('enter_team_name')}
              />
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('team_short_name')}{' '}
                <Text className="text-gray-500 italic">
                  ({t('recommended')})
                </Text>
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800"
                value={newTeamShortName}
                onChangeText={setNewTeamShortName}
                placeholder={t('enter_team_short_name')}
              />
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('team_very_short_name')}{' '}
                <Text className="text-gray-500 italic">({t('optional')})</Text>
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800"
                value={newTeamVeryShortName}
                onChangeText={setNewTeamVeryShortName}
                placeholder={t('enter_team_very_short_name')}
              />
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('venue')}
              </Text>
              <View className="border border-gray-300 rounded-lg overflow-hidden mb-3">
                <TextInput
                  className="p-3 bg-gray-50 dark:bg-gray-800"
                  value={
                    venues.find(v => v.id === newTeamVenueId)?.name ||
                    t('select_venue')
                  }
                  editable={false}
                  rightIcon={Ionicons}
                  rightIconProps={{
                    name: 'close-circle-outline',
                    size: 24,
                  }}
                  onRightIconPress={() => {
                    setNewTeamVenueId(0)
                  }}
                />

                {loadingVenues ? (
                  <View className="py-4 items-center">
                    <ActivityIndicator size="small" color="#0000ff" />
                    <Text className="text-gray-500 mt-2">{t('loading')}</Text>
                  </View>
                ) : venues.length > 0 ? (
                  <ScrollView
                    className="max-h-[200px] border-t border-gray-200"
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled">
                    {venues.map(venue => (
                      <TouchableOpacity
                        key={venue.id}
                        className={`p-3 border-b border-gray-200 ${
                          venue.id === newTeamVenueId ? 'bg-blue-100' : ''
                        }`}
                        onPress={() => setNewTeamVenueId(venue.id)}>
                        <Text
                          style={
                            venue.id === newTeamVenueId ? {color: '#222'} : {}
                          }>
                          {venue.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View className="py-4 items-center">
                    <Text className="text-gray-500">{t('no_venues')}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                className="flex-row items-center justify-center bg-gray-200 p-3 rounded-lg"
                onPress={navigateToAddVenue}>
                <Ionicons name="add-circle-outline" size={18} color="#333" />
                <Text style={{color: '#333'}} className="ml-2 font-medium">
                  {t('add_new_venue')}
                </Text>
              </TouchableOpacity>
            </View>

            {err ? (
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <Text style={{color: '#f00'}}>{t(err)}</Text>
              </View>
            ) : null}

            {status ? (
              <View className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                <Text style={{color: '#000'}}>{t(status)}</Text>
              </View>
            ) : null}

            <View className="flex-row justify-between mt-2">
              <TouchableOpacity
                className="bg-gray-200 dark:bg-gray-800 py-3 px-6 rounded-lg flex-1 mr-2 items-center"
                onPress={handleCancel}
                disabled={loading}>
                <Text className="font-medium">{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`py-3 px-6 rounded-lg flex-1 ml-2 items-center ${
                  loading ? 'bg-blue-300' : 'bg-blue-500'
                }`}
                onPress={handleSave}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="font-medium text-white">{t('save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </ScrollView>
    </>
  )
}
