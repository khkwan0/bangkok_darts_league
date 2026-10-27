import {useLeagueContext} from '@/context/LeagueContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {Image} from 'expo-image'
import {useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

function welcomeSeenKey(leagueId: number): string {
  return `welcome_seen_rev:${leagueId}`
}

function resolveWelcomeImageUri(
  imageUrl: string | null | undefined,
  apiUrl: string,
): string | null {
  const raw = String(imageUrl || '').trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:image/')) {
    return raw
  }
  if (raw.startsWith('/')) {
    const origin = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
    return `${origin}${raw}`
  }
  return raw
}

type WelcomeGateProps = {
  onReady: () => void
}

/**
 * Full-screen welcome after splash when branding enables it and the device
 * has not yet seen this welcome_revision for the league. Signals onReady
 * (allowing OTA) when skipped or after Continue.
 */
export default function WelcomeGate({onReady}: WelcomeGateProps) {
  const {t} = useTranslation()
  const {state, apiUrl} = useLeagueContext()
  const insets = useSafeAreaInsets()
  const {width} = useWindowDimensions()
  const [visible, setVisible] = useState(false)
  const decidedRef = useRef(false)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    if (!state.brandingLoaded || decidedRef.current) return

    const welcome = state.welcome
    const leagueId = Number(state.leagueId)
    if (!welcome?.enabled || !Number.isFinite(leagueId) || leagueId <= 0) {
      decidedRef.current = true
      onReadyRef.current()
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const stored = await AsyncStorage.getItem(welcomeSeenKey(leagueId))
        const seenRev = stored != null ? Number(stored) : NaN
        if (cancelled) return
        if (Number.isFinite(seenRev) && seenRev === welcome.revision) {
          decidedRef.current = true
          onReadyRef.current()
          return
        }
        decidedRef.current = true
        setVisible(true)
      } catch {
        if (cancelled) return
        decidedRef.current = true
        onReadyRef.current()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [state.brandingLoaded, state.welcome, state.leagueId])

  async function handleContinue() {
    const leagueId = Number(state.leagueId)
    const revision = state.welcome?.revision ?? 0
    if (Number.isFinite(leagueId) && leagueId > 0) {
      try {
        await AsyncStorage.setItem(welcomeSeenKey(leagueId), String(revision))
      } catch {
        // Still proceed into the app.
      }
    }
    setVisible(false)
    onReadyRef.current()
  }

  if (!visible || !state.welcome) return null

  const bg = state.welcome.backgroundColor || '#FFFFFF'
  const fg = state.welcome.textColor || '#111111'
  const imageUri = resolveWelcomeImageUri(state.welcome.imageUrl, apiUrl)
  const imageWidth = Math.min(width - 48, 360)

  return (
    <Modal animationType="fade" transparent={false} visible>
      <View
        style={[
          styles.root,
          {
            backgroundColor: bg,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          bounces={false}
          showsVerticalScrollIndicator={false}>
          {imageUri ? (
            <Image
              source={{uri: imageUri}}
              style={{
                width: imageWidth,
                height: imageWidth * 0.75,
                marginBottom: 24,
                borderRadius: 12,
              }}
              contentFit="contain"
            />
          ) : null}
          {state.welcome.blurb ? (
            <Text style={[styles.blurb, {color: fg}]}>
              {state.welcome.blurb}
            </Text>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            onPress={() => {
              void handleContinue()
            }}
            style={[styles.continueBtn, {backgroundColor: fg}]}
            accessibilityRole="button">
            <Text style={[styles.continueLabel, {color: bg}]}>
              {t('welcome_continue')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  blurb: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
  },
  footer: {
    paddingTop: 16,
  },
  continueBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  continueLabel: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
})
