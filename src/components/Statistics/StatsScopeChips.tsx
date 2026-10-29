import {useStatsScope, type StatsScope} from '@/context/StatsScopeContext'
import {ThemedText as Text} from '@/components/ThemedText'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, ScrollView, View} from 'react-native'

const OPTIONS: {id: StatsScope; labelKey: string}[] = [
  {id: 'league', labelKey: 'stats_scope_league'},
  {id: 'cup', labelKey: 'stats_scope_cup'},
  {id: 'both', labelKey: 'stats_scope_both'},
]

export default function StatsScopeChips({
  hideBoth = false,
}: {
  hideBoth?: boolean
} = {}) {
  const {scope, setScope} = useStatsScope()
  const {colors} = useTheme()
  const {t} = useTranslation()
  const options = hideBoth
    ? OPTIONS.filter(opt => opt.id !== 'both')
    : OPTIONS

  React.useEffect(() => {
    if (hideBoth && scope === 'both') {
      setScope('league')
    }
  }, [hideBoth, scope, setScope])

  return (
    <View className="mb-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map(opt => {
          const active = scope === opt.id
          return (
            <Pressable
              key={opt.id}
              onPress={() => setScope(opt.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                marginRight: 8,
                backgroundColor: active ? colors.primary : colors.background,
                borderWidth: 1,
                borderColor: active ? colors.primary : '#8884',
              }}>
              <Text
                style={{
                  color: active ? '#fff' : colors.text,
                  fontWeight: active ? '700' : '500',
                  fontSize: 13,
                }}>
                {t(opt.labelKey)}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
