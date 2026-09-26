import {TouchableOpacity, View} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'

export default function CompletedMatchesHeader({
  setShowAllByDate,
  setShowAllByTeam,
}: {
  setShowAllByDate: (showAllByDate: boolean) => void
  setShowAllByTeam: (showAllByTeam: boolean) => void
}) {
  return (
    <View className="flex-row items-center justify-between">
      <TouchableOpacity onPress={() => showAllByDate()}>
        <Text>show_all_by_date</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => showAllByTeam()}>
        <Text>show_all_by_date</Text>
      </TouchableOpacity>
    </View>
  )
}
