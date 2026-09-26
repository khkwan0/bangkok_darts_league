import React from 'react'
import {View, Image, ActivityIndicator, ScrollView} from 'react-native'
import {useLeague} from '@/hooks/useLeague'
import {ThemedText as Text} from '@/components/ThemedText'
import Row from '@/components/Row'
import config from '@/config'
import {router} from 'expo-router'
import Button from '@/components/Button'
import {useNavigation} from "expo-router/react-navigation"

interface PlayerDetailsProps {
  playerId: number
}

export default function PlayerDetails({playerId}: PlayerDetailsProps) {
  const league = useLeague()
  const [playerInfo, setPlayerInfo] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const navigation = useNavigation()

  React.useEffect(() => {
    async function fetchPlayerInfo() {
      try {
        setIsLoading(true)
        const info = await league.GetPlayerStatsInfo(playerId)
        setPlayerInfo(info)
      } catch (e) {
        setError('Failed to load player information')
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }

    if (playerId) {
      fetchPlayerInfo()
    }
  }, [playerId])

  React.useEffect(() => {
    navigation.setOptions({
      title: playerInfo?.name || playerInfo?.nickname || 'Player Details',
      headerShown: true,
    })
  }, [playerInfo])

  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>{error}</Text>
      </View>
    )
  }

  if (!playerInfo) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>No player information found</Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={{padding: 20}}>
      <Row alignItems="center" className="py-5">
        <View style={{flex: 3}}>
          <Row>
            <View style={{flex: 2}}>
              <Text>Player ID:</Text>
            </View>
            <View style={{flex: 3}}>
              <Text type="subtitle">{playerInfo.player_id}</Text>
            </View>
          </Row>
          <Row>
            <View style={{flex: 2}}>
              <Text>
                <Text>nickname</Text>:
              </Text>
            </View>
            <View style={{flex: 3}}>
              <Text type="subtitle">
                {playerInfo.name || playerInfo.nickname || 'Not provided'}
              </Text>
            </View>
          </Row>
          <Row>
            <View style={{flex: 2}}>
              <Text>
                <Text>first_name</Text>:
              </Text>
            </View>
            <View style={{flex: 3}}>
              <Text type="subtitle">
                {playerInfo.firstname || playerInfo.firstName || 'Not provided'}
              </Text>
            </View>
          </Row>
          <Row>
            <View style={{flex: 2}}>
              <Text>
                <Text>last_name</Text>:
              </Text>
            </View>
            <View style={{flex: 3}}>
              <Text type="subtitle">
                {playerInfo.lastname || playerInfo.lastName || 'Not provided'}
              </Text>
            </View>
          </Row>
          <Row>
            <View style={{flex: 2}}>
              <Text>
                <Text>nationality</Text>:
              </Text>
            </View>
            <View style={{flex: 3}}>
              {playerInfo.flag && <Text>{playerInfo.flag}</Text>}
              <Text type="subtitle">
                {playerInfo?.nationality?.en || 'not_provided'}
              </Text>
              <Text type="subtitle">{playerInfo?.nationality?.th || ''}</Text>
            </View>
          </Row>
        </View>
        <View style={{flex: 1, alignItems: 'center'}}>
          <Image
            source={{
              uri: `${config.profileUrl}${
                playerInfo.pic ||
                (playerInfo.gender === 'Female'
                  ? 'default_female.png'
                  : 'default_male.png')
              }`,
            }}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
            }}
            resizeMode="contain"
          />
        </View>
      </Row>

      {playerInfo.currentTeams && playerInfo.currentTeams.length > 0 && (
        <View style={{marginTop: 20}}>
          <Text type="subtitle">Teams</Text>
          {playerInfo.currentTeams.map((team: any, idx: number) => (
            <Row key={`team-${idx}`} style={{marginTop: 10}}>
              <View style={{flex: 1}}>
                <Text>{team.name}</Text>
              </View>
              {team.team_role_id === 2 && (
                <View style={{flex: 1}}>
                  <Text type="subtitle">Captain</Text>
                </View>
              )}
              {team.team_role_id === 1 && (
                <View style={{flex: 1}}>
                  <Text type="subtitle">Assistant Captain</Text>
                </View>
              )}
            </Row>
          ))}
        </View>
      )}

      <View style={{marginTop: 20}}>
        <Button
          onPress={() =>
            router.push({
              pathname: './Player',
              params: {
                params: JSON.stringify({playerId}),
              },
            })
          }>
          Player Statistics
        </Button>
      </View>

      <View style={{marginTop: 20}}>
        <Text>league_history</Text>
        <View>
          {playerInfo.seasons &&
            Object.keys(playerInfo.seasons).map((season, seasonIdx) => {
              return (
                <View
                  key={season + '_' + seasonIdx}
                  style={{marginVertical: 5}}>
                  {Object.keys(playerInfo.seasons[season]).map(
                    (team, teamIdx) => (
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
                    ),
                  )}
                </View>
              )
            })}
        </View>
      </View>
    </ScrollView>
  )
}
