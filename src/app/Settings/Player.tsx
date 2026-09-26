import React from 'react'
import {ActivityIndicator, Button, Image, ScrollView} from 'react-native'
import { ThemedView as View } from '@/components/ThemedView'
import { ThemedText as Text } from '@/components/ThemedText'
import Divider from '@/components/Divider'
import config from '@/config'
import LeagueHistory from '@/components/LeagueHistory'
import {useTranslation} from 'react-i18next'
import {useLeague} from '@/hooks'
import { useLeagueContext } from '@/context/LeagueContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {router, useLocalSearchParams} from 'expo-router'

export default function Player(props: {playerId?: string | number} = {}) { 
  const {state, dispatch} = useLeagueContext()
  const params = useLocalSearchParams<{playerId?: string}>()
  const playerIdParam = props.playerId ?? params.playerId
  const playerId = Array.isArray(playerIdParam)
    ? playerIdParam[0]
    : playerIdParam
  const league = useLeague()
  const [playerInfo, setPlayerInfo] = React.useState<any>(null)
  const [err, setErr] = React.useState('')
  const {t} = useTranslation()

  function HandleStatsPress() {
    if (!playerInfo?.player_id) {
      return
    }
    router.push({
      pathname: '/Settings/Players/Player',
      params: {params: JSON.stringify({playerId: playerInfo.player_id})},
    })
  }
  const user = state.user

  const teamRoleId = React.useMemo(() => {
    if (typeof user.teams === 'undefined') {
      return null
    } else {
      const _roles = {}
      user.teams.forEach(ct => {
        _roles[ct.id] = ct.team_role_id
      })
      return _roles
    }
  }, [user])

  async function GetPlayerStatsInfo(playerId) {
    try {
      const res = await league.GetPlayerStatsInfo(playerId)
      setPlayerInfo(res)
    } catch (e) {
      console.log(e)
    }
  }

  async function HandleGrantStatus(teamId, level = 0) {
    try {
      const res = await league.GrantPrivilege(playerId, teamId, level)
      if (typeof res.status !== 'undefined' && res.status === 'ok') {
        GetPlayerStatsInfo(playerId)
      } else {
        setErr(res.error)
      }
    } catch (e) {
      setErr('server_error')
    }
  }

  async function HandleRemoveStatus(teamId) {
    try {
      const res = await league.RevokePrivileges(playerId, teamId)
      if (typeof res.status !== 'undefined' && res.status === 'ok') {
        GetPlayerStatsInfo(playerId)
      } else {
        setErr(res.error)
      }
    } catch (e) {
      setErr('server_error')
    }
  }

  React.useEffect(() => {
    if (playerId) {
      GetPlayerStatsInfo(playerId)
    }
  }, [playerId])

  if (playerInfo) {
    if (typeof playerInfo.pic === 'undefined' || !playerInfo.pic) {
      if (playerInfo.gender === 'Female') {
        playerInfo.pic = 'default_female.png'
      } else {
        playerInfo.pic = 'default_male.png'
      }
    }
    return (
      <ScrollView contentContainerStyle={{flexGrow: 1, paddingHorizontal: 20}}>
        <Row alignItems="center" py={20}>
          <View flex={3}>
            <Row>
              <View flex={2}>
                <Text>main_player_id</Text>
              </View>
              <View flex={3}>
                <Text fontSize="lg">{playerInfo.player_id}</Text>
              </View>
            </Row>
            <Row>
              <View flex={2}>
                <Text>nickname</Text>
              </View>
              <View flex={3}>
                <Text fontSize="xl">{playerInfo.name}</Text>
              </View>
            </Row>
            {isLeagueAdmin(user) && (
              <>
                <Row>
                  <View flex={2}>
                    <Text>first_name</Text>
                  </View>
                  <View flex={3}>
                    <Text fontSize="xl">{playerInfo.firstname}</Text>
                  </View>
                </Row>
                <Row>
                  <View flex={2}>
                    <Text>last_name</Text>
                  </View>
                  <View flex={3}>
                    <Text fontSize="xl">{playerInfo.lastname}</Text>
                  </View>
                </Row>
              </>
            )}
            <Row>
              <View flex={2}>
                <Text>nationality</Text>
              </View>
              <View flex={3}>
                <Text variant="bodyLarge">
                  {playerInfo?.nationality?.en ?? ''}
                </Text>
                <Text variant="bodyLarge">
                  {playerInfo?.nationality?.th ?? ''}
                </Text>
              </View>
            </Row>
          </View>
          <View flex={1} alignItems="center">
            <Image
              source={{uri: config.profileUrl + playerInfo.pic}}
              width={100}
              height={100}
              resizeMode="contain"
              style={{borderRadius: 50}}
            />
          </View>
        </Row>
        <Divider />
        <View>
          <Button variant="ghost" onPress={() => HandleStatsPress()}>
            Player Statistics
          </Button>
        </View>
        <Divider />
        <View my={20}>
          <Row>
            <View flex={1}>
              <Text>teams</Text>
            </View>
            <View flex={3}>
              {playerInfo.currentTeams.map((team, idx) => (
                <View key={'teamplayers' + idx}>
                  <Row>
                    <View flex={1}>
                      <Text>{team.name}</Text>
                    </View>
                    {team.team_role_id === 2 && (
                      <View flex={1}>
                        <Text bold>captain</Text>
                      </View>
                    )}
                    {team.team_role_id === 1 && (
                      <View flex={1}>
                        <Text bold>asst_captain</Text>
                      </View>
                    )}
                  </Row>
                  <Row space={10}>
                    {isLeagueAdmin(user) && team.team_role_id < 2 && (
                      <Button
                        variant="ghost"
                        onPress={() =>
                          HandleGrantStatus(team.id, team.team_role_id + 1)
                        }>
                        {t('promote')}
                      </Button>
                    )}
                    {!isLeagueAdmin(user) &&
                      teamRoleId[team.id] === 2 &&
                      team.team_role_id < 1 && (
                        <Button
                          variant="ghost"
                          onPress={() =>
                            HandleGrantStatus(team.id, team.team_role_id + 1)
                          }>
                          {t('promote')}
                        </Button>
                      )}
                    {isLeagueAdmin(user) && team.team_role_id > 0 && (
                      <Button
                        variant="ghost"
                        onPress={() => HandleRemoveStatus(team.id)}>
                        {t('revoke')}
                      </Button>
                    )}
                    {!isLeagueAdmin(user) &&
                      teamRoleId[team.id] === 2 &&
                      team.team_role_id === 1 && (
                        <Button
                          variant="ghost"
                          onPress={() => HandleRemoveStatus(team.id)}>
                          {t('revoke')}
                        </Button>
                      )}
                  </Row>
                </View>
              ))}
            </View>
          </Row>
        </View>
        <Divider />
        <View style={{padding: 20}}>
          <View>
            <Text bold>LEAGUE HISTORY</Text>
          </View>
          <LeagueHistory playerInfo={playerInfo} />
        </View>
      </ScrollView>
    )
  } else {
    return (
      <View flex={1}>
        <ActivityIndicator />
      </View>
    )
  }
}
