import {formatForumDate} from '@/components/Forums/formatForumDate'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useReleaseNotes, type ReleaseNote} from '@/hooks/useReleaseNotes'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useRouter} from 'expo-router'
import {useNavigation, useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View as RNView,
} from 'react-native'

export default function ReleaseNotesScreen() {
  const {t, i18n} = useTranslation()
  const navigation = useNavigation()
  const router = useRouter()
  const {colors} = useTheme()
  const {listPublic} = useReleaseNotes()
  const [items, setItems] = React.useState<ReleaseNote[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    navigation.setOptions({title: t('release_notes')})
  }, [navigation, t])

  const load = React.useCallback(async () => {
    try {
      setError(null)
      const result = await listPublic()
      if (result.error) {
        setError(t('release_notes_load_error'))
        setItems([])
      } else {
        setItems(result.items)
      }
    } catch (e) {
      console.error(e)
      setError(t('release_notes_load_error'))
      setItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [listPublic, t])

  React.useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 px-4 pt-2"
      contentContainerStyle={{flexGrow: 1}}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void load()
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }>
      {error ? (
        <View className="flex-1 items-center justify-center px-6 py-12">
          <Text className="text-center text-red-500">{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center py-12">
          <MCI name="text-box-outline" size={48} color={colors.text} style={{opacity: 0.35}} />
          <Text className="mt-4 text-center opacity-60">{t('release_notes_empty')}</Text>
        </View>
      ) : (
        items.map(item => (
          <Pressable
            key={item.id}
            onPress={() =>
              router.push({
                pathname: '/Settings/ReleaseNotes/[id]',
                params: {id: String(item.id)},
              })
            }
            className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-gray-800/10 dark:border-slate-700">
            <RNView className="flex-row items-start px-4 py-3.5">
              <RNView className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-sky-500/15">
                <MCI name="text-box-outline" size={22} color="#0284C7" />
              </RNView>
              <RNView className="flex-1">
                <Text className="text-xs font-semibold uppercase opacity-60">
                  {t(`release_notes_kind_${item.kind}`)}
                </Text>
                <Text className="font-semibold">{item.title}</Text>
                {item.preview ? (
                  <Text className="mt-1 text-sm opacity-60" numberOfLines={2}>
                    {item.preview}
                  </Text>
                ) : null}
                <Text className="mt-2 text-xs opacity-50">
                  {formatForumDate(item.created_at, i18n.language)}
                </Text>
              </RNView>
              <MCI name="chevron-right" size={22} color={colors.text} style={{opacity: 0.4}} />
            </RNView>
          </Pressable>
        ))
      )}
    </ScrollView>
  )
}
