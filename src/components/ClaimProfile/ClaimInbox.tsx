import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView} from '@/components/ThemedView'
import Button from '@/components/Button'
import {usePlayerClaim, type ClaimRequest} from '@/hooks/usePlayerClaim'
import {useNavigation} from 'expo-router/react-navigation'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  View,
} from 'react-native'

export default function ClaimInbox() {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const navigation = useNavigation()
  const {listInbox, approve, deny} = usePlayerClaim()
  const [items, setItems] = React.useState<ClaimRequest[]>([])
  const [loading, setLoading] = React.useState(true)
  const [actingId, setActingId] = React.useState<number | null>(null)

  React.useEffect(() => {
    navigation.setOptions({title: t('profile_claims')})
  }, [navigation, t])

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await listInbox()
      setItems(res.data)
    } finally {
      setLoading(false)
    }
  }, [listInbox])

  React.useEffect(() => {
    void load()
  }, [load])

  async function handleApprove(id: number) {
    setActingId(id)
    try {
      const res = await approve(id)
      if (res.status !== 'ok') {
        Alert.alert(t('error'), t(`claim_error_${res.error}`) || res.error)
        return
      }
      await load()
    } finally {
      setActingId(null)
    }
  }

  async function handleDeny(id: number) {
    setActingId(id)
    try {
      const res = await deny(id)
      if (res.status !== 'ok') {
        Alert.alert(t('error'), t(`claim_error_${res.error}`) || res.error)
        return
      }
      await load()
    } finally {
      setActingId(null)
    }
  }

  return (
    <ThemedView className="flex-1 p-4">
      <Text className="mb-3 opacity-80">{t('profile_claims_hint')}</Text>
      {loading && items.length === 0 ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => void load()} />
          }
          ListEmptyComponent={
            <Text className="opacity-70">{t('profile_claims_empty')}</Text>
          }
          renderItem={({item}) => (
            <View
              className="mb-3 p-3 rounded-lg"
              style={{backgroundColor: colors.card}}>
              <Text className="font-semibold text-base">
                {item.claimant_nickname ?? `#${item.claimant_player_id}`}
              </Text>
              <Text className="opacity-70 mt-1">
                {t('claim_wants_to_claim')}:{' '}
                {item.shell_nickname ?? `#${item.shell_player_id}`}
              </Text>
              {item.shell_teams && item.shell_teams.length > 0 ? (
                <Text className="opacity-70 mt-1 text-sm">
                  {item.shell_teams.map(tm => tm.name).join(', ')}
                </Text>
              ) : null}
              <View className="flex-row gap-2 mt-3">
                <View className="flex-1">
                  <Button
                    small
                    disabled={actingId === item.id}
                    onPress={() => void handleApprove(item.id)}>
                    {t('approve')}
                  </Button>
                </View>
                <View className="flex-1">
                  <Button
                    small
                    type="outline"
                    disabled={actingId === item.id}
                    onPress={() => void handleDeny(item.id)}>
                    {t('deny')}
                  </Button>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </ThemedView>
  )
}
