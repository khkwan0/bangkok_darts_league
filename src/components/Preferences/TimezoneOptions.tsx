import {useAccount} from '@/hooks/useAccount'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  COMMON_TIMEZONES,
  getDeviceTimeZone,
  isValidTimeZone,
  resolvePreferredTimeZone,
} from '@/lib/bangkokTime'
import {ThemedText as Text} from '@/components/ThemedText'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from 'react-native'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'

export default function TimezoneOptions() {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const account = useAccount()
  const {state} = useLeagueContext()
  const preferred = resolvePreferredTimeZone(state.user?.preferences)
  const [selected, setSelected] = React.useState(preferred)
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const deviceTz = React.useMemo(() => getDeviceTimeZone(), [])

  const options = React.useMemo(() => {
    const opts = [...COMMON_TIMEZONES]
    if (deviceTz && isValidTimeZone(deviceTz) && !opts.some(o => o.value === deviceTz)) {
      opts.unshift({value: deviceTz, label: `${deviceTz} (device)`})
    }
    if (
      selected &&
      isValidTimeZone(selected) &&
      !opts.some(o => o.value === selected)
    ) {
      opts.unshift({value: selected, label: selected})
    }
    return opts
  }, [deviceTz, selected])

  React.useEffect(() => {
    setSelected(preferred)
  }, [preferred])

  async function save(next: string) {
    if (!isValidTimeZone(next)) {
      setMessage(t('timezone_save_failed'))
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await account.SetTimezone(next)
      if (res?.status === 'ok') {
        setSelected(next)
        setMessage(t('timezone_saved'))
      } else {
        setMessage(t('timezone_save_failed'))
      }
    } catch {
      setMessage(t('timezone_save_failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className="flex-1" style={{backgroundColor: colors.background}}>
      <ScrollView contentContainerClassName="p-4 pb-10">
        <Text className="mb-4 text-sm opacity-70" style={{color: colors.text}}>
          {t('timezone_settings_description')}
        </Text>

        <Pressable
          disabled={saving || !deviceTz}
          onPress={() => void save(deviceTz)}
          className="mb-4 rounded-xl border px-4 py-3"
          style={{
            borderColor: colors.border,
            backgroundColor: colors.card,
            opacity: saving ? 0.6 : 1,
          }}>
          <Text className="text-base font-medium" style={{color: colors.text}}>
            {t('timezone_use_device')}
          </Text>
          <Text className="mt-1 text-xs opacity-70" style={{color: colors.text}}>
            {deviceTz}
          </Text>
        </Pressable>

        <View
          className="overflow-hidden rounded-xl"
          style={{backgroundColor: colors.card}}>
          {options.map((opt, index) => {
            const active = selected === opt.value
            return (
              <Pressable
                key={opt.value}
                disabled={saving}
                onPress={() => void save(opt.value)}
                className={
                  index < options.length - 1 ? 'border-b px-4 py-3.5' : 'px-4 py-3.5'
                }
                style={{borderColor: colors.border}}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text
                      className="text-base"
                      style={{color: colors.text, fontWeight: active ? '600' : '400'}}>
                      {opt.label}
                    </Text>
                    {opt.label !== opt.value ? (
                      <Text
                        className="mt-0.5 text-xs opacity-60"
                        style={{color: colors.text}}>
                        {opt.value}
                      </Text>
                    ) : null}
                  </View>
                  {active ? (
                    <MCI
                      name="check"
                      size={22}
                      color={
                        typeof colors.primary === 'string'
                          ? colors.primary
                          : '#2563eb'
                      }
                    />
                  ) : null}
                </View>
              </Pressable>
            )
          })}
        </View>

        {saving ? (
          <ActivityIndicator className="mt-4" color={colors.text} />
        ) : null}
        {message ? (
          <Text className="mt-4 text-sm" style={{color: colors.text}}>
            {message}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  )
}
