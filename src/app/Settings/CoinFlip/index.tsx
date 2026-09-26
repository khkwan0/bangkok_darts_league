import Button from '@/components/Button'
import {
  CoinFlipScene,
  type CoinFlipOutcome,
  type CoinFlipSceneHandle,
} from '@/components/CoinFlip/CoinFlipScene'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import * as Haptics from 'expo-haptics'
import {Stack} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Platform, StyleSheet, Text as RNText, View as RNView} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

export default function CoinFlipScreen() {
  const {t} = useTranslation()
  const insets = useSafeAreaInsets()
  const coinRef = React.useRef<CoinFlipSceneHandle>(null)
  const [flipping, setFlipping] = React.useState(false)
  const [result, setResult] = React.useState<CoinFlipOutcome | null>(null)

  const canvasLabel =
    result === 'heads'
      ? t('coin_flip_heads')
      : result === 'tails'
        ? t('coin_flip_tails')
        : null

  const handleFlip = () => {
    if (flipping || Platform.OS === 'web') {
      return
    }
    setResult(null)
    coinRef.current?.flip()
  }

  return (
    <View className="flex-1">
      <Stack.Screen options={{title: t('coin_flip')}} />
      <RNView
        style={{flex: 1, minHeight: 320, marginHorizontal: 16, marginTop: 8}}
        className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
        <CoinFlipScene
          ref={coinRef}
          onFlipStart={() => setFlipping(true)}
          onFlipComplete={outcome => {
            setFlipping(false)
            setResult(outcome)
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            )
          }}
        />
        {/*
          Avoid a full-screen overlay above GLView — on Android that punches
          black holes through the felt. Keep the badge as a small bottom view.
        */}
        {canvasLabel ? (
          <RNView pointerEvents="none" style={styles.resultBadge}>
            <RNText style={styles.resultText}>{canvasLabel}</RNText>
          </RNView>
        ) : null}
      </RNView>
      <View
        className="px-4 pt-4"
        style={{paddingBottom: Math.max(insets.bottom, 16) + 16}}>
        <Text className="text-center text-base opacity-70">
          {t('coin_flip_hint')}
        </Text>
        <RNView className="mt-5">
          <Button
            disabled={flipping || Platform.OS === 'web'}
            onPress={handleFlip}>
            {flipping ? 'coin_flip_flipping' : 'coin_flip_flip'}
          </Button>
        </RNView>
        {Platform.OS === 'web' ? (
          <Text className="mt-3 text-center text-sm opacity-60">
            {t('coin_flip_web_unavailable')}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  resultBadge: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  resultText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
})
