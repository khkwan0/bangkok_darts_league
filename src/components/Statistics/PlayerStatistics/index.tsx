import {
  Modal,
  View,
  Pressable,
  FlatList,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import StatsScopeChips from '@/components/Statistics/StatsScopeChips'
import React from 'react'
import {useNavigation} from 'expo-router/react-navigation'
import {useTranslation} from 'react-i18next'
import {useLeague} from '@/hooks/useLeague'
import {useLeagueContext} from '@/context/LeagueContext'
import {useStatsScope} from '@/context/StatsScopeContext'
import {useNetwork} from '@/hooks/useNetwork'
import {usePathname, router} from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import TextInput from '@/components/TextInput'
import TrieSearch from 'trie-search'

type PlayerStatsType = {
  name: string
  totalGames: number
  totalWins: number
  playerId: number
  rank: number
  played: number
  won: number
  tons?: number
  heavyTons?: number
  closes?: number
  legs?: number
  rawPerfDisp: number
  adjPerfDisp: number
}

type LeagueGameTypeOption = {
  code: string
  label: string
}

function StatsHeader({
  setShowFilters,
  showFilters,
  setGameType,
  gameType,
  setGameVariety,
  gameVariety,
  setMinimumGames,
  minimumGames,
  setNameFilter,
  nameFilter,
  loading,
  gameTypeOptions,
}: {
  setShowFilters: (showFilters: boolean) => void
  showFilters: boolean
  setGameType: (gameType: string) => void
  gameType: string
  setGameVariety: (gameVariety: string) => void
  gameVariety: string
  setMinimumGames: (minimumGames: string) => void
  minimumGames: string
  setNameFilter: (nameFilter: string) => void
  nameFilter: string
  loading: boolean
  gameTypeOptions: LeagueGameTypeOption[]
}) {
  const {t} = useTranslation()

  return (
    <>
      <Pressable
        onPress={() => setShowFilters(!showFilters)}
        className="flex-row items-center justify-center">
        <MaterialIcons
          name="filter-list"
          size={24}
          color={useColorScheme.name === 'dark' ? 'white' : 'black'}
          style={{margin: 10}}
        />
        <Text type="subtitle">
          {showFilters ? t('hide_filters') : t('show_filters')}
        </Text>
      </Pressable>
      {showFilters && (
        <PlayerStatsHeader
          setGameType={setGameType}
          gameType={gameType}
          setGameVariety={setGameVariety}
          gameVariety={gameVariety}
          setMinimumGames={setMinimumGames}
          minimumGames={minimumGames}
          setNameFilter={setNameFilter}
          nameFilter={nameFilter}
          loading={loading}
          gameTypeOptions={gameTypeOptions}
        />
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row items-center py-3 px-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg mb-2 min-w-full">
          <View style={{width: 36}}>
            <Text className="font-bold">{t('rank')}</Text>
          </View>
          <View style={{width: 110}}>
            <Text className="font-bold">{t('name')}</Text>
          </View>
          <View style={{width: 44}} className="items-center">
            <Text className="font-bold text-xs">{t('played')}</Text>
          </View>
          <View style={{width: 44}} className="items-center">
            <Text className="font-bold text-xs">{t('won')}</Text>
          </View>
          <View style={{width: 40}} className="items-center">
            <Text className="font-bold text-xs">{t('legs')}</Text>
          </View>
          <View style={{width: 40}} className="items-center">
            <Text className="font-bold text-xs">{t('stat_abbr_tons')}</Text>
          </View>
          <View style={{width: 44}} className="items-center">
            <Text className="font-bold text-xs">{t('stat_abbr_heavy')}</Text>
          </View>
          <View style={{width: 40}} className="items-center">
            <Text className="font-bold text-xs">{t('stat_abbr_closes')}</Text>
          </View>
          <View style={{width: 52}} className="items-center">
            <Text className="font-bold text-xs">{t('adj_perf')}</Text>
          </View>
        </View>
      </ScrollView>
    </>
  )
}

function PlayerListing({data, idx}: {data: PlayerStatsType; idx: number}) {
  const {state: user} = useLeagueContext()
  let textStyle = `text-base`
  const isCurrentUser =
    typeof user.user.id !== 'undefined' && user.user.id === data.playerId
  const currentPath = usePathname()

  if (isCurrentUser) {
    textStyle = `font-bold text-red-500 dark:text-red-500 text-base`
  }

  function handlePress(row: PlayerStatsType) {
    router.push({
      pathname: currentPath + '/Player',
      params: {
        params: JSON.stringify({
          playerId: row.playerId,
        }),
      },
    })
  }

  const rowClass =
    idx % 2 === 0
      ? 'flex-row items-center py-3 px-2 bg-gray-50 dark:bg-gray-900 rounded-md'
      : 'flex-row items-center py-3 px-2 bg-white dark:bg-gray-800 rounded-md'

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Pressable
        onPress={() => handlePress(data)}
        className={rowClass}
        style={{
          minWidth: '100%',
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 1},
          shadowOpacity: 0.1,
          shadowRadius: 1,
          elevation: 1,
        }}>
        <View style={{width: 36}}>
          <Text className={textStyle}>
            {isCurrentUser ? `🔹 ${data.rank}` : data.rank.toString()}
          </Text>
        </View>
        <View style={{width: 110}}>
          <Text className={textStyle} numberOfLines={1}>
            {data.name}
          </Text>
        </View>
        <View style={{width: 44}} className="items-center">
          <Text className={textStyle}>{data.played.toString()}</Text>
        </View>
        <View style={{width: 44}} className="items-center">
          <Text className={textStyle}>{data.won.toString()}</Text>
        </View>
        <View style={{width: 40}} className="items-center">
          <Text className={textStyle}>{String(data.legs ?? 0)}</Text>
        </View>
        <View style={{width: 40}} className="items-center">
          <Text className={textStyle}>{String(data.tons ?? 0)}</Text>
        </View>
        <View style={{width: 44}} className="items-center">
          <Text className={textStyle}>{String(data.heavyTons ?? 0)}</Text>
        </View>
        <View style={{width: 40}} className="items-center">
          <Text className={textStyle}>{String(data.closes ?? 0)}</Text>
        </View>
        <View style={{width: 52}} className="items-center">
          <Text className={textStyle}>{data.adjPerfDisp.toString()}</Text>
        </View>
      </Pressable>
    </ScrollView>
  )
}

function PlayerStatsHeader({
  setGameType,
  gameType,
  setGameVariety,
  gameVariety,
  setMinimumGames,
  minimumGames,
  setNameFilter,
  nameFilter,
  loading,
  gameTypeOptions,
}: {
  setGameType: (gameType: string) => void
  gameType: string
  setGameVariety: (gameVariety: string) => void
  gameVariety: string
  setMinimumGames: (minimumGames: string) => void
  minimumGames: string
  setNameFilter: (nameFilter: string) => void
  nameFilter: string
  loading: boolean
  gameTypeOptions: LeagueGameTypeOption[]
}) {
  const {t} = useTranslation()
  const colorScheme = useColorScheme()

  const tabStyle = (isActive: boolean) =>
    `flex-row justify-center items-center py-3 px-3 mx-1 rounded-lg ${
      isActive
        ? colorScheme === 'dark'
          ? 'bg-blue-800'
          : 'bg-blue-100'
        : colorScheme === 'dark'
          ? 'bg-gray-800'
          : 'bg-gray-100'
    }`

  const textStyle = (isActive: boolean) =>
    `text-center font-bold ${
      isActive ? (colorScheme === 'dark' ? 'text-white' : 'text-blue-800') : ''
    }`

  return (
    <View>
      <View className="bg-white dark:bg-gray-900 p-4 rounded-lg mb-4">
        <Text className="text-xl font-bold mb-2">{t('game_type')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row">
            <Pressable
              disabled={loading}
              onPress={() => setGameType('')}
              className={tabStyle(gameType === '')}>
              <Text className={textStyle(gameType === '')}>{t('all')}</Text>
            </Pressable>
            {gameTypeOptions.map(opt => (
              <Pressable
                key={opt.code}
                disabled={loading}
                onPress={() => setGameType(opt.code)}
                className={tabStyle(gameType === opt.code)}>
                <Text className={textStyle(gameType === opt.code)}>
                  {opt.label || opt.code}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
      <View className="bg-white dark:bg-gray-900 p-4 rounded-lg mb-4">
        <Text className="text-xl font-bold mb-2">{t('game_variety')}</Text>
        <View className="flex-row justify-between">
          <Pressable
            disabled={loading}
            onPress={() => setGameVariety('both')}
            className={`flex-1 ${tabStyle(gameVariety === 'both')}`}>
            <Text className={textStyle(gameVariety === 'both')}>
              {t('both')}
            </Text>
          </Pressable>
          <Pressable
            disabled={loading}
            onPress={() => setGameVariety('singles')}
            className={`flex-1 ${tabStyle(gameVariety === 'singles')}`}>
            <Text className={textStyle(gameVariety === 'singles')}>
              {t('singles')}
            </Text>
          </Pressable>
          <Pressable
            disabled={loading}
            onPress={() => setGameVariety('doubles')}
            className={`flex-1 ${tabStyle(gameVariety === 'doubles')}`}>
            <Text className={textStyle(gameVariety === 'doubles')}>
              {t('doubles')}
            </Text>
          </Pressable>
        </View>
      </View>
      <View className="bg-white dark:bg-gray-900 p-4 rounded-lg mb-2">
        <View className="flex-row">
          <View className="flex-1">
            <View className="mb-2">
              <Text className="text-xl font-bold">{t('minimum_games')}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <TextInput
                  disabled={loading}
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700"
                  value={minimumGames}
                  onChangeText={setMinimumGames}
                />
              </View>
              <View className="flex-1">
                <Pressable
                  onPress={() => setMinimumGames('20')}
                  className="py-4 border border-gray-300 dark:border-gray-700 rounded-lg mr-4">
                  <Text className="text-center">{t('reset')}: 20</Text>
                </Pressable>
              </View>
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold mb-2">
              {t('filter_by_name')}
            </Text>
            <TextInput
              disabled={loading}
              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700"
              value={nameFilter}
              onChangeText={setNameFilter}
            />
          </View>
        </View>
      </View>
    </View>
  )
}

export default function PlayerStatistics({
  embedded = false,
}: {
  embedded?: boolean
} = {}) {
  const navigation = useNavigation()
  const {t} = useTranslation()
  const {scope} = useStatsScope()
  const {Get} = useNetwork()
  const [minimumGames, setMinimumGames] = React.useState('20')
  const [nameFilter, setNameFilter] = React.useState('')
  const [gameVariety, setGameVariety] = React.useState('both')
  const [playerStats, setPlayerStats] = React.useState<PlayerStatsType[]>([])
  const [gameType, setGameType] = React.useState('')
  const [gameTypeOptions, setGameTypeOptions] = React.useState<
    LeagueGameTypeOption[]
  >([])
  const league = useLeague()
  const [showFilters, setShowFilters] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const trie = React.useRef(new TrieSearch<any>('name'))
  const originalStats = React.useRef([])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await Get('/league-game-types')
        if (cancelled) return
        const rows = Array.isArray(res) ? res : []
        setGameTypeOptions(
          rows
            .map((row: any) => ({
              code: String(row?.code ?? '').trim(),
              label: String(row?.label ?? row?.code ?? '').trim(),
            }))
            .filter((row: LeagueGameTypeOption) => row.code.length > 0),
        )
      } catch (e) {
        console.error(e)
        if (!cancelled) setGameTypeOptions([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [Get])

  async function getPlayerStats() {
    try {
      setLoading(true)
      const res = await league.GetPlayerStats(
        null,
        parseInt(minimumGames),
        gameType,
        gameVariety,
      )
      setPlayerStats(res)
      originalStats.current = res
      trie.current.reset()
      trie.current.addAll(res)
      setNameFilter('')
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (embedded) return
    navigation.setOptions({
      title: t('player_statistics'),
    })
  }, [navigation, embedded, t])

  React.useEffect(() => {
    getPlayerStats()
  }, [gameType, gameVariety, minimumGames, scope])

  React.useEffect(() => {
    if (nameFilter) {
      const results = trie.current.search(nameFilter)
      setPlayerStats(results)
    } else {
      setPlayerStats(originalStats.current)
    }
  }, [nameFilter])

  return (
    <>
      <Modal visible={loading} transparent={true}>
        <View className="flex-1 items-center justify-center bg-gray-50/50 dark:bg-gray-950/50">
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </Modal>
      <View className="flex-1 p-4 bg-gray-50 dark:bg-gray-950">
        <StatsScopeChips />
        <View className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden flex-1">
          <FlatList
            data={playerStats}
            ListHeaderComponent={
              <StatsHeader
                setShowFilters={setShowFilters}
                showFilters={showFilters}
                setGameType={setGameType}
                gameType={gameType}
                setGameVariety={setGameVariety}
                gameVariety={gameVariety}
                setMinimumGames={setMinimumGames}
                minimumGames={minimumGames}
                setNameFilter={setNameFilter}
                nameFilter={nameFilter}
                loading={loading}
                gameTypeOptions={gameTypeOptions}
              />
            }
            contentContainerStyle={{padding: 8}}
            ItemSeparatorComponent={() => <View style={{height: 8}} />}
            renderItem={({
              item,
              index,
            }: {
              item: PlayerStatsType
              index: number
            }) => <PlayerListing data={item} idx={index} />}
          />
        </View>
      </View>
    </>
  )
}
