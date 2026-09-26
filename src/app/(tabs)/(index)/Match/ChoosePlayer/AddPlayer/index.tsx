import React from 'react'
import {View} from 'react-native'
import {ThemedView} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'
import {FlatList, TextInput, useColorScheme} from 'react-native'
import Button from '@/components/Button'
import TrieSearch from 'trie-search'
import PlayerCard from '@/components/PlayerCard'
import {useLeague, useTeams} from '@/hooks'
import {useTranslation} from 'react-i18next'
import Row from '@/components/Row'
import {useNavigation} from "expo-router/react-navigation"
import {router, useLocalSearchParams} from 'expo-router'
import {useThemeColor} from '@/hooks/useThemeColor'
import {useMatchContext} from '@/context/MatchContext'

const ChoosePlayer = props => {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [list, setList] = React.useState([])
  const {t} = useTranslation()
  const colorScheme = useColorScheme()

  const trie = React.useRef(new TrieSearch('nickname', {splitOnRegEx: false}))

  React.useEffect(() => {
    if (props.allPlayers && props.allPlayers.length > 0) {
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
          style={colorScheme === 'dark' ? {borderColor: '#fff'} : {borderColor: '#000'}}
          className="border border-gray-600 dark:border-gray-300 rounded p-5"
          disabled={
            typeof props.allPlayer === 'undefined' ||
            props.allPlayers?.length === 0
          }
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

const ExistingPlayer = props => {
  return (
    <View>
      <Text type="subtitle">add_existing_player</Text>
      <TextInput
        className="border rounded p-5"
        placeholder="asd"
        onChangeText={text => props.setQuery(text)}
      />
    </View>
  )
}

const AddNewPlayer = ({
  handleSelect,
  setShowAddNewPlayer,
  showAddNewPlayer,
}) => {
  const [nickname, setNickname] = React.useState('')
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState('')
  const {t} = useTranslation()
  const league = useLeague()
  const colorScheme = useColorScheme()

  async function HandleSave() {
    try {
      setErr('')
      if (nickname && nickname.length > 1) {
        setLoading(true)
        const res = await league.SaveNewPlayer(
          nickname,
          firstName,
          lastName,
          email,
        )
        if (typeof res.status !== 'undefined' && res.status === 'ok') {
          if (
            typeof res.data !== 'undefined' &&
            typeof res.data.playerId !== 'undefined' &&
            res.data.playerId
          ) {
            handleSelect(res.data.playerId, nickname, true)
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

  function HandleClear() {
    setErr('')
    setNickname('')
    setFirstName('')
    setLastName('')
    setEmail('')
    setShowAddNewPlayer(false)
  }

  if (showAddNewPlayer) {
    return (
      <View className="px-2">
        <View className="my-4 mx-2">
          <Text>nickname_required</Text>
          <TextInput
            onChangeText={text => setNickname(text)}
            className="border border-gray-600 dark:border-gray-300 rounded py-6 px-4 dark:text-white"
            value={nickname}
            placeholder={t('nickname')}
            placeholderTextColor={colorScheme === 'dark' ? '#999' : '#333'}
          />
        </View>
        <View className="my-4 mx-2">
          <Text>first_name_label</Text>
          <TextInput
            className="border border-gray-600 dark:border-gray-300 rounded py-6 px-4 dark:text-white"
            onChangeText={text => setFirstName(text)}
            value={firstName}
            placeholder={t('first_name')}
            placeholderTextColor={colorScheme === 'dark' ? '#999' : '#333'}
          />
        </View>
        <View className="my-4 mx-2">
          <Text>last_name_label</Text>
          <TextInput
            className="border border-gray-600 dark:border-gray-300 rounded py-6 px-4 dark:text-white"
            onChangeText={text => setLastName(text)}
            value={lastName}
            placeholder={t('last_name')}
            placeholderTextColor={colorScheme === 'dark' ? '#999' : '#333'}
          />
        </View>
        <View className="my-4 mx-2">
          <Text>email_optional</Text>
          <TextInput
            className="border border-gray-600 dark:border-gray-300 rounded py-6 px-4 dark:text-white"
            onChangeText={text => setEmail(text)}
            value={email}
            placeholder={t('email_placeholder')}
            placeholderTextColor={colorScheme === 'dark' ? '#999' : '#333'}
          />
        </View>
        <View>
          <Text
            className="text-center"
            type="defaultSemiBold"
            lightColor="#f00">
            {err ?? ''}
          </Text>
        </View>
        <Row>
          <View flex={1} className="mx-10">
            <Button onPress={() => HandleClear()} disabled={loading}>
              cancel
            </Button>
          </View>
          <View flex={1} className="mx-10">
            <Button onPress={() => HandleSave()} disabled={loading}>
              save
            </Button>
          </View>
        </Row>
      </View>
    )
  } else {
    return (
      <View>
        <Button onPress={() => setShowAddNewPlayer(true)}>
          add_new_player
        </Button>
      </View>
    )
  }
}

const AddPlayer = props => {
  const {t} = useTranslation()
  const [showAddNewPlayer, setShowAddNewPlayer] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState('')
  const [data, setData] = React.useState([])
  const league = useLeague()
  const teams = useTeams()
  const navigation = useNavigation()
  const [query, setQuery] = React.useState('')
  const {state, UpdateFramePlayers}: any = useMatchContext()
  const colorScheme = useColorScheme()

  const bgColor = useThemeColor({}, 'background')
  const {params} = useLocalSearchParams()

  const {frameIndex, slot, side, frameNumber, frameType} = JSON.parse(
    params as string,
  )

  const trie = React.useRef(new TrieSearch('nickname', {splitOnRegEx: false}))

  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const res = await league.GetUniquePlayers()
        trie.current.addAll(res.data ?? [])
      } catch (e) {
        console.log(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  React.useEffect(() => {
    const res = trie.current.search(query)
    setData(res)
  }, [query])

  React.useEffect(() => {
    navigation.setOptions({title: t('add_new_player')})
  }, [])

  async function HandleSelect(playerId = 0, nickname = '', newplayer = false) {
    try {
      const res = await teams.AddExistingPlayerToTeam(
        side === 'home'
          ? state.matchInfo.home_team_id
          : state.matchInfo.away_team_id,
        playerId,
      )
      UpdateFramePlayers(
        frameIndex,
        side,
        slot,
        playerId,
        nickname,
        newplayer,
        frameType,
        frameNumber,
      )
      router.dismissTo('/Match')
    } catch (e) {
      console.log(e)
    }
  }

  return (
    <FlatList
      className="px-2"
      ListHeaderComponent={
        !showAddNewPlayer ? (
          <>
            <View className="m-10">
              <Text type="subtitle">add_existing_player</Text>
              <TextInput
                className="border border-gray-600 dark:border-gray-300 rounded p-5 dark:text-white"
                placeholderTextColor={colorScheme === 'dark' ? '#999' : '#333'}
                readOnly={loading}
                placeholder={loading ? t('loading') : t('search_name')}
                onChangeText={text => setQuery(text)}
              />
            </View>
            <View className="mb-10">
              <Text className="text-center"> - OR -</Text>
            </View>
          </>
        ) : null
      }
      data={data}
      renderItem={({item, index}) => (
        <PlayerCard
          player={item}
          slot={slot}
          side={side as string}
          frameIndex={frameIndex}
          frameNumber={frameNumber}
          frameType={frameType as string}
          disabled={false}
          isExisting={true}
        />
      )}
      ListFooterComponent={
        <AddNewPlayer
          setShowAddNewPlayer={setShowAddNewPlayer}
          showAddNewPlayer={showAddNewPlayer}
          handleSelect={HandleSelect}
        />
      }
    />
  )
}

export default AddPlayer
