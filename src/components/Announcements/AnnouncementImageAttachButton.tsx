import {ThemedText as Text} from '@/components/ThemedText'
import {buildAnnouncementImageEmbed} from '@/lib/announcementContent'
import {useAnnouncements} from '@/hooks/useAnnouncements'
import {useLeagueContext} from '@/context/LeagueContext'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as ImagePicker from 'expo-image-picker'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {ActivityIndicator, Alert, Pressable, useColorScheme} from 'react-native'

type AnnouncementImageAttachButtonProps = {
  onInsert: (snippet: string) => void
  disabled?: boolean
}

export function AnnouncementImageAttachButton({
  onInsert,
  disabled = false,
}: AnnouncementImageAttachButtonProps) {
  const {t} = useTranslation()
  const {adminUploadImage} = useAnnouncements()
  const {apiUrl} = useLeagueContext()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const [uploading, setUploading] = React.useState(false)
  const accent = isDark ? '#60a5fa' : '#1565C0'

  async function handlePress() {
    if (disabled || uploading || !apiUrl) return

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert(
          t('forums_image_permission_title'),
          t('forums_image_permission_body'),
        )
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
      })

      if (result.canceled || !result.assets?.[0]?.uri) {
        return
      }

      setUploading(true)
      const upload = await adminUploadImage(result.assets[0].uri)

      if (upload.status === 'ok' && upload.url) {
        onInsert(buildAnnouncementImageEmbed(apiUrl, upload.url))
        return
      }

      Alert.alert(t('forums_image_upload_failed'))
    } catch (e) {
      console.error(e)
      Alert.alert(t('forums_image_upload_failed'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || uploading}
      className="flex-row items-center self-start rounded-full px-3 py-2"
      style={{
        backgroundColor: isDark
          ? 'rgba(148, 163, 184, 0.12)'
          : 'rgba(148, 163, 184, 0.14)',
        opacity: disabled || uploading ? 0.55 : 1,
      }}>
      {uploading ? (
        <ActivityIndicator size="small" color={accent} style={{marginRight: 8}} />
      ) : (
        <MCI name="image-plus" size={18} color={accent} style={{marginRight: 8}} />
      )}
      <Text className="text-sm font-semibold" style={{color: accent}}>
        {uploading
          ? t('forums_image_uploading')
          : t('announcements_insert_image')}
      </Text>
    </Pressable>
  )
}
