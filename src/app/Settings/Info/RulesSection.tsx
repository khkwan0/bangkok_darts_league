import React from 'react'
import {FlatList, View as RNView} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLocalSearchParams} from 'expo-router'
import {Stack} from 'expo-router'

interface RuleProps {
  idx: number
  rule: {
    title: string
    rule: string
  }
}

const Rule = (props: RuleProps) => {
  return (
    <View className="mx-4 my-2 p-4 rounded-xl bg-secondary/10">
      <RNView className="flex-row items-center">
        <RNView className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
          <Text className="text-white font-bold">{`${props.idx + 1}`}</Text>
        </RNView>
        <Text className="flex-1 text-lg font-bold">{props.rule.title}</Text>
      </RNView>
      <View className="mt-3 pl-11">
        <Text className="leading-6 text-base opacity-80">
          {props.rule.rule.replace(/<[^>]+>/g, '')}
        </Text>
      </View>
    </View>
  )
}

export default function RulesSection() {
  const {section, title, params} = useLocalSearchParams<{
    section?: string
    title?: string
    params?: string
  }>()
  const allRules = React.useMemo(() => {
    try {
      return JSON.parse(String(params || '{}')).rules || []
    } catch {
      return []
    }
  }, [params])
  const [rules, setRules] = React.useState<
    {title: string; rule: string; section: string}[]
  >([])

  React.useEffect(() => {
    const sectionName = String(section || '')
    setRules(
      allRules.filter(
        (rule: {section: string}) => rule.section === sectionName,
      ),
    )
  }, [allRules, section])

  return (
    <View className="flex-1">
      <Stack.Screen options={{title: String(title || section || 'Rules')}} />
      <FlatList
        className="py-2"
        keyExtractor={(item, index) => `${item.title}-${index}`}
        data={rules}
        renderItem={({item, index}) => <Rule rule={item} idx={index} />}
        ListEmptyComponent={
          <View className="mx-4 my-8">
            <Text className="text-center opacity-70">No rules found</Text>
          </View>
        }
      />
    </View>
  )
}
