import {View} from 'react-native'
import LanguageOption from '@/components/LanguageOption'
import {useAccount} from '@/hooks/useAccount'
import {useLeagueContext} from '@/context/LeagueContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
import i18n from '@/i18n'
import React from 'react'

export default function LanguageOptions() {
  const account = useAccount()
  const {state} = useLeagueContext()
  const [currentLanguage, setCurrentLanguage] = React.useState<string | null>(
    null,
  )

  async function GetCurrentLanguage() {
    try {
      const language = await AsyncStorage.getItem('language')
      setCurrentLanguage(language)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleLanguageOption(lang: string) {
    try {
      await AsyncStorage.setItem('language', lang)
      await i18n.changeLanguage(lang)
      if (state.user?.id) {
        await account.SaveLanguage(lang)
      }
      setCurrentLanguage(lang)
    } catch (error) {
      console.log(error)
    }
  }

  React.useEffect(() => {
    GetCurrentLanguage()
  }, [])

  return (
    <View className="flex-1 justify-center px-4">
      <LanguageOption
        handleLanguageOption={handleLanguageOption}
        currentLanguage={currentLanguage}
      />
    </View>
  )
}
