import {View} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as Card} from '@/components/ThemedView'
import {formatBangkokDateMed} from '@/lib/bangkokTime'

export interface StatType {
  home_team_name: string
  away_team_name: string
  home_frames: number
  away_frames: number
  date: string
}

export interface StatsCardProps {
  stat: StatType
}

export default function StatsCard({stat}: StatsCardProps) {
  return (
    <Card className="p-4 m-2 rounded-lg">
      <View className="flex-row justify-between">
        <View className="flex-1">
          <Text type="title" className="text-center">
            {stat.home_team_name}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-center">vs</Text>
        </View>
        <View className="flex-1">
          <Text type="title" className="text-center">
            {stat.away_team_name}
          </Text>
        </View>
      </View>
      <View className="flex-row justify-between">
        <View className="flex-1">
          <Text className="text-center text-2xl">
            {stat.home_frames.toString()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-center text-2xl">
            {formatBangkokDateMed(stat.date)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-center text-2xl">
            {stat.away_frames.toString()}
          </Text>
        </View>
      </View>
    </Card>
  )
}
