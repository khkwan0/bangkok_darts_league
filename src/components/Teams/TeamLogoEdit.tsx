import React, {useEffect, useState} from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View,
  useColorScheme,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as ImagePicker from 'expo-image-picker'
import {ThemedText as Text} from '@/components/ThemedText'
import {useTeams} from '@/hooks'
import config from '@/config'

function resolveLogoUri(logo: string | null | undefined): string | null {
  if (!logo) return null
  const trimmed = logo.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return config.logoUrl + trimmed
}

type TeamLogoEditProps = {
  teamId: number
  initialLogo: string | null
  venueLogo?: string | null
  onSaved?: (logo: string | null) => void
}

export default function TeamLogoEdit({
  teamId,
  initialLogo,
  venueLogo,
  onSaved,
}: TeamLogoEditProps) {
  const {t} = useTranslation()
  const teams = useTeams()
  const colorScheme = useColorScheme()
  const [expanded, setExpanded] = useState(false)
  const [logo, setLogo] = useState<string | null>(initialLogo)
  const [history, setHistory] = useState<string[]>([])
  const [newLogoUri, setNewLogoUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    setLogo(initialLogo)
  }, [initialLogo])

  const loadHistory = async () => {
    try {
      const res = await teams.GetTeamLogoHistory(teamId)
      if (res?.status === 'ok') {
        if (typeof res.data?.current !== 'undefined') {
          setLogo(res.data.current ?? null)
        }
        if (Array.isArray(res.data?.history)) {
          setHistory(res.data.history)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (expanded) {
      void loadHistory()
    }
  }, [expanded, teamId])

  const displayUri =
    resolveLogoUri(newLogoUri ? null : logo) ||
    (newLogoUri ? null : resolveLogoUri(venueLogo))
  const isUsingVenueLogo = !logo && !newLogoUri && !!venueLogo

  const handleShowPicker = async (type: 'gallery' | 'camera') => {
    try {
      setError('')
      if (type === 'gallery') {
        await ImagePicker.requestMediaLibraryPermissionsAsync()
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
        })
        if (result.assets?.[0]?.uri) {
          setNewLogoUri(result.assets[0].uri)
        }
      } else {
        await ImagePicker.requestCameraPermissionsAsync()
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
        })
        if (result.assets?.[0]?.uri) {
          setNewLogoUri(result.assets[0].uri)
        }
      }
    } catch (e) {
      console.error(e)
      setError('server_error')
    }
  }

  const handleSaveNew = async () => {
    if (!newLogoUri || saving) return
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const res = await teams.UploadTeamLogo(teamId, newLogoUri)
      if (res?.status === 'ok' && res.filename) {
        setLogo(res.filename)
        setNewLogoUri(null)
        setStatus('team_logo_updated')
        onSaved?.(res.filename)
        await loadHistory()
      } else {
        setError(res?.error || 'server_error')
      }
    } catch (e) {
      console.error(e)
      setError('server_error')
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (filename: string) => {
    if (!filename || saving || filename === logo) return
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const res = await teams.RestoreTeamLogo(teamId, filename)
      if (res?.status === 'ok') {
        const next = res.filename ?? filename
        setLogo(next)
        setNewLogoUri(null)
        setStatus('team_logo_updated')
        onSaved?.(next)
        await loadHistory()
      } else {
        setError(res?.error || 'server_error')
      }
    } catch (e) {
      console.error(e)
      setError('server_error')
    } finally {
      setSaving(false)
    }
  }

  const chevronColor = colorScheme === 'dark' ? '#fff' : '#111'

  return (
    <View className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden">
      <Pressable
        onPress={() => setExpanded(prev => !prev)}
        className="flex-row items-center justify-between p-4"
        accessibilityRole="button"
        accessibilityState={{expanded}}
        accessibilityLabel={t('edit_team_logo')}>
        <Text type="defaultSemiBold" className="text-lg flex-1">
          {t('edit_team_logo')}
        </Text>
        <MCI
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={chevronColor}
        />
      </Pressable>

      {expanded ? (
        <View className="px-4 pb-4 items-center">
          {newLogoUri ? (
            <Image
              source={{uri: newLogoUri}}
              className="w-28 h-28 mb-3"
              resizeMode="contain"
            />
          ) : displayUri ? (
            <Image
              source={{uri: displayUri}}
              className="w-28 h-28 mb-3"
              resizeMode="contain"
            />
          ) : (
            <View className="w-28 h-28 mb-3 rounded-lg bg-gray-200 dark:bg-gray-700 items-center justify-center">
              <Text className="opacity-60">{t('upload_logo')}</Text>
            </View>
          )}

          {isUsingVenueLogo ? (
            <Text className="mb-3 text-amber-700 dark:text-amber-400 text-sm">
              {t('using_venue_logo')}
            </Text>
          ) : null}

          {error ? (
            <Text className="mb-2 text-red-600">{t(error)}</Text>
          ) : null}
          {status ? (
            <Text className="mb-2 text-green-700 dark:text-green-400">
              {t(status)}
            </Text>
          ) : null}

          {newLogoUri ? (
            <View className="w-full">
              <Pressable
                className="my-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-6 py-3 rounded-full items-center"
                onPress={() => setNewLogoUri(null)}
                disabled={saving}>
                <Text>{t('reset')}</Text>
              </Pressable>
              <Pressable
                className="my-2 bg-blue-500 px-6 py-3 rounded-full items-center"
                onPress={() => void handleSaveNew()}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white">{t('save')}</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View className="w-full">
              <Pressable
                className="my-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-6 py-3 rounded-full items-center"
                onPress={() => void handleShowPicker('gallery')}
                disabled={saving}>
                <Text>{t('gallery')}</Text>
              </Pressable>
              <Pressable
                className="my-2 bg-primary border border-gray-300 dark:border-gray-600 px-6 py-3 rounded-full items-center"
                onPress={() => void handleShowPicker('camera')}
                disabled={saving}>
                <Text className="text-white">{t('camera')}</Text>
              </Pressable>

              {history.length > 0 ? (
                <View className="mt-6">
                  <Text className="text-sm font-semibold mb-3 opacity-70">
                    {t('previous_logos')}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{gap: 12, paddingVertical: 4}}>
                    {history.map(filename => {
                      const uri = resolveLogoUri(filename)
                      if (!uri) return null
                      return (
                        <Pressable
                          key={filename}
                          disabled={saving}
                          onPress={() => void handleRestore(filename)}
                          className="h-20 w-20 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
                          <Image
                            source={{uri}}
                            className="h-20 w-20"
                            resizeMode="contain"
                          />
                        </Pressable>
                      )
                    })}
                  </ScrollView>
                  {saving ? (
                    <ActivityIndicator
                      className="mt-3"
                      size="small"
                      color="#4B5563"
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
    </View>
  )
}
