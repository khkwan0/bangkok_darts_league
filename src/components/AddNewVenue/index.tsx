import React, {useState} from 'react'
import {ThemedView} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeague} from '@/hooks/useLeague'
import {
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  View,
  Image,
  Alert,
  Platform,
} from 'react-native'
import TextInput from '@/components/TextInput'
import {useTranslation} from 'react-i18next'
import {router, useNavigation} from 'expo-router'
import {Ionicons} from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'

export default function AddNewVenue() {
  const league = useLeague()
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [venueShortName, setVenueShortName] = useState('')
  const [venuePhone, setVenuePhone] = useState('')
  const [venueEmail, setVenueEmail] = useState('')
  const [venueLineGroup, setVenueLineGroup] = useState('')
  const [venueWebsite, setVenueWebsite] = useState('')
  const [venueLatitude, setVenueLatitude] = useState('')
  const [venueLongitude, setVenueLongitude] = useState('')
  const [venuePlusCode, setVenuePlusCode] = useState('')
  const [logoImage, setLogoImage] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const {t} = useTranslation()
  const navigation = useNavigation()

  function handleCancel() {
    router.back()
  }

  const pickImage = async () => {
    // Request permission
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Sorry, we need camera roll permissions to upload images.',
      )
      return
    }

    // Launch image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    })

    if (!result.canceled && result.assets && result.assets[0]) {
      // Get the base64 representation of the image
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`
      setLogoImage(base64Image)
    }
  }

  async function handleSave() {
    if (!venueName) {
      setErr('venue_name_required')
    } else {
      try {
        setErr('')
        setLoading(true)
        const res = await league.SaveVenue({
          name: venueName,
          address: venueAddress,
          short_name: venueShortName,
          logo: logoImage,
          phone: venuePhone,
          email: venueEmail,
          line_group: venueLineGroup,
          website: venueWebsite,
          latitude: venueLatitude,
          longitude: venueLongitude,
          plus_code: venuePlusCode,
        })
        if (typeof res.status !== 'undefined' && res.status === 'ok') {
          router.back()
          router.setParams({
            params: JSON.stringify({
              refresh: 'true',
            }),
          })
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

  React.useEffect(() => {
    navigation.setOptions({
      title: t('add_new_venue'),
    })
  }, [])

  return (
    <>
      <ScrollView>
        <View className="p-4">
          <ThemedView className="bg-white rounded-xl shadow-sm p-5 mb-4">
            <Text className="text-2xl font-bold mb-6 text-center">
              {t('add_new_venue')}
            </Text>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('venue_name')}
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800"
                value={venueName}
                onChangeText={setVenueName}
                placeholder={t('enter_venue_name')}
              />
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('venue_address')}
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800"
                value={venueAddress}
                onChangeText={setVenueAddress}
                placeholder={t('enter_venue_address')}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{minHeight: 100}}
              />
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('venue_short_name')} ({t('optional')})
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800"
                value={venueShortName}
                onChangeText={setVenueShortName}
                placeholder={t('enter_venue_short_name')}
              />
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('venue_logo')} ({t('optional')})
              </Text>
              <View className="flex-row items-center">
                {logoImage ? (
                  <View className="mr-4">
                    <Image
                      source={{uri: logoImage}}
                      style={{width: 80, height: 80, borderRadius: 8}}
                    />
                  </View>
                ) : null}
                <TouchableOpacity
                  className="bg-blue-500 py-2 px-4 rounded-lg flex-row items-center"
                  onPress={pickImage}>
                  <Ionicons name="image-outline" size={20} color="white" />
                  <Text className="font-medium text-white ml-2">
                    {t('upload_logo')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('venue_phone')} ({t('optional')})
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800"
                value={venuePhone}
                onChangeText={setVenuePhone}
                placeholder={t('enter_venue_phone')}
                keyboardType="phone-pad"
              />
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('venue_email')} ({t('optional')})
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800"
                value={venueEmail}
                onChangeText={setVenueEmail}
                placeholder={t('enter_venue_email')}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('venue_line_group')} ({t('optional')})
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800"
                value={venueLineGroup}
                onChangeText={setVenueLineGroup}
                placeholder={t('enter_venue_line_group')}
              />
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('venue_website')} ({t('optional')})
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800"
                value={venueWebsite}
                onChangeText={setVenueWebsite}
                placeholder={t('enter_venue_website')}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('venue_latitude')} ({t('optional')})
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800"
                value={venueLatitude}
                onChangeText={setVenueLatitude}
                placeholder={t('enter_venue_latitude')}
                keyboardType="numeric"
              />
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('venue_longitude')} ({t('optional')})
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50 dark:bg-gray-800"
                value={venueLongitude}
                onChangeText={setVenueLongitude}
                placeholder={t('enter_venue_longitude')}
                keyboardType="numeric"
              />
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">
                {t('venue_plus_code')} ({t('optional')})
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-1 bg-gray-50"
                value={venuePlusCode}
                onChangeText={setVenuePlusCode}
                placeholder={t('enter_venue_plus_code')}
              />
            </View>

            {err ? (
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <Text className="text-red-600">{t(err)}</Text>
              </View>
            ) : null}

            <View className="flex-row justify-between mt-2">
              <TouchableOpacity
                className="bg-gray-200 py-3 px-6 rounded-lg flex-1 mr-2 items-center"
                onPress={handleCancel}
                disabled={loading}>
                <Text className="font-medium text-gray-700">{t('cancel')}</Text>
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
