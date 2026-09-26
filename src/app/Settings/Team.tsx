import React from 'react'
import {Button, Image, Pressable, ScrollView, TextInput} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import TwoColumns from '@/components/TwoColumns'
import {useNavigation, useTheme} from "expo-router/react-navigation"
import config from '@/config'
import {useLeagueContext} from '@/context/LeagueContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {useTranslation} from 'react-i18next'
import {useLeague, useTeams} from '@/hooks'
import TrieSearch from 'trie-search'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {router} from 'expo-router'

const PlayerCard = props => {
  const {state, dispatch} = useLeagueContext()
  const {t} = useTranslation()
  const user = state.user

  return (
    <View className="flex-row items-center">
      <View className="w-1/3">
        <Text className="text-md">
          {t('nickname')}: {props.player.name ?? props.player.nickname}
        </Text>
        <View className="flex-row">
          {(props.player.firstname || props.player.firstName) && (
            <Text className="text-md">
              &nbsp;
              {props.abbrevFirst
                ? (props.player.firstname ?? props.player.firstName).substr(
                    0,
                    isLeagueAdmin(user)
                      ? props.player.lastname.length
                      : (props.player.firstname ?? props.player.firstName)
                            .length > 2
                        ? 3
                        : 2,
                  )
                : props.player.firstname}
            </Text>
          )}
          {(props.player.lastname || props.player.lastName) && (
            <Text className="text-md">
              &nbsp;
              {props.abbrevLast
                ? (props.player.lastname ?? props.player.lastName).substr(
                    0,
                    isLeagueAdmin(user)
                      ? props.player.lastname.length
                      : (props.player.lastname ?? props.player.lastName)
                            .length > 2
                        ? 3
                        : 2,
                  )
                : props.player.lastname}
            </Text>
          )}
        </View>
        <Text>#{props.player.id}</Text>
      </View>
      <View className="w-1/3">
        {props.player.profile_picture && (
          <View>
            <Image
              source={{uri: config.profileUrl + props.player.profile_picture}}
              width={40}
              height={40}
              resizeMode="contain"
              style={{borderRadius: 50}}
            />
          </View>
        )}
      </View>
      <View className="w-1/3">
        <Button
          title={t('select')}
          disabled={props.disabled}
          onPress={() => props.handleSelect(props.player.id)}
        />
      </View>
    </View>
  )
}

const ChoosePlayer = props => {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [list, setList] = React.useState([])
  const {t} = useTranslation()

  const trie = React.useRef(new TrieSearch('nickname', {splitOnRegEx: false}))

  React.useEffect(() => {
    if (props.allPlayers) {
      trie.current.addAll(props.allPlayers ?? [])
    }
  }, [props.allPlayers])

  React.useEffect(() => {
    if (searchQuery.length > 0) {
      const _list = trie.current.search(searchQuery)
      setList(_list)
    }
  }, [searchQuery])

  return (
    <View>
      <View>
        <TextInput
          className="border p-2 rounded-md"
          placeholder={
            typeof props.allPlayers === 'undefined'
              ? t('loading')
              : props.allPlayers.length === 0
                ? t('loading')
                : t('search_name')
          }
          value={searchQuery}
          onChangeText={text => setSearchQuery(text)}
        />
      </View>
      <View>
        {list.map((item, idx) => (
          <PlayerCard
            key={'adduser' + idx}
            abbrevLast
            handleSelect={props.handleSelect}
            player={item}
          />
        ))}
      </View>
    </View>
  )
}

const AddNewPlayer = props => {
  const {t} = useTranslation()
  const [allPlayers, setAllPlayers] = React.useState([])
  const [showAddNewPlayer, setShowAddNewPlayer] = React.useState(false)
  const [newNickName, setNewNickName] = React.useState('')
  const [newFirstName, setNewFirstName] = React.useState('')
  const [newLastName, setNewLastName] = React.useState('')
  const [newEmail, setNewEmail] = React.useState('')
  const [valid, setValid] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState('')
  const league = useLeague()

  React.useEffect(() => {
    ;(async () => {
      try {
        const res = await league.GetUniquePlayers()
        setAllPlayers(res.data)
      } catch (e) {
        console.log(e)
      }
    })()
  }, [])

  async function HandleSave() {
    try {
      if (newNickName && newNickName.length > 0) {
        setLoading(true)
        const res = await league.SaveNewPlayer(
          newNickName,
          newFirstName,
          newLastName,
          newEmail,
        )
        if (typeof res.status !== 'undefined' && res.status === 'ok') {
          if (
            typeof res.data !== 'undefined' &&
            res.data.playerId !== 'undefined' &&
            res.data.playerId
          ) {
            props.handleSelect(res.data.playerId)
          } else {
            setErr('Error Saving')
          }
        } else if (typeof res.status !== 'undefined' && res.status === 'err') {
          if (typeof res.msg !== 'undefined') {
            setErr(res.msg)
          } else {
            setErr('Error Saving (unknown)')
          }
        }
      } else {
        setErr('too_short')
      }
    } catch (e) {
      console.log(e)
      setErr('server_error')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (newNickName.length > 0) {
      setValid(true)
    }
  }, [newNickName])

  return (
    <View className="p-6">
      <View className="mt-8">
        <Text className="font-bold">{t('add_player')}</Text>
      </View>
      <ChoosePlayer allPlayers={allPlayers} handleSelect={props.handleSelect} />
      <View className="my-8">
        <View>
          {!showAddNewPlayer && (
            <View>
              <View>
                <Text className="text-center font-bold text-xl">- OR -</Text>
              </View>
              <View className="mt-4">
                <Button
                  title={t('add_new_player')}
                  onPress={() => setShowAddNewPlayer(true)}
                />
              </View>
            </View>
          )}
          {showAddNewPlayer && (
            <View>
              <View>
                <Text className="text-center font-bold text-xl">- OR -</Text>
              </View>
              <View>
                <Text className="font-bold">{t('add_new_player')}</Text>
              </View>
              <View>
                <View>
                  <TextInput
                    className="border p-2 rounded-md my-1"
                    placeholder={
                      t('nickname') + ' ' + '(' + t('required') + ')'
                    }
                    value={newNickName}
                    onChangeText={text => setNewNickName(text)}
                  />
                </View>
                <View>
                  <TextInput
                    className="border p-2 rounded-md my-1"
                    placeholder="Email (recommended)"
                    value={newEmail}
                    onChangeText={text => setNewEmail(text)}
                  />
                </View>
                <View>
                  <TextInput
                    className="border p-2 rounded-md my-1"
                    placeholder="First Name (optional)"
                    value={newFirstName}
                    onChangeText={text => setNewFirstName(text)}
                  />
                </View>
                <View>
                  <TextInput
                    className="border p-2 rounded-md mt-1"
                    placeholder="Last Name (optional)"
                    value={newLastName}
                    onChangeText={text => setNewLastName(text)}
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
      <View>
        {err && (
          <View>
            <Text className="text-center text-red-600">{err}</Text>
          </View>
        )}
        <View style={{flexDirection: 'row', gap: 25}}>
          <View style={{flex: 1}}>
            <Button title={t('cancel')} onPress={() => props.cancel()} />
          </View>
          <View style={{flex: 1}}>
            <Button
              title={t('save')}
              disabled={!valid || loading}
              onPress={() => HandleSave()}
            />
          </View>
        </View>
      </View>
    </View>
  )
}

type PlayerType = {
  nickname: string
  firstname: string
  lastname: string
  id: number
  flag: string
}

type TeamType = {
  id: number
  captains: Array<PlayerType>
  assistants: Array<PlayerType>
  players: Array<PlayerType>
  venue_logo: string
  name: string
}

const Team = props => {
  const [team, setTeam] = React.useState<TeamType>({})
  const {dispatch, state} = useLeagueContext()
  const navigation = useNavigation()
  const user = state.user
  const [showAddNewPlayer, setShowAddNewPlayer] = React.useState(false)
  const [toDelete, setToDelete] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const {t} = useTranslation()
  const {colors} = useTheme()
  const [canAdd, setCanAdd] = React.useState(false)
  const [err, setErr] = React.useState('')
  const league = useLeague()
  const teamHook = useTeams()

  console.log(colors)

  async function GetTeamInfo(teamId: string) {
    try {
      const res = await teamHook.GetTeamInfo(teamId)
      if (typeof res.status !== 'undefined' && res.status === 'ok') {
        setTeam(res.data)
      }
    } catch (e) {
      console.log(e)
    }
  }

  React.useEffect(() => {
    GetTeamInfo(props.team.team)
  }, [props.team])

  const captains = React.useMemo(() => {
    if (typeof team.captains !== 'undefined') {
      return team.captains.map(u => u.id)
    } else {
      return []
    }
  }, [team])

  const assts = React.useMemo(() => {
    if (typeof team.assistants !== 'undefined') {
      return team.assistants.map(u => u.id)
    } else {
      return []
    }
  }, [team])

  React.useEffect(() => {
    setCanAdd(
      captains.includes(user.id) ||
        assts.includes(user.id) ||
        isLeagueAdmin(user),
    )
  }, [captains, assts])

  async function RefreshTeam() {
    try {
      const res = await league.GetTeamInfo(props.team.id)
      setTeam(res)
    } catch (e) {
      console.log(e)
      setErr('server_error')
    }
  }

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      RefreshTeam()
    })
    return unsubscribe
  }, [navigation])

  async function HandleSelect(playerId: string) {
    try {
      setShowAddNewPlayer(false)
      const res = await league.AddPlayerToTeam(playerId, team.id)
      if (typeof res.status !== 'undefined' && res.status === 'ok') {
        RefreshTeam()
      } else {
        setErr(res.error)
      }
    } catch (e) {
      console.log(e)
      setErr('server_error')
    }
  }

  async function HandleDelete() {
    try {
      setLoading(true)
      setErr('')
      const res = await league.RemovePlayerFromTeam(toDelete, team.id)
      if (typeof res.error !== 'undefined' && res.error) {
        setErr(res.error)
      }
      setToDelete(0)
      RefreshTeam()
    } catch (e) {
      console.log(e)
      setErr('server_error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        backgroundColor: colors.background,
        paddingHorizontal: 10,
        paddingBottom: 30,
        flexGrow: 1,
      }}>
      <View className="items-center mt-5 py-2">
        <Image
          source={{uri: config.logoUrl + team.venue_logo}}
          width={100}
          height={100}
          resizeMode="contain"
        />
      </View>
      {canAdd && !showAddNewPlayer && (
        <View className="mt-10">
          <Button
            title={t('add_player')}
            onPress={() => setShowAddNewPlayer(true)}
          />
          {err && (
            <View className="mt-10">
              <Text className="text-center text-red-600">{err}</Text>
            </View>
          )}
        </View>
      )}
      <View className="mt-10">
        <TwoColumns label={t('team_id')}>
          <Text className="font-bold text-xl">#{team.id}</Text>
        </TwoColumns>
        <TwoColumns label={t('name')}>
          <Text className="font-bold">{team.name}</Text>
        </TwoColumns>
      </View>
      {showAddNewPlayer && (
        <AddNewPlayer
          cancel={() => setShowAddNewPlayer(false)}
          handleSelect={HandleSelect}
          teamId={team.id}
        />
      )}
      {!showAddNewPlayer && (
        <>
          <View className="mt-8">
            {typeof team.captains !== 'undefined' &&
              team.captains.map((captain, idx) => (
                <TwoColumns
                  key={'captain' + idx}
                  label={idx === 0 ? t('captain') : ''}>
                  <Pressable
                    className="py-2"
                    onPress={() =>
                      router.push({
                        pathname: '/Settings/Player',
                        params: {playerId: String(captain.id)},
                      })
                    }>
                    <View className="flex-row items-center">
                      <View className="flex-1">
                        <Text>
                          {captain.flag} {captain.nickname}
                        </Text>
                        {isLeagueAdmin(user) && (
                          <Text>
                            ({captain.firstname} {captain.lastname})
                          </Text>
                        )}
                      </View>
                      <View>
                        <MCI
                          name="chevron-right"
                          color={colors.text}
                          size={30}
                        />
                      </View>
                    </View>
                  </Pressable>
                </TwoColumns>
              ))}
            {typeof team.assistants !== 'undefined' &&
              team.assistants.map((assistant, idx) => (
                <TwoColumns
                  key={'assistant' + idx}
                  label={idx === 0 ? t('assistants') : ''}>
                  <Pressable
                    py={5}
                    onPress={() =>
                      router.push({
                        pathname: '/Settings/Player',
                        params: {playerId: String(assistant.id)},
                      })
                    }>
                    <View className="flex-row items-center">
                      <View className="flex-1">
                        <Text>
                          {assistant.flag} {assistant.nickname}
                        </Text>
                        {isLeagueAdmin(user) && (
                          <Text>
                            ({assistant.firstname} {assistant.lastname})
                          </Text>
                        )}
                      </View>
                      <View>
                        <MCI
                          name="chevron-right"
                          color={colors.text}
                          size={30}
                        />
                      </View>
                    </View>
                  </Pressable>
                </TwoColumns>
              ))}
          </View>
          <View className="mt-8">
            <View>
              <Text>{t('players')}</Text>
            </View>
            {typeof team.players !== 'undefined' &&
              team.players.map((player, idx) => (
                <View
                  className="flex-row items-center my-2"
                  key={'player' + idx}>
                  <View className="w-1/6">
                    <Text className="text-center text-2xl">{player.flag}</Text>
                  </View>
                  <View className="w-3/6">
                    <Pressable
                      className="p-5"
                      onPress={() =>
                        router.push({
                          pathname: '/Settings/Player',
                          params: {playerId: String(player.id)},
                        })
                      }>
                      <Text className="text-lg">{player.nickname}</Text>
                      {isLeagueAdmin(user) && (
                        <Text className="text-lg">
                          ({player.firstname} {player.lastname})
                        </Text>
                      )}
                    </Pressable>
                  </View>
                  {toDelete === player.id && (
                    <View className="w-2/6">
                      <View className="mb-1">
                        <Button
                          title={t('confirm')}
                          disabled={loading}
                          onPress={() => HandleDelete()}
                        />
                      </View>
                      <View>
                        <Button
                          disabled={loading}
                          onPress={() => setToDelete(0)}
                          title={t('cancel')}
                        />
                      </View>
                    </View>
                  )}
                  {toDelete !== player.id && canAdd && (
                    <View
                      className="w-1/6 items-end rounded-full"
                      style={{backgroundColor: colors.tint}}>
                      <Pressable
                        className="p-5"
                        disabled={loading}
                        onPress={() => setToDelete(player.id)}>
                        <MCI
                          name="trash-can-outline"
                          size={20}
                          color={colors.text}
                        />
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}
          </View>
        </>
      )}
    </ScrollView>
  )
}

export default Team
