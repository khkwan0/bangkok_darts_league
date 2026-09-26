import {ThemedView as View} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'
import {useColorScheme} from 'react-native'
import Row from '@/components/Row'
import {FrameProps} from '../types'
import {useMatchContext} from '@/context/MatchContext'
import {useTranslation} from 'react-i18next'
import WinButton from './WinButton'
import Player from './Player'
import React from 'react'

export default function Frame({item, index, refreshing}: FrameProps) {
  const {state, UpdateFrameWin, ClearFrameWinner}: any = useMatchContext()
  const {t} = useTranslation()
  const frameType = state.matchInfo.initialFrames[index].type

  const {home_team_id: homeTeamId, away_team_id: awayTeamId} = state.matchInfo

  function HandleWin(side: string, goldenBreak: boolean = false): void {
    const teamId = side === 'home' ? homeTeamId : awayTeamId
    UpdateFrameWin(side, index, teamId, goldenBreak)
  }

  function ClearWinner(): void {
    ClearFrameWinner(index)
  }

  React.useEffect(() => {
    if (refreshing) {
      // Future refresh logic can go here
    }
  }, [refreshing])

  const theme = useColorScheme()
  const borderColor = theme === 'dark' ? '#aaa' : '#222'

  if (item.frameNumber === -1) {
    let homeScore = 0
    let awayScore = 0
    let i = 0
    while (i < index) {
      if (state.frameData[i].winner === homeTeamId) {
        homeScore++
      }
      if (state.frameData[i].winner === awayTeamId) {
        awayScore++
      }
      i++
    }
    return (
      <View>
        <Row className="py-3">
          <View flex={2} className="pl-5">
            <Text type="defaultSemiBold">
              {t('section')} {item.section}{' '}
            </Text>
          </View>
          <View flex={1}>
            <Text style={{textAlign: 'center'}} type="subtitle">
              {homeScore.toString()}
            </Text>
          </View>
          <View flex={1}>
            <Text style={{textAlign: 'center'}} type="subtitle">
              {awayScore.toString()}
            </Text>
          </View>
          <View flex={2} />
        </Row>
      </View>
    )
  } else {
    return (
      <View className="pb-2 px-4">
        <Text className="text-center">
          {t('frame')} {item.frameNumber}
        </Text>
        <Row>
          <View
            flex={2}
            className="py-5 rounded-md"
            style={{backgroundColor: '#fca9a9'}}>
            <Player
              teamId={state.matchInfo.home_team_id ?? 0}
              side="home"
              frameIndex={index}
              frameNumber={item.frameNumber}
              frameType={frameType}
              playerIds={item.homePlayerIds}
              refreshing={refreshing}
            />
          </View>
          <View flex={1} className="px-2 justify-center items-center">
            <WinButton
              winner={state.frameData[index].winner}
              HandleWin={HandleWin}
              side="home"
              teamId={homeTeamId}
              ClearWinner={ClearWinner}
              goldenBreak={item.goldenBreak ?? false}
            />
          </View>
          <View
            flex={1}
            className="border-l px-2 justify-center items-center"
            style={{borderColor: borderColor}}>
            <WinButton
              winner={state.frameData[index].winner}
              HandleWin={HandleWin}
              side="away"
              teamId={awayTeamId}
              ClearWinner={ClearWinner}
              goldenBreak={item.goldenBreak ?? false}
            />
          </View>
          <View
            flex={2}
            className="py-5 rounded-md"
            style={{backgroundColor: '#b8bbf5'}}>
            <Player
              teamId={state.matchInfo.away_team_id ?? 0}
              side="away"
              frameIndex={index}
              frameNumber={item.frameNumber}
              frameType={frameType}
              playerIds={item.awayPlayerIds}
              refreshing={refreshing}
            />
          </View>
        </Row>
      </View>
    )
  }
}
