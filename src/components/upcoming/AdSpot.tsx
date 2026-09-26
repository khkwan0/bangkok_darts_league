import React from 'react'
import {Pressable, useColorScheme, Linking, Image, Dimensions} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeague} from '@/hooks/useLeague'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useAd} from '@/hooks'

export default function AdSpot(props: any) {
  const league = useLeague()
  const [title, setTitle] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [showFull, setShowFull] = React.useState(false)
  const [adId, setAdId] = React.useState('')
  const [image, setImage] = React.useState(null)
  const [noAd, setNoAd] = React.useState(false)
  const colorScheme = useColorScheme()
  const adHook = useAd()
  const width = Dimensions.get('window').width

  React.useEffect(() => {
    async function GetAd() {
      try {
        const res = await adHook.GetAdSpot(props.item.index)
        if (typeof res?.title === 'string') {
          setTitle(res.title)
        }
        if (typeof res?.message === 'string') {
          setMessage(res.message)
        }
        if (typeof res?.title === 'undefined') {
          setNoAd(true)
        }
        if (typeof res?.id !== 'undefined') {
          setAdId(res.id)
        }
        if (typeof res?.background !== 'undefined') {
          setImage(res.background)
        }
      } catch (e) {
        console.log(e)
        setNoAd(true)
      }
    }
    GetAd()
  }, [])

  if (noAd) {
    return null
  }

  async function HandleClick() {
    if (typeof adId !== 'undefined') {
      const res = await adHook.HandleClick(adId)
      if (
        typeof res?.status === 'string' &&
        res.status === 'ok' &&
        typeof res.url === 'string'
      ) {
        Linking.openURL(res.url)
      }
    }
  }

  return (
    <View
      style={{
        margin: 10,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
      {!showFull && (
        <Pressable onPress={() => setShowFull(true)}>
          <View className="flex-row justify-between">
            <View className="flex-4 items-center">
              <Text>{title}</Text>
            </View>
            <View className="flex-1 items-end">
              <MCI
                name="plus-circle"
                size={24}
                color={colorScheme === 'dark' ? 'white' : 'black'}
              />
            </View>
          </View>
        </Pressable>
      )}
      {showFull && (
        <Pressable onPress={() => HandleClick()}>
          <View className="flex-row justify-between">
            <View className="flex-4 items-center">
              <Text>{title}</Text>
            </View>
            <Pressable onPress={() => setShowFull(!showFull)}>
              <MCI
                name="minus-circle"
                size={24}
                color={colorScheme === 'dark' ? 'white' : 'black'}
              />
            </Pressable>
          </View>
          <View>
            <Text>{message}</Text>
          </View>
          {image && showFull && (
            <Image
              resizeMode="contain"
              source={{uri: image}}
              width={width * 0.9}
              height={width}
            />
          )}
        </Pressable>
      )}
    </View>
  )
}
