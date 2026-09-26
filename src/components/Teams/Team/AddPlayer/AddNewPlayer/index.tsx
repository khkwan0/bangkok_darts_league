import {View} from 'react-native'
import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import TextInput from '@/components/TextInput'
import {useTranslation} from 'react-i18next'
import {useColorScheme} from 'react-native'
import React from 'react'
import {useNavigation} from "expo-router/react-navigation"
import {useLeague} from '@/hooks'
import {useRouter, useLocalSearchParams} from 'expo-router'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'

export default function AddNewPlayer() {
  const {t} = useTranslation()
  const colorScheme = useColorScheme()
  const [nickname, setNickname] = React.useState('')
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [err, setErr] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const navigation = useNavigation()
  const league = useLeague()
  const router = useRouter()
  const {teamIdParams, returnPath} = useLocalSearchParams()
  const teamId = JSON.parse(teamIdParams as string).teamId

  function HandleClear() {
    setNickname('')
    setFirstName('')
    setLastName('')
    setEmail('')
    setErr('')
  }

  async function HandleSave() {
    try {
      setErr('')
      if (nickname && nickname.length > 1) {
        setLoading(true)
        const res = await league.SaveNewPlayer(
          nickname,
          firstName,
          lastName,
          email,
        )
        if (typeof res.status !== 'undefined' && res.status === 'ok') {
          if (
            typeof res.data !== 'undefined' &&
            typeof res.data.playerId !== 'undefined' &&
            res.data.playerId
          ) {
            const res2 = await league.AddPlayerToTeam(res.data.playerId, teamId)
            if (res2.status === 'ok') {
              // If returnPath is provided, use it; otherwise go back to previous screen
              if (returnPath) {
                router.dismissTo({
                  pathname: returnPath as string,
                  params: {params: JSON.stringify({teamId})},
                })
              } else {
                // Go back to previous screen (typically AddPlayer screen)
                router.back()
              }
            } else {
              setErr(t('error_saving_player'))
            }
          } else {
            setErr(t('error_saving_player'))
          }
        } else if (typeof res.status !== 'undefined' && res.status === 'err') {
          if (typeof res.msg !== 'undefined') {
            setErr(res.msg)
          } else {
            setErr(t('error_saving_player'))
          }
        }
      } else {
        setErr('too_short')
      }
    } catch (e) {
      console.log(e)
      setErr('server_error')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    navigation.setOptions({
      title: t('add_new_player'),
    })
  }, [])

  return (
    <View className="px-2">
      <View className="my-4 mx-2">
        <Text>nickname_required</Text>
        <TextInput
          onChangeText={setNickname}
          autoCapitalize="none"
          leftIcon={MaterialCommunityIcons}
          leftIconProps={{name: 'account-outline'}}
          iconSize={22}
          value={nickname}
          placeholder={t('nickname')}
          placeholderTextColor={colorScheme === 'dark' ? '#999' : '#333'}
        />
      </View>
      <View className="my-4 mx-2">
        <Text>first_name_label</Text>
        <TextInput
          onChangeText={setFirstName}
          autoCapitalize="none"
          leftIcon={MaterialCommunityIcons}
          leftIconProps={{name: 'code-string'}}
          iconSize={22}
          value={firstName}
          placeholder={t('first_name')}
          placeholderTextColor={colorScheme === 'dark' ? '#999' : '#333'}
        />
      </View>
      <View className="my-4 mx-2">
        <Text>last_name_label</Text>
        <TextInput
          onChangeText={setLastName}
          autoCapitalize="none"
          leftIcon={MaterialCommunityIcons}
          leftIconProps={{name: 'code-string'}}
          iconSize={22}
          value={lastName}
          placeholder={t('last_name')}
          placeholderTextColor={colorScheme === 'dark' ? '#999' : '#333'}
        />
      </View>
      <View className="my-4 mx-2">
        <Text>email_optional</Text>
        <TextInput
          onChangeText={setEmail}
          autoCapitalize="none"
          leftIcon={MaterialCommunityIcons}
          leftIconProps={{name: 'email-outline'}}
          iconSize={22}
          value={email}
          placeholder={t('email_placeholder')}
          placeholderTextColor={colorScheme === 'dark' ? '#999' : '#333'}
        />
      </View>
      <View>
        <Text className="text-center" type="defaultSemiBold" lightColor="#f00">
          {err ?? ''}
        </Text>
      </View>
      <View className="flex-row">
        <View className="flex-1 mx-10">
          <Button onPress={() => HandleClear()} disabled={loading}>
            cancel
          </Button>
        </View>
        <View className="flex-1 mx-10">
          <Button onPress={() => HandleSave()} disabled={loading}>
            save
          </Button>
        </View>
      </View>
    </View>
  )
}
