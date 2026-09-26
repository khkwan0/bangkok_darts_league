import React from 'react'
import MCI from 'react-native-vector-icons/MaterialCommunityIcons'
import {useLeague} from '@/hooks'
import {useTranslation} from 'react-i18next'
import {ThemedView as View} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'
import {Pressable, ScrollView} from 'react-native'
import Row from '@/components/Row'
import {useRouter} from 'expo-router'
import {useTheme, useNavigation} from "expo-router/react-navigation"

interface MenuItemProps {
  title: string
  icon: string
  onPress: () => void
}

const SECTION_ICONS: Record<string, string> = {
  '8 Ball': 'numeric-8-circle',
  '9 Ball': 'numeric-9-circle',
  Cricket: 'bullseye-arrow',
  '307': 'numeric-3-circle',
  '507': 'numeric-5-circle',
  'Doubles Play': 'account-multiple',
}

const SECTION_TITLE_KEYS: Record<string, string> = {
  '8 Ball': 'eight_ball_rules',
  '9 Ball': 'nine_ball_rules',
  Cricket: 'cricket_rules',
  '307': 'three_oh_seven_rules',
  '507': 'five_oh_seven_rules',
  'Doubles Play': 'doubles_play_rules',
}

export default function Info() {
  const router = useRouter()
  const [rules, setRules] = React.useState<{section: string}[]>([])
  const league = useLeague()
  const {t} = useTranslation()
  const {colors} = useTheme()
  const navigation = useNavigation()

  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: t('info_and_guides'),
    })
  }, [navigation, t])

  async function GetRules() {
    try {
      const res = await league.GetRules()
      if (typeof res.status !== 'undefined' && res.status === 'ok') {
        setRules(res.data)
      }
    } catch (e) {
      console.log(e)
    }
  }
  React.useEffect(() => {
    GetRules()
  }, [])

  const sections = React.useMemo(() => {
    const seen = new Set<string>()
    const ordered: string[] = []
    for (const rule of rules) {
      if (!rule.section || seen.has(rule.section)) continue
      seen.add(rule.section)
      ordered.push(rule.section)
    }
    return ordered
  }, [rules])

  const MenuItem = ({title, icon, onPress}: MenuItemProps) => (
    <Pressable
      onPress={onPress}
      className="py-4 px-4 mb-2 rounded-xl"
      style={{backgroundColor: colors.card}}>
      <Row alignItems="center">
        <View className="w-10">
          <MCI name={icon} size={24} color={colors.text} />
        </View>
        <View flex={1}>
          <Text className="font-bold text-lg">{title}</Text>
        </View>
        <MCI name="chevron-right" size={24} color={colors.text} />
      </Row>
    </Pressable>
  )

  return (
    <ScrollView className="flex-1 px-4 py-2">
      <View className="space-y-4">
        <MenuItem
          title={t('privacy_policy')}
          icon="shield-account"
          onPress={() =>
            router.push({
              pathname: '/Settings/Info/PrivacyPolicy',
            })
          }
        />
        {sections.map(section => {
          const titleKey = SECTION_TITLE_KEYS[section]
          const title = titleKey ? t(titleKey) : section
          return (
            <MenuItem
              key={section}
              title={title === titleKey ? section : title}
              icon={SECTION_ICONS[section] || 'book-open-page-variant'}
              onPress={() =>
                router.push({
                  pathname: '/Settings/Info/RulesSection',
                  params: {
                    section,
                    title: title === titleKey ? section : title,
                    params: JSON.stringify({rules}),
                  },
                })
              }
            />
          )
        })}
        <MenuItem
          title={t('order_of_play')}
          icon="order-numeric-ascending"
          onPress={() =>
            router.push({
              pathname: '/Settings/Info/Order',
            })
          }
        />
      </View>
    </ScrollView>
  )
}
