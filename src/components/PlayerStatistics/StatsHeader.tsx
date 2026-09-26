import React from 'react'
import {ThemedView as View} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'
import {useTranslation} from 'react-i18next'

interface PropType {
  isDoubles: boolean
  isMatchPerformance: boolean
}

export default function StatsHeader(props: PropType) {
  const {t} = useTranslation()
  const header = props.isDoubles
    ? 'Doubles'
    : props.isMatchPerformance
      ? 'Match Performance'
      : 'Frames'
  return (
    <View className="flex-row">
      {!props.isMatchPerformance && (
        <>
          <View flex={2}>
            <Text className="font-bold">
              {props.isDoubles ? t('partner') : t('game_type')}
            </Text>
          </View>
          <View flex={1}>
            <Text className="font-bold">{t('played')}</Text>
          </View>
          <View flex={1}>
            <Text className="font-bold">{t('won')}</Text>
          </View>
          <View flex={1}>
            <Text className="font-bold text-center">
              <Text>{t('win')}</Text> %
            </Text>
          </View>
        </>
      )}
      {props.isMatchPerformance && (
        <>
          <View flex={3}>
            <Text className="font-bold">{t('date')}</Text>
          </View>
          <View flex={2} className="items-center">
            <Text className="font-bold">{t('sgl')}</Text>
            <Text>{t('won_played')}</Text>
          </View>
          <View flex={3} className="items-end">
            <Text className="font-bold">{t('dbl')}</Text>
            <Text>{t('won_played')}</Text>
          </View>
        </>
      )}
    </View>
  )
}
