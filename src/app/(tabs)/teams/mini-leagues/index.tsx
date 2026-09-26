import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import Button from '@/components/Button'
import {useLeagueContext} from '@/context/LeagueContext'
import {useMiniLeagues} from '@/hooks/useMiniLeagues'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'
import {useTheme} from 'expo-router/react-navigation'
import {router, useFocusEffect} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
} from 'react-native'

export default function MiniLeaguesScreen() {
  const {t} = useTranslation()
  const api = useMiniLeagues()
  const {setCompetition} = useLeagueContext()
  const {colors} = useTheme()
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [name, setName] = React.useState('')
  const listContentStyle = useTabListContentContainerStyle({
    backgroundColor: colors.background,
  })

  const load = React.useCallback(async () => {
    const res = await api.list()
    if (res?.status === 'ok') {
      setItems(res.data || [])
    }
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true)
      load().finally(() => setLoading(false))
    }, [load]),
  )

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function onCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    setCreating(true)
    try {
      const res = await api.create(trimmed)
      if (res?.status === 'ok' && res.data?.id) {
        setName('')
        await setCompetition({
          type: 'mini',
          id: Number(res.data.id),
          name: res.data.name || trimmed,
        })
        router.push({
          pathname: './[id]',
          params: {id: String(res.data.id)},
        })
      } else {
        Alert.alert(
          t('error'),
          res?.error === 'already_created_mini_league'
            ? t('already_created_mini_league')
            : res?.error || t('mini_league_create_error'),
        )
      }
    } finally {
      setCreating(false)
    }
  }

  async function onRespond(id: number, action: 'accept' | 'decline') {
    const res = await api.respondInvite(id, action)
    if (res?.status === 'ok') {
      await load()
      if (action === 'accept') {
        const row = items.find(i => i.id === id)
        await setCompetition({
          type: 'mini',
          id,
          name: row?.name || t('mini_league'),
        })
      }
    } else {
      Alert.alert(t('error'), res?.error || t('request_failed'))
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View className="flex-1">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-base mb-2 opacity-80">{t('mini_leagues_intro')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('mini_league_name')}
          placeholderTextColor={colors.text + '66'}
          style={{
            borderWidth: 1,
            borderColor: colors.border || '#8884',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: colors.text,
            marginBottom: 8,
          }}
        />
        <Button onPress={onCreate} disabled={creating || !name.trim()}>
          <Text className="text-white">
            {creating ? t('creating') : t('create_mini_league')}
          </Text>
        </Button>
      </View>
      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={listContentStyle}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text className="text-center opacity-60 mt-8 px-4">
            {t('mini_leagues_empty')}
          </Text>
        }
        renderItem={({item}) => (
          <Pressable
            onPress={async () => {
              if (item.member_status === 'active') {
                await setCompetition({
                  type: 'mini',
                  id: item.id,
                  name: item.name,
                })
              }
              router.push({
                pathname: './[id]',
                params: {id: String(item.id)},
              })
            }}
            className="mx-4 my-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <Text className="text-base font-semibold">{item.name}</Text>
            <Text className="text-sm opacity-70 mt-1">
              {item.is_admin ? t('admin') : t('member')}
              {item.member_status === 'pending'
                ? ` · ${t('invite_pending')}`
                : ''}
            </Text>
            {item.member_status === 'pending' ? (
              <View className="flex-row gap-2 mt-3">
                <Button onPress={() => onRespond(item.id, 'accept')}>
                  <Text className="text-white">{t('accept')}</Text>
                </Button>
                <Button
                  type="outline"
                  onPress={() => onRespond(item.id, 'decline')}>
                  decline
                </Button>
              </View>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  )
}
