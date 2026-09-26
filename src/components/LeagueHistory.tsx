import React from 'react'
import {ThemedView as View} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'

type SeasonType = {
  season: object
}

type PlayerInfoType = {
  seasons: Array<SeasonType>
}

interface PropType {
  playerInfo: PlayerInfoType
}

export default function LeagueHistory(props: PropType) {
  const playerInfo = props.playerInfo
  return (
    <View>
      {playerInfo.seasons &&
        Object.keys(playerInfo.seasons).map((season, seasonIdx) => {
          return (
            <View key={season + '_' + seasonIdx} style={{marginVertical: 5}}>
              {Object.keys(playerInfo.seasons[season]).map((team, teamIdx) => (
                <View
                  key={team + '_' + teamIdx}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}>
                  <View style={{flex: 2}}>
                    <Text>{team}</Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text>{season}</Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text>{playerInfo.seasons[season][team]} frames</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        })}
    </View>
  )
}
