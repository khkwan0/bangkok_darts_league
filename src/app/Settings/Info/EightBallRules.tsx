import React from 'react'
import {FlatList, View as RNView} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLocalSearchParams} from 'expo-router'
import {useTranslation} from 'react-i18next'
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
          {props.rule.rule}
        </Text>
      </View>
    </View>
  )
}

export default function EightBallRules() {
  const {t} = useTranslation()
  const {params} = useLocalSearchParams()
  const allRules = React.useMemo(
    () => JSON.parse(String(params)).rules,
    [params],
  )
  const [rules, setRules] = React.useState([])

  React.useEffect(() => {
    const _rules = allRules.filter(
      (rule: {section: string}) => rule.section === '8 Ball',
    )
    setRules(_rules)
  }, [allRules])

  return (
    <View className="flex-1">
      <Stack.Screen options={{title: t('eight_ball_rules')}} />
      <FlatList
        className="py-2"
        keyExtractor={(item, index) => index.toString()}
        data={rules}
        renderItem={({item, index}) => <Rule rule={item} idx={index} />}
      />
    </View>
  )
}
