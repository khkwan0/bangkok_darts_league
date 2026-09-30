import Row from '@/components/Row'
import {ThemedText as Text} from '@/components/ThemedText'
import TeamNameEdit from '@/components/Teams/TeamNameEdit'
import {MiniSeasonChips} from '@/components/mini-leagues/MiniSeasonChips'
import config from '@/config'
import {LeagueContextType, useLeagueContext} from '@/context/LeagueContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {useLeague, useTeams} from '@/hooks'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useIsFocused, useNavigation} from "expo-router/react-navigation"
import {useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  View,
  useColorScheme,
} from 'react-native'

type PlayerType = {
  nickname: string
  firstname?: string
  lastname?: string
  id: number
  profile_picture?: string
  role?: string
  flag?: string
}

type TeamType = {
  captains: PlayerType[]
  assistants: PlayerType[]
  players: PlayerType[]
  venue_logo?: string
  name: string
  short_name?: string
  very_short_name?: string
  id: number
  season_id?: number
  is_current_season?: boolean
}

type LineageEntry = {
  season_id: number
  team_id: number
  season_name: string
  short_name?: string
  is_active: boolean
}

interface TeamMembersProps {
  teamId: number
  seasonId?: number | null
}

const MemberSection = ({
  title,
  players,
  teamId,
  isCaptain,
  isAssistant,
  isCaptainOtherTeam,
  isAssistantOtherTeam,
  isAdmin,
  canEdit,
  onRefresh,
  onProfilePicturePress,
}: {
  title: string
  players: PlayerType[]
  teamId: number
  isCaptain: boolean
  isAssistant: boolean
  isAdmin: boolean
  isCaptainOtherTeam: boolean
  isAssistantOtherTeam: boolean
  canEdit: boolean
  onRefresh: () => void
  onProfilePicturePress: (url: string) => void
}) => {
  const {t} = useTranslation()
  const league = useLeague()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const {state} = useLeagueContext()

  if (!players || players.length === 0) return null

  const handlePromote = async (playerId: number) => {
    try {
      const level = title.toLowerCase() === 'assistants' ? 2 : 1
      const response = await league.GrantPrivilege(playerId, teamId, level)
      if (response?.status === 'ok') {
        onRefresh()
      }
    } catch (error) {
      console.error('Error promoting player:', error)
    }
  }

  const handleDemote = async (playerId: number) => {
    try {
      const response = await league.RevokePrivileges(playerId, teamId)
      if (response?.status === 'ok') {
        onRefresh()
      }
    } catch (error) {
      console.error('Error demoting player:', error)
    }
  }

  const showControls =
    canEdit &&
    (isAdmin ||
      ((isCaptain || isAssistant) &&
        (title.toLowerCase() === 'players' ||
          (title.toLowerCase() === 'assistants' && isCaptain))))

  return (
    <View className="mb-4">
      <Text type="defaultSemiBold" className="mb-2 text-lg">
        {t(title).toUpperCase()}
      </Text>
      {players
        .sort((a: PlayerType, b: PlayerType) =>
          a.nickname.localeCompare(b.nickname),
        )
        .map(player => (
          <View
            key={player.id}
            className="p-3 mb-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <Row className="items-center">
              <View className="flex-1 flex-row items-center">
                <Pressable
                  className="mr-4"
                  onPress={() =>
                    router.push({
                      pathname: './Team/PlayerInfo',
                      params: {params: JSON.stringify({playerId: player.id})},
                    })
                  }>
                  <Text type="defaultSemiBold">
                    {player.flag} {player.nickname}
                  </Text>
                  {(player.firstname || player.lastname) && (
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      {[
                        player.firstname,
                        player.lastname
                          ? player.lastname.charAt(0) + '.'
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    </Text>
                  )}
                </Pressable>
                {player.profile_picture && (
                  <Pressable
                    onPress={() =>
                      onProfilePicturePress(
                        config.profileUrl + player.profile_picture,
                      )
                    }>
                    <Image
                      source={{uri: config.profileUrl + player.profile_picture}}
                      className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700"
                    />
                  </Pressable>
                )}
              </View>
              {state.user.id && (
                <View className="flex-row ml-2">
                  <Pressable
                    className="p-1.5 bg-purple-50 dark:bg-purple-900 rounded-lg border border-purple-200 dark:border-purple-800"
                    onPress={() =>
                      router.push({
                        pathname: '/Messages/New',
                        params: {
                          params: JSON.stringify({
                            nickname: player.nickname,
                            recipientId: player.id,
                          }),
                        },
                      })
                    }>
                    <MCI
                      name="message-text"
                      size={24}
                      color={
                        colorScheme === 'dark'
                          ? 'rgb(216, 180, 254)'
                          : 'rgb(107, 33, 168)'
                      }
                    />
                  </Pressable>
                </View>
              )}
              {showControls && (
                <View className="flex-row ml-2">
                  {title.toLowerCase() !== 'captains' && (
                    <Pressable
                      className="p-1.5 bg-purple-50 dark:bg-purple-900 rounded-lg mr-2 border border-purple-200 dark:border-purple-800"
                      onPress={() => handlePromote(player.id)}>
                      <MCI
                        name="arrow-up-circle"
                        size={24}
                        color={
                          colorScheme === 'dark'
                            ? 'rgb(216, 180, 254)'
                            : 'rgb(107, 33, 168)'
                        }
                      />
                    </Pressable>
                  )}
                  {title.toLowerCase() !== 'players' && (
                    <Pressable
                      className="p-1.5 bg-purple-50 dark:bg-purple-900 rounded-lg border border-purple-200 dark:border-purple-800"
                      onPress={() => handleDemote(player.id)}>
                      <MCI
                        name="arrow-down-circle"
                        size={24}
                        color={
                          colorScheme === 'dark'
                            ? 'rgb(216, 180, 254)'
                            : 'rgb(107, 33, 168)'
                        }
                      />
                    </Pressable>
                  )}
                </View>
              )}
            </Row>
          </View>
        ))}
    </View>
  )
}

export default function TeamMembers({teamId, seasonId}: TeamMembersProps) {
  const [teamData, setTeamData] = React.useState<TeamType>({
    captains: [],
    assistants: [],
    players: [],
    name: '',
    id: 0,
  })
  const [loading, setLoading] = React.useState(true)
  const [playerToRemove, setPlayerToRemove] = React.useState<{
    id: number
    nickname: string
  } | null>(null)
  const [isAddingPlayer, setIsAddingPlayer] = React.useState(false)
  const [_teamId, setTeamId] = React.useState<number>(teamId)
  const [lineage, setLineage] = React.useState<LineageEntry[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = React.useState<number | null>(
    seasonId ?? null,
  )
  const [selectedProfilePicture, setSelectedProfilePicture] = React.useState<
    string | null
  >(null)
  const [isPressing, setIsPressing] = React.useState(false)
  const teams = useTeams()
  const league = useLeague()
  const {t} = useTranslation()
  const {state} = useLeagueContext() as LeagueContextType
  const navigation = useNavigation()
  const colorScheme = useColorScheme()
  const router = useRouter()
  const isFocused = useIsFocused()

  React.useEffect(() => {
    setTeamId(teamId)
  }, [teamId])

  const refreshTeamInfo = React.useCallback(async () => {
    try {
      const response = await teams.GetTeamInfo(_teamId)
      if (response?.status === 'ok' && response.data) {
        setTeamData(response.data)
        if (response.data.season_id != null) {
          setSelectedSeasonId(Number(response.data.season_id))
        }
      }
    } catch (error) {
      console.error('Error fetching team info:', error)
    } finally {
      setLoading(false)
    }
    // useTeams returns fresh fns each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_teamId])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const rows = await league.GetTeamSeasonLineage(_teamId)
      if (cancelled) return
      const bySeason = new Map<number, LineageEntry>()
      for (const r of rows || []) {
        const seasonId = Number(r.season_id)
        if (!Number.isFinite(seasonId) || seasonId <= 0) continue
        // Prefer the active season entry if duplicates exist.
        const prev = bySeason.get(seasonId)
        if (!prev || r.is_active) {
          bySeason.set(seasonId, {
            season_id: seasonId,
            team_id: Number(r.team_id),
            season_name: String(r.season_name || r.short_name || seasonId),
            short_name: r.short_name ? String(r.short_name) : undefined,
            is_active: !!r.is_active,
          })
        }
      }
      setLineage(
        Array.from(bySeason.values()).sort(
          (a, b) => a.season_id - b.season_id,
        ),
      )
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_teamId])

  React.useEffect(() => {
    if (isFocused) {
      refreshTeamInfo()
    }
  }, [isFocused, refreshTeamInfo])

  const isCurrentSeason = teamData.is_current_season === true

  const isCaptain = React.useMemo(() => {
    return teamData.captains.some(
      (captain: PlayerType) => captain.id === state.user?.id,
    )
  }, [teamData.captains, state.user?.id])

  const isOnTeam = React.useMemo(() => {
    return (
      teamData.players.some(
        (player: PlayerType) => player.id === state.user?.id,
      ) ||
      teamData.assistants.some(
        (assistant: PlayerType) => assistant.id === state.user?.id,
      ) ||
      teamData.captains.some(
        (captain: PlayerType) => captain.id === state.user?.id,
      )
    )
  }, [teamData.players, teamData.assistants, teamData.captains, state.user?.id])

  const isCaptainOtherTeam = React.useMemo(() => {
    if (state.user?.role_id && state.user.role_id > 0) {
      return !teamData.captains.some(
        (captain: PlayerType) => captain.id === state.user?.id,
      )
    }
    return false
  }, [state.user?.role_id, state.user?.id, teamData.captains])

  const isAssistantOtherTeam = React.useMemo(() => {
    if (state.user?.role_id && state.user.role_id > 0) {
      return !teamData.assistants.some(
        (assistant: PlayerType) => assistant.id === state.user?.id,
      )
    }
    return false
  }, [state.user?.role_id, state.user?.id, teamData.assistants])

  const isAssistant = React.useMemo(() => {
    return teamData.assistants.some(
      (assistant: PlayerType) => assistant.id === state.user?.id,
    )
  }, [teamData.assistants, state.user?.id])
  const isAdmin = React.useMemo(() => {
    return isLeagueAdmin(state.user)
  }, [state.user])
  const canManageRoles = React.useMemo(() => {
    return isCurrentSeason && (isAdmin || isCaptain || isAssistant)
  }, [isCurrentSeason, isAdmin, isCaptain, isAssistant])

  const handleSelectSeason = (nextSeasonId: number) => {
    const entry = lineage.find(l => Number(l.season_id) === Number(nextSeasonId))
    if (!entry) return
    setSelectedSeasonId(nextSeasonId)
    if (Number(entry.team_id) === Number(_teamId)) return
    setLoading(true)
    setTeamId(Number(entry.team_id))
    router.setParams({
      params: JSON.stringify({
        teamId: entry.team_id,
        seasonId: entry.season_id,
      }),
    })
  }

  React.useEffect(() => {
    refreshTeamInfo()
  }, [refreshTeamInfo])

  React.useEffect(() => {
    if (teamData.name) {
      navigation.setOptions({
        title: teamData.name,
      })
    }
  }, [teamData.name, navigation])

  const handleRemovePlayer = async (playerId: number) => {
    try {
      const response = await league.RemovePlayerFromTeam(playerId, _teamId)
      if (response?.status === 'ok') {
        refreshTeamInfo()
      } else if (response?.error) {
        Alert.alert(t('error'), response.error)
      }
    } catch (error) {
      console.error('Error removing player:', error)
      Alert.alert(t('error'), t('error_removing_player'))
    } finally {
      setPlayerToRemove(null)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>{t('loading')}</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 p-4">
      <Modal
        visible={selectedProfilePicture !== null}
        transparent={true}
        onRequestClose={() => setSelectedProfilePicture(null)}>
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setSelectedProfilePicture(null)}>
          {selectedProfilePicture && (
            <Image
              source={{uri: selectedProfilePicture}}
              className="w-80 h-80 rounded-lg"
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
      <Modal
        visible={playerToRemove !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPlayerToRemove(null)}>
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <View className="bg-white dark:bg-gray-800 p-4 rounded-lg w-full max-w-sm shadow-xl">
            <Text type="defaultSemiBold" className="text-lg mb-4 text-center">
              {t('confirm_remove_player', {
                player: playerToRemove?.nickname,
                team: teamData.name,
              })}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 mb-4 text-center">
              {t('remove_player_warning')}
            </Text>
            <View className="flex-row justify-end space-x-2">
              <Pressable
                className="flex-1 p-2 bg-gray-100 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-500"
                onPress={() => setPlayerToRemove(null)}>
                <Text className="text-center dark:text-white">
                  {t('cancel')}
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 p-2 bg-red-600 rounded-lg"
                onPress={() => handleRemovePlayer(playerToRemove!.id)}>
                <Text className="text-white text-center">{t('remove')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <FlatList
        data={teamData.players.sort((a: PlayerType, b: PlayerType) =>
          a.nickname.localeCompare(b.nickname),
        )}
        ListHeaderComponent={
          <>
            {lineage.length > 1 ? (
              <View className="mb-3">
                <MiniSeasonChips
                  seasons={lineage.map(l => ({
                    id: l.season_id,
                    name: l.season_name,
                    short_name: l.short_name || l.season_name,
                    is_active: l.is_active,
                  }))}
                  seasonId={selectedSeasonId}
                  onSelect={handleSelectSeason}
                />
              </View>
            ) : null}
            <View className="items-center mb-6">
              {teamData.venue_logo ? (
                <Image
                  source={{uri: config.logoUrl + teamData.venue_logo}}
                  className="w-24 h-24 mb-2"
                  resizeMode="contain"
                />
              ) : (
                <View className="w-24 h-24 mb-2 bg-gray-200 dark:bg-gray-700 rounded-full items-center justify-center">
                  <Text
                    type="title"
                    className="text-2xl bg-gray-500 dark:bg-red-500 py-6 px-8 rounded-full">
                    {teamData.name.charAt(0)}
                  </Text>
                </View>
              )}
              <Pressable
                onPressIn={() => setIsPressing(true)}
                onPressOut={() => setIsPressing(false)}
                onPress={() => {
                  router.push({
                    pathname: './Team/Internal',
                    params: {
                      params: JSON.stringify({
                        teamId: _teamId,
                        teamName: teamData.name,
                      }),
                    },
                  })
                }}>
                <View>
                  <Text
                    type="subtitle"
                    className="text-xl"
                    style={{
                      color: isPressing
                        ? 'red'
                        : colorScheme === 'dark'
                          ? 'white'
                          : 'black',
                    }}>
                    {teamData.name}
                  </Text>
                  <View className="flex-row items-center justify-center">
                    <Text
                      className="text-gray-600 dark:text-gray-400 text-lg"
                      style={{
                        color: isPressing
                          ? 'red'
                          : colorScheme === 'dark'
                            ? 'white'
                            : 'black',
                      }}>
                      #{teamData.id}
                    </Text>
                    <MCI
                      className="ml-2"
                      name="chart-bar"
                      size={30}
                      color={
                        isPressing
                          ? 'red'
                          : colorScheme === 'dark'
                            ? 'white'
                            : 'black'
                      }
                    />
                  </View>
                </View>
              </Pressable>
            </View>
            {isCurrentSeason && (isCaptain || isAdmin) && (
              <TeamNameEdit
                teamId={_teamId}
                initialName={teamData.name || ''}
                initialShortName={teamData.short_name || ''}
                initialVeryShortName={teamData.very_short_name || ''}
                onSaved={names => {
                  setTeamData(prev => ({
                    ...prev,
                    name: names.name,
                    short_name: names.short_name,
                    very_short_name: names.very_short_name,
                  }))
                }}
              />
            )}
            {isCurrentSeason && (isOnTeam || isAdmin) && (
              <Pressable
                onPressIn={() => setIsAddingPlayer(true)}
                onPressOut={() => setIsAddingPlayer(false)}
                onPress={() =>
                  router.push({
                    pathname: './Team/AddPlayer',
                    params: {teamIdParams: JSON.stringify({teamId: _teamId})},
                  })
                }
                className={`border border-gray-200 dark:border-gray-400 rounded-lg p-4 mb-2 ${
                  isAddingPlayer ? 'bg-gray-100 dark:bg-gray-500' : ''
                }`}>
                <Text type="link" className="text-center">
                  {t('add_player')}
                </Text>
              </Pressable>
            )}
            <MemberSection
              title="captains"
              players={teamData.captains}
              teamId={_teamId}
              isCaptain={isCaptain}
              isAssistant={isAssistant}
              isAdmin={isAdmin}
              isCaptainOtherTeam={isCaptainOtherTeam}
              isAssistantOtherTeam={isAssistantOtherTeam}
              canEdit={isCurrentSeason}
              onRefresh={refreshTeamInfo}
              onProfilePicturePress={setSelectedProfilePicture}
            />
            <MemberSection
              title="assistants"
              players={teamData.assistants}
              teamId={_teamId}
              isCaptain={isCaptain}
              isAssistant={isAssistant}
              isAdmin={isAdmin}
              isCaptainOtherTeam={isCaptainOtherTeam}
              isAssistantOtherTeam={isAssistantOtherTeam}
              canEdit={isCurrentSeason}
              onRefresh={refreshTeamInfo}
              onProfilePicturePress={setSelectedProfilePicture}
            />
            <Text type="defaultSemiBold" className="mb-2 text-lg">
              {t('players').toUpperCase()}
            </Text>
          </>
        }
        renderItem={({item}) => (
          <View className="p-3 mb-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <Row className="items-center">
              <View className="flex-1 flex-row items-center">
                <Pressable
                  className="mr-4"
                  onPress={() => {
                    router.push({
                      pathname: './Team/PlayerInfo',
                      params: {params: JSON.stringify({playerId: item.id})},
                    })
                  }}>
                  <Text type="defaultSemiBold">
                    {item.flag} {item.nickname}
                  </Text>
                  {(item.firstname || item.lastname) && (
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      {[
                        item.firstname,
                        item.lastname ? item.lastname.charAt(0) + '.' : null,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    </Text>
                  )}
                </Pressable>
                {item.profile_picture && (
                  <Pressable
                    onPress={() =>
                      setSelectedProfilePicture(
                        config.profileUrl + item.profile_picture,
                      )
                    }>
                    <Image
                      source={{uri: config.profileUrl + item.profile_picture}}
                      className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700"
                    />
                  </Pressable>
                )}
              </View>
              {canManageRoles && (
                <View className="flex-row ml-2">
                  <Pressable
                    className="p-1.5 bg-purple-50 dark:bg-purple-900 rounded-lg mr-2 border border-purple-200 dark:border-purple-800"
                    onPress={async () => {
                      try {
                        const response = await league.GrantPrivilege(
                          item.id,
                          _teamId,
                          1,
                        )
                        if (response?.status === 'ok') {
                          refreshTeamInfo()
                        }
                      } catch (error) {
                        console.error('Error promoting player:', error)
                      }
                    }}>
                    <MCI
                      name="arrow-up-circle"
                      size={24}
                      color={
                        colorScheme === 'dark'
                          ? 'rgb(216, 180, 254)'
                          : 'rgb(107, 33, 168)'
                      }
                    />
                  </Pressable>
                  <Pressable
                    className="py-1.5 px-4 bg-red-50 dark:bg-red-900 rounded-lg border border-red-200 dark:border-red-800"
                    onPress={() =>
                      setPlayerToRemove({id: item.id, nickname: item.nickname})
                    }>
                    <MCI
                      name="account-remove"
                      size={24}
                      color={
                        colorScheme === 'dark'
                          ? 'rgb(254, 202, 202)'
                          : 'rgb(185, 28, 28)'
                      }
                    />
                  </Pressable>
                </View>
              )}
            </Row>
          </View>
        )}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-8">
            <Text>{t('no_players_found')}</Text>
          </View>
        }
      />
    </View>
  )
}
