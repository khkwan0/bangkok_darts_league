import React, {useRef, useState, useEffect} from 'react'
import {FlatList, View, TextInput} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import TrieSearch from 'trie-search'
import {useLeague} from '@/hooks/useLeague'
import {useNavigation} from 'expo-router'
import {useTranslation} from 'react-i18next'
import PlayerCard from '@/components/Players/PlayerCard'
import {Player} from './types'
import CustomTextInput from '@/components/TextInput'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'

function SearchInputComponent({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string
  setSearchQuery: (query: string) => void
}) {
  const {t} = useTranslation()
  return (
    <View className="p-2.5 bg-transparent z-10">
      <CustomTextInput
        placeholder={t('search_by_name')}
        value={searchQuery}
        onChangeText={text => setSearchQuery(text)}
        leftIcon={MaterialCommunityIcons}
        leftIconProps={{name: 'magnify'}}
        autoCorrect={false}
        spellCheck={false}
      />
    </View>
  )
}

export default function Players() {
  const league = useLeague()
  const navigation = useNavigation()
  const {t} = useTranslation()
  const [players, setPlayers] = useState<Player[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const trie = useRef<any>(
    new TrieSearch(['nickname', 'first_name', 'last_name']),
  )

  React.useEffect(() => {
    navigation.setOptions({
      title: t('players'),
    })
  }, [navigation, t])

  React.useEffect(() => {
    fetchPlayers()
  }, [])

  // Effect to filter players when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPlayers(players)
    } else {
      const results = trie.current.search(searchQuery)
      setFilteredPlayers(results)
    }
  }, [searchQuery, players])

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      const response = await league.GetAllPlayers()
      if (response && Array.isArray(response.data)) {
        const playerData = response.data as Player[]
        setPlayers(playerData)
        setFilteredPlayers(playerData)
        trie.current.addAll(playerData)
      }
    } catch (error) {
      console.error('Failed to fetch players:', error)
      setError(t('failed_to_fetch_players'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1">
      <SearchInputComponent
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <FlatList
        data={filteredPlayers}
        refreshing={loading}
        onRefresh={fetchPlayers}
        renderItem={({item}) => <PlayerCard player={item} />}
        keyExtractor={item => item.player_id.toString()}
        ListEmptyComponent={<Text>{t('no_players_found')}</Text>}
        contentContainerStyle={{flexGrow: 1}}
      />
    </View>
  )
}
