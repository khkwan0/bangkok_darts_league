import React, {useEffect, useState} from 'react'
import {ActivityIndicator, Pressable, View, useColorScheme} from 'react-native'
import {useTranslation} from 'react-i18next'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {ThemedText as Text} from '@/components/ThemedText'
import TextInput from '@/components/TextInput'
import {useTeams} from '@/hooks'

type TeamNameEditProps = {
  teamId: number
  initialName: string
  initialShortName: string
  initialVeryShortName: string
  onSaved?: (names: {
    name: string
    short_name: string
    very_short_name: string
  }) => void
}

export default function TeamNameEdit({
  teamId,
  initialName,
  initialShortName,
  initialVeryShortName,
  onSaved,
}: TeamNameEditProps) {
  const {t} = useTranslation()
  const teams = useTeams()
  const colorScheme = useColorScheme()
  const [expanded, setExpanded] = useState(false)
  const [name, setName] = useState(initialName)
  const [shortName, setShortName] = useState(initialShortName)
  const [veryShortName, setVeryShortName] = useState(initialVeryShortName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    setName(initialName)
    setShortName(initialShortName)
    setVeryShortName(initialVeryShortName)
  }, [initialName, initialShortName, initialVeryShortName])

  const handleSave = async () => {
    const trimmedName = name.trim()
    const trimmedShort = shortName.trim()
    if (!trimmedName) {
      setError('team_name_required')
      setStatus('')
      return
    }
    if (!trimmedShort) {
      setError('team_short_name_required')
      setStatus('')
      return
    }

    setSaving(true)
    setError('')
    setStatus('')
    try {
      const res = await teams.UpdateTeamNames(teamId, {
        name: trimmedName,
        short_name: trimmedShort,
        very_short_name: veryShortName.trim(),
      })
      if (res?.status === 'ok') {
        const saved = {
          name: res.name ?? trimmedName,
          short_name: res.short_name ?? trimmedShort,
          very_short_name: res.very_short_name ?? trimmedShort,
        }
        setName(saved.name)
        setShortName(saved.short_name)
        setVeryShortName(saved.very_short_name)
        setStatus('team_names_updated')
        onSaved?.(saved)
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
        accessibilityLabel={t('edit_team_names')}>
        <Text type="defaultSemiBold" className="text-lg flex-1">
          {t('edit_team_names')}
        </Text>
        <MCI
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={chevronColor}
        />
      </Pressable>

      {expanded ? (
        <View className="px-4 pb-4">
          <Text className="mb-1 font-medium">{t('team_name')}</Text>
          <TextInput
            className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3 bg-white dark:bg-gray-900"
            value={name}
            onChangeText={setName}
            placeholder={t('enter_team_name')}
          />

          <Text className="mb-1 font-medium">{t('team_short_name')}</Text>
          <TextInput
            className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3 bg-white dark:bg-gray-900"
            value={shortName}
            onChangeText={setShortName}
            placeholder={t('enter_team_short_name')}
          />

          <Text className="mb-1 font-medium">
            {t('team_very_short_name')}{' '}
            <Text className="text-gray-500 italic">({t('optional')})</Text>
          </Text>
          <TextInput
            className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3 bg-white dark:bg-gray-900"
            value={veryShortName}
            onChangeText={setVeryShortName}
            placeholder={t('team_very_short_name_hint')}
          />

          {error ? (
            <Text className="mb-2 text-red-600">{t(error)}</Text>
          ) : null}
          {status ? (
            <Text className="mb-2 text-green-700 dark:text-green-400">
              {t(status)}
            </Text>
          ) : null}

          <Pressable
            onPress={handleSave}
            disabled={saving}
            className={`rounded-lg p-3 items-center ${
              saving ? 'bg-blue-300' : 'bg-blue-500'
            }`}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-medium">{t('save_names')}</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}
