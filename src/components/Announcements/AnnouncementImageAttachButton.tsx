import {ThemedText as Text} from '@/components/ThemedText'
import {
  ANNOUNCEMENT_MAX_VIDEO_BYTES,
  buildAnnouncementImageEmbed,
  buildAnnouncementVideoEmbed,
} from '@/lib/announcementContent'
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

function isVideoAsset(asset: ImagePicker.ImagePickerAsset): boolean {
  if (asset.type === 'video') return true
  if (asset.mimeType?.startsWith('video/')) return true
  const name = (asset.fileName ?? asset.uri).toLowerCase()
  return /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(name)
}

export function AnnouncementImageAttachButton({
  onInsert,
  disabled = false,
}: AnnouncementImageAttachButtonProps) {
  const {t} = useTranslation()
  const {adminUploadImage, adminUploadVideo} = useAnnouncements()
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
          t('announcements_media_permission_body'),
        )
        return
      }

      // Pick from Photos / Gallery — includes OS screen recordings after you save them.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 1,
        allowsEditing: false,
      })

      if (result.canceled || !result.assets?.[0]?.uri) {
        return
      }

      const asset = result.assets[0]
      const isVideo = isVideoAsset(asset)

      if (
        isVideo &&
        typeof asset.fileSize === 'number' &&
        asset.fileSize > ANNOUNCEMENT_MAX_VIDEO_BYTES
      ) {
        Alert.alert(t('announcements_video_too_large_title'), t('announcements_video_too_large_body'))
        return
      }

      setUploading(true)
      const upload = isVideo
        ? await adminUploadVideo(asset.uri, {
            mimeType: asset.mimeType,
            fileName: asset.fileName,
          })
        : await adminUploadImage(asset.uri)

      if (upload.status === 'ok' && upload.url) {
        onInsert(
          isVideo
            ? buildAnnouncementVideoEmbed(apiUrl, upload.url)
            : buildAnnouncementImageEmbed(apiUrl, upload.url),
        )
        return
      }

      if (upload.status === 'error' && upload.error === 'file_too_large') {
        Alert.alert(
          t('announcements_video_too_large_title'),
          t('announcements_video_too_large_body'),
        )
        return
      }

      Alert.alert(t('announcements_media_upload_failed'))
    } catch (e) {
      console.error(e)
      Alert.alert(t('announcements_media_upload_failed'))
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
          ? t('announcements_media_uploading')
          : t('announcements_insert_media')}
      </Text>
    </Pressable>
  )
}
