import {TouchableOpacity, View} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {Player} from './types'
import {router} from 'expo-router'
import {useColorScheme} from 'nativewind'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'

export default function PlayerCard({player}: {player: Player}) {
  const {colorScheme} = useColorScheme()
  const isDark = colorScheme === 'dark'

  function HandlePlayerPress() {
    router.push({
      pathname: `./Players/PlayerInfo`,
      params: {params: JSON.stringify({playerId: player.player_id})},
    })
  }

  const cardClassName = isDark
    ? 'mx-4 my-2 p-4 rounded-xl shadow bg-slate-800 border border-slate-700'
    : 'mx-4 my-2 p-4 rounded-xl shadow bg-white border border-slate-200'

  const iconButtonClassName = isDark
    ? 'p-3 rounded-full bg-slate-700'
    : 'p-3 rounded-full bg-slate-200'

  return (
    <View className={cardClassName}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text type="defaultSemiBold" className="mb-1">
            {player.nickname}
          </Text>
          <View className="flex-row items-center">
            <Text className="text-slate-600 dark:text-slate-300">
              {player.firstname}
              {player.lastname ? ` ${player.lastname[0]}` : ''}
            </Text>
            {player.flag && <Text className="ml-2">{player.flag}</Text>}
          </View>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            #{player.player_id.toString()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => HandlePlayerPress()}
          className={iconButtonClassName}>
          <MaterialIcons
            name="visibility"
            size={22}
            color={isDark ? '#e2e8f0' : '#334155'}
          />
        </TouchableOpacity>
      </View>
    </View>
  )
}
