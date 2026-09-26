import {View, Pressable} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView} from '@/components/ThemedView'
import {useTheme} from "expo-router/react-navigation"
import {useTranslation} from 'react-i18next'
import i18n from '@/i18n'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import React, {useEffect, useState} from 'react'

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
          <Pressable onPress={() => handleLanguageOption('en')} className="p-3">
            <View className="flex-row items-center justify-between">
              <View>
                <Text
                  style={{
                    color:
                      currentLanguage === 'en' ? colors.primary : colors.text,
                  }}>
                  {t('english_in_english')}
                </Text>
                <Text
                  className="text-sm opacity-60"
                  style={{
                    color:
                      currentLanguage === 'en' ? colors.primary : colors.text,
                  }}>
                  {t('english_in_thai')}
                </Text>
              </View>
              {currentLanguage === 'en' && (
                <MCI name="check" size={20} color={colors.primary} />
              )}
            </View>
          </Pressable>
          <Pressable onPress={() => handleLanguageOption('th')} className="p-3">
            <View className="flex-row items-center justify-between">
              <View>
                <Text
                  style={{
                    color:
                      currentLanguage === 'th' ? colors.primary : colors.text,
                  }}>
                  {t('thai_in_thai')}
                </Text>
                <Text
                  className="text-sm opacity-60"
                  style={{
                    color:
                      currentLanguage === 'th' ? colors.primary : colors.text,
                  }}>
                  {t('thai_in_english')}
                </Text>
              </View>
              {currentLanguage === 'th' && (
                <MCI name="check" size={20} color={colors.primary} />
              )}
            </View>
          </Pressable>
          <Pressable onPress={() => handleLanguageOption('cockney')} className="p-3">
            <View className="flex-row items-center justify-between">
              <View>
                <Text
                  style={{
                    color:
                      currentLanguage === 'cockney' ? colors.primary : colors.text,
                  }}>
                  {t('cockney_in_english')}
                </Text>
                <Text
                  className="text-sm opacity-60"
                  style={{
                    color:
                      currentLanguage === 'cockney' ? colors.primary : colors.text,
                  }}>
                  {t('cockney_in_thai')}
                </Text>
              </View>
              {currentLanguage === 'cockney' && (
                <MCI name="check" size={20} color={colors.primary} />
              )}
            </View>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  )
}
