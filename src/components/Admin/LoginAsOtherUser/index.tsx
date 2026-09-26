import {useState, useEffect, useRef} from 'react'
import {
  View,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import {useNavigation} from 'expo-router'
import {ThemedText as Text} from '@/components/ThemedText'
import {useAccount} from '@/hooks/useAccount'
import {useLeague} from '@/hooks/useLeague'
import {router} from 'expo-router'
import Button from '@/components/Button'
import {useTranslation} from 'react-i18next'
import TrieSearch from 'trie-search'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'

type UserType = {
  id: number
  nickname: string
  first_name?: string
  last_name?: string
  profile_picture?: string
}

export default function LoginAsOtherUser() {
  const navigation = useNavigation()
  const {t} = useTranslation()
  const {AdminLogin} = useAccount()
  const league = useLeague()
  const [userId, setUserId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<UserType[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loginInProgress, setLoginInProgress] = useState(false)

  // Create a trie search instance with the keys we want to search on
  const trie = useRef<any>(
    new TrieSearch(['nickname', 'first_name', 'last_name']),
  )

  useEffect(() => {
    navigation.setOptions({
      title: t('login_as_other_user'),
    })
  }, [navigation, t])

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (searchQuery.length > 0) {
      const results = trie.current.search(searchQuery) as UserType[]
      setFilteredUsers(results)
    } else {
      setFilteredUsers([])
    }
  }, [searchQuery])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await league.GetAllPlayers()
      if (response && Array.isArray(response.data)) {
        const userData = response.data as UserType[]
        setUsers(userData)
        trie.current.addAll(userData)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setError(t('failed_to_fetch_users'))
    } finally {
      setLoading(false)
    }
  }

  const handleLoginById = async () => {
    if (!userId) {
      setError(t('please_enter_user_id'))
      return
    }

    try {
      setLoginInProgress(true)
      setError('')
      const result = await AdminLogin(userId)
      if (result?.status === 'ok') {
        router.dismissTo('/Settings')
      } else {
        setError(t('login_failed'))
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(t('login_failed'))
    } finally {
      setLoginInProgress(false)
    }
  }

  const handleUserSelect = async (userId: number) => {
    try {
      setLoginInProgress(true)
      setError('')
      const result = await AdminLogin(userId)
      if (result?.status === 'ok') {
        router.dismissTo('/Settings')
      } else {
        setError(t('login_failed'))
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(t('login_failed'))
    } finally {
      setLoginInProgress(false)
    }
  }

  const UserCard = ({user}: {user: UserType}) => (
    <Pressable
      className="flex-row items-center p-4 border-b border-gray-200 dark:border-gray-700"
      onPress={() => handleUserSelect(user.id)}
      disabled={loginInProgress}>
      <View className="flex-1">
        <Text className="font-medium">{user.nickname}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {user.first_name} {user.last_name}
        </Text>
        <Text className="text-xs text-gray-400 dark:text-gray-500">
          ID: {user.id}
        </Text>
      </View>
      <MaterialCommunityIcons name="login" size={20} color="#666" />
    </Pressable>
  )

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 p-4">
      <ScrollView className="flex-1 p-4">
        <View className="mb-6">
          <Text className="text-lg font-bold mb-4">
            {t('login_by_user_id')}
          </Text>
          <View className="flex-row">
            <TextInput
              className="flex-1 border p-3 rounded-l-lg dark:bg-gray-800 dark:text-white dark:border-gray-700"
              placeholder={t('enter_user_id')}
              value={userId}
              onChangeText={setUserId}
              keyboardType="numeric"
              editable={!loginInProgress}
            />
            <Button
              onPress={handleLoginById}
              disabled={loginInProgress || !userId}
              className="bg-blue-600 active:bg-blue-700 py-3 px-4 rounded-r-lg items-center">
              {loginInProgress ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white">{t('login')}</Text>
              )}
            </Button>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-lg font-bold mb-4">{t('search_users')}</Text>
          <TextInput
            className="border p-3 rounded-lg mb-4 dark:bg-gray-800 dark:text-white dark:border-gray-700"
            placeholder={t('search_by_name')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            editable={!loginInProgress && !loading}
          />
        </View>

        {error ? (
          <View className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg mb-4 border border-red-200 dark:border-red-800">
            <Text className="text-red-600 dark:text-red-400 text-center">
              {error}
            </Text>
          </View>
        ) : null}

        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" />
            <Text className="mt-2">{t('loading')}</Text>
          </View>
        ) : (
          <View>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <UserCard key={`user-${user.id}`} user={user} />
              ))
            ) : searchQuery.length > 0 ? (
              <Text className="text-center py-4">{t('no_users_found')}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
