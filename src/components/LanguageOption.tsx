import {View, Pressable} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView} from '@/components/ThemedView'
import {useTheme} from 'expo-router/react-navigation'
import {useTranslation} from 'react-i18next'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import React from 'react'

const LANGUAGES = [
  {
    code: 'en',
    flag: '🇬🇧',
    primaryKey: 'english_in_english',
    secondaryKey: 'english_in_thai',
  },
  {
    code: 'th',
    flag: '🇹🇭',
    primaryKey: 'thai_in_thai',
    secondaryKey: 'thai_in_english',
  },
  {
    code: 'zh',
    flag: '🇨🇳',
    primaryKey: 'chinese_in_chinese',
    secondaryKey: 'chinese_in_english',
  },
  {
    code: 'ja',
    flag: '🇯🇵',
    primaryKey: 'japanese_in_japanese',
    secondaryKey: 'japanese_in_english',
  },
] as const

export default function LanguageOption({
  handleLanguageOption,
  currentLanguage,
}: {
  handleLanguageOption: (lang: string) => void
  currentLanguage?: string | null
}) {
  const {colors} = useTheme()
  const {t} = useTranslation()

  return (
    <ThemedView className="mb-6 p-4 rounded-xl">
      <Text className="text-lg font-semibold mb-4">{t('language')}</Text>
      <View className="bg-gray-800/20 rounded-xl p-4">
        <View className="space-y-2">
          {LANGUAGES.map(lang => {
            const selected = currentLanguage === lang.code
            const color = selected ? colors.primary : colors.text
            return (
              <Pressable
                key={lang.code}
                onPress={() => handleLanguageOption(lang.code)}
                className="p-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1 pr-3">
                    <Text style={{fontSize: 28, lineHeight: 34}}>
                      {lang.flag}
                    </Text>
                    <View className="flex-1">
                      <Text style={{color}}>{t(lang.primaryKey)}</Text>
                      <Text className="text-sm opacity-60" style={{color}}>
                        {t(lang.secondaryKey)}
                      </Text>
                    </View>
                  </View>
                  {selected && (
                    <MCI name="check" size={20} color={colors.primary} />
                  )}
                </View>
              </Pressable>
            )
          })}
        </View>
      </View>
    </ThemedView>
  )
}
