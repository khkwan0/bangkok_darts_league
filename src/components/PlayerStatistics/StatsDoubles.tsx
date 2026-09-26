import {
  formatWinLabel,
  Surface,
  useStatColors,
  WinRateBar,
  winRateColor,
  winRatePercent,
} from '@/components/PlayerStatistics/statUi'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, Text as RNText, View as RNView} from 'react-native'
type StatType = {
  playerId: number
  nickname: string
  played: number
  won: number
  winp: number
  wgtd: number
}

interface PropType {
  stats: StatType[]
  path: string | undefined
  variant?: 'table' | 'cards'
}

export default function StatsDoubles(props: PropType) {
  const router = useRouter()
  const {t} = useTranslation()
  const colors = useStatColors()
  const stats = props.stats
  const path = props.path

  function openPartner(playerId: number) {
    router.push({
      pathname: typeof path !== 'undefined' ? path + '/Player' : './Player',
      params: {
        params: JSON.stringify({playerId: playerId}),
      },
    })
  }

  if (props.variant === 'cards') {
    return (
      <>
        {stats.map((stat, index) => {
          const percent = winRatePercent(stat.played, stat.won, stat.winp)
          return (
            <Surface
              key={stat.playerId + '_' + index}
              style={{padding: 14, marginBottom: 8}}>
              <Pressable onPress={() => openPartner(stat.playerId)}>
                <RNView
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}>
                  <Text
                    type="link"
                    numberOfLines={1}
                    style={{flex: 1, marginRight: 8}}>
                    {stat.nickname}
                  </Text>
                  <RNText
                    style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: winRateColor(percent),
                    }}>
                    {formatWinLabel(percent)}
                  </RNText>
                </RNView>
                <RNText style={{color: colors.muted, fontSize: 13, marginBottom: 8}}>
                  {`${t('played')} ${stat.played}  ·  ${t('won')} ${stat.won}`}
                </RNText>
                <WinRateBar
                  played={stat.played}
                  won={stat.won}
                  winp={stat.winp}
                />
              </Pressable>
            </Surface>
          )
        })}
      </>
    )
  }

  return (
    <>
      {stats.map((stat, index) => {
        const playerId = stat.playerId
        return (
          <View className="flex-row" key={stat + '_' + index}>
            <Pressable
              onPress={() => openPartner(playerId)}
              className="w-2"
              style={{flex: 2}}>
              <Text type="link">{stat.nickname}</Text>
            </Pressable>
            <View style={{flex: 1}}>
              <Text>{stat.played}</Text>
            </View>
            <View style={{flex: 1}}>
              <Text>{stat.won}</Text>
            </View>
            <View style={{flex: 1}}>
              <Text>{stat.winp}</Text>
            </View>
          </View>
        )
      })}
    </>
  )
}
