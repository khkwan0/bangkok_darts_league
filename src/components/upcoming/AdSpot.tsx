import React from 'react'
import {
  Pressable,
  useColorScheme,
  Linking,
  Image,
  Dimensions,
  View,
} from 'react-native'
import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {useAd} from '@/hooks'
import {absoluteSiteUrl} from '@/lib/aiChatThreads'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'

type AdPayload = {
  title?: string
  message?: string
  id?: string | number
  background?: string | null
  clickUrl?: string | null
  empty?: boolean
}

/** Survive FlatList recycle so remounts don't collapse/expand mid-scroll. */
const adCache = new Map<string, AdPayload>()

/** Call before rebuilding the matches list so pull-to-refresh can load new creatives. */
export function clearAdSpotCache() {
  adCache.clear()
}

function cacheKey(index: number, refreshGen: number | string) {
  return `${refreshGen}:${index}`
}

const COLLAPSED_MIN_HEIGHT = 56

function ensureHttpUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  return `https://${trimmed}`
}

export default function AdSpot(props: any) {
  const index = Number(props.item?.index ?? 0)
  const refreshGen = Number(props.item?.refresh_gen ?? 0)
  const slotKey = cacheKey(index, refreshGen)
  const cached = adCache.get(slotKey)
  const [title, setTitle] = React.useState(cached?.title ?? '')
  const [message, setMessage] = React.useState(cached?.message ?? '')
  const [showFull, setShowFull] = React.useState(false)
  const [adId, setAdId] = React.useState<string | number | ''>(cached?.id ?? '')
  const [image, setImage] = React.useState<string | null>(
    cached?.background ?? null,
  )
  const [clickUrl, setClickUrl] = React.useState<string | null>(
    cached?.clickUrl ?? null,
  )
  const [noAd, setNoAd] = React.useState(Boolean(cached?.empty))
  const [loading, setLoading] = React.useState(!cached)
  const colorScheme = useColorScheme()
  const adHook = useAd()
  const {apiUrl} = useLeagueContext() as {apiUrl?: string}
  const width = Dimensions.get('window').width
  const imageWidth = width * 0.9

  /** A view = user expanded the collapsed card (not merely loading it in the list). */
  const expandAd = React.useCallback(() => {
    setShowFull(true)
    const id = Number(adId)
    if (!Number.isFinite(id) || id <= 0) return
    void adHook.RecordView(id)
  }, [adHook, adId])

  React.useEffect(() => {
    const existing = adCache.get(slotKey)
    if (existing) {
      setTitle(existing.title ?? '')
      setMessage(existing.message ?? '')
      setAdId(existing.id ?? '')
      setImage(existing.background ?? null)
      setClickUrl(existing.clickUrl ?? null)
      setNoAd(Boolean(existing.empty))
      setLoading(false)
      setShowFull(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setShowFull(false)
    setNoAd(false)
    async function GetAd() {
      try {
        const res = await adHook.GetAdSpot(index)
        if (cancelled) return
        const collapsedTitle =
          typeof res?.title === 'string' ? res.title.trim() : ''
        if (!collapsedTitle) {
          adCache.set(slotKey, {empty: true})
          setNoAd(true)
          setLoading(false)
          return
        }
        const rawBackground =
          typeof res?.background === 'string' ? res.background : null
        const resolvedBackground =
          rawBackground && apiUrl
            ? absoluteSiteUrl(rawBackground, apiUrl)
            : rawBackground
        const resolvedClick = ensureHttpUrl(
          typeof res?.click_url === 'string' ? res.click_url : null,
        )
        const payload: AdPayload = {
          title: collapsedTitle,
          message: typeof res?.message === 'string' ? res.message : '',
          id: res?.id,
          background: resolvedBackground,
          clickUrl: resolvedClick,
        }
        adCache.set(slotKey, payload)
        setTitle(payload.title ?? '')
        setMessage(payload.message ?? '')
        if (typeof payload.id !== 'undefined') setAdId(payload.id)
        if (payload.background) setImage(payload.background)
        setClickUrl(payload.clickUrl ?? null)
        setLoading(false)
      } catch (e) {
        console.log(e)
        if (!cancelled) {
          adCache.set(slotKey, {empty: true})
          setNoAd(true)
          setLoading(false)
        }
      }
    }
    GetAd()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotKey, index, apiUrl])

  if (noAd) {
    return <View style={{height: 0}} />
  }

  async function openClickThrough() {
    let url = clickUrl

    // Await click tracking before leaving the app — background fetch is cancelled
    // when Linking.openURL switches to the browser.
    if (adId !== '' && adId != null) {
      try {
        const res = await adHook.HandleClick(adId)
        const tracked = ensureHttpUrl(
          typeof res?.url === 'string' ? res.url : null,
        )
        if (tracked) {
          url = tracked
          setClickUrl(tracked)
        }
      } catch (e) {
        console.log('Ad click record failed', e)
      }
    }

    if (!url) return
    try {
      await Linking.openURL(url)
    } catch (e) {
      console.log('Ad click-through failed', url, e)
    }
  }

  return (
    <View
      style={{
        margin: 10,
        padding: 16,
        borderRadius: 16,
        minHeight: COLLAPSED_MIN_HEIGHT,
        backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
      {loading ? (
        <View style={{minHeight: 24}} />
      ) : !showFull ? (
        <Pressable onPress={expandAd}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <View style={{flex: 4, alignItems: 'center'}}>
              <Text>{title}</Text>
            </View>
            <View style={{flex: 1, alignItems: 'flex-end'}}>
              <MCI
                name="plus-circle"
                size={24}
                color={colorScheme === 'dark' ? 'white' : 'black'}
              />
            </View>
          </View>
        </Pressable>
      ) : (
        <View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Pressable
              onPress={() => void openClickThrough()}
              style={{flex: 4, alignItems: 'center'}}>
              <Text>{title}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowFull(false)}
              hitSlop={12}
              accessibilityLabel="Collapse ad">
              <MCI
                name="minus-circle"
                size={24}
                color={colorScheme === 'dark' ? 'white' : 'black'}
              />
            </Pressable>
          </View>
          {message ? (
            <Pressable onPress={() => void openClickThrough()}>
              <View style={{marginTop: 8}}>
                <Text>{message}</Text>
              </View>
            </Pressable>
          ) : null}
          {image ? (
            <Pressable onPress={() => void openClickThrough()}>
              <Image
                resizeMode="contain"
                source={{uri: image}}
                style={{
                  width: imageWidth,
                  height: imageWidth,
                  marginTop: 12,
                  alignSelf: 'center',
                }}
              />
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  )
}
