import {ThemedText as Text} from '@/components/ThemedText'
import {resolveForumImageUrl} from '@/lib/forumImage'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {Image} from 'expo-image'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native'
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

const MIN_SCALE = 1
const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.5

type ZoomableForumImageProps = {
  uri: string
  width: number
  height: number
  onLoadEnd: () => void
  onError: () => void
  accessibilityLabel: string
}

function ZoomableForumImage({
  uri,
  width,
  height,
  onLoadEnd,
  onError,
  accessibilityLabel,
}: ZoomableForumImageProps) {
  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const savedTranslateX = useSharedValue(0)
  const savedTranslateY = useSharedValue(0)

  const clampTranslation = (x: number, y: number, currentScale: number) => {
    'worklet'
    const maxX = (width * (currentScale - 1)) / 2
    const maxY = (height * (currentScale - 1)) / 2
    return {
      x: clamp(x, -maxX, maxX),
      y: clamp(y, -maxY, maxY),
    }
  }

  const resetTransform = () => {
    'worklet'
    scale.value = withTiming(1)
    savedScale.value = 1
    translateX.value = withTiming(0)
    translateY.value = withTiming(0)
    savedTranslateX.value = 0
    savedTranslateY.value = 0
  }

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value
      savedTranslateX.value = translateX.value
      savedTranslateY.value = translateY.value
    })
    .onUpdate(event => {
      const nextScale = clamp(savedScale.value * event.scale, MIN_SCALE, MAX_SCALE)
      scale.value = nextScale

      const originX = event.focalX - width / 2
      const originY = event.focalY - height / 2
      translateX.value = savedTranslateX.value + originX * (1 - event.scale)
      translateY.value = savedTranslateY.value + originY * (1 - event.scale)
    })
    .onEnd(() => {
      if (scale.value <= MIN_SCALE) {
        resetTransform()
        return
      }
      savedScale.value = scale.value
      const clamped = clampTranslation(
        translateX.value,
        translateY.value,
        scale.value,
      )
      translateX.value = clamped.x
      translateY.value = clamped.y
      savedTranslateX.value = clamped.x
      savedTranslateY.value = clamped.y
    })

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      savedTranslateX.value = translateX.value
      savedTranslateY.value = translateY.value
    })
    .onUpdate(event => {
      if (scale.value <= MIN_SCALE) {
        return
      }
      translateX.value = savedTranslateX.value + event.translationX
      translateY.value = savedTranslateY.value + event.translationY
    })
    .onEnd(() => {
      if (scale.value <= MIN_SCALE) {
        return
      }
      const clamped = clampTranslation(
        translateX.value,
        translateY.value,
        scale.value,
      )
      translateX.value = clamped.x
      translateY.value = clamped.y
      savedTranslateX.value = clamped.x
      savedTranslateY.value = clamped.y
    })

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      if (scale.value > MIN_SCALE) {
        resetTransform()
        return
      }
      scale.value = withTiming(DOUBLE_TAP_SCALE)
      savedScale.value = DOUBLE_TAP_SCALE
    })

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: translateX.value},
      {translateY: translateY.value},
      {scale: scale.value},
    ],
  }))

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{width, height}, animatedStyle]}>
        <Image
          source={{uri}}
          contentFit="contain"
          style={{width, height}}
          onLoadEnd={onLoadEnd}
          onError={onError}
          accessibilityLabel={accessibilityLabel}
        />
      </Animated.View>
    </GestureDetector>
  )
}

type ForumImageViewerProps = {
  uri: string | null
  onClose: () => void
}

export function ForumImageViewer({uri, onClose}: ForumImageViewerProps) {
  const {t} = useTranslation()
  const insets = useSafeAreaInsets()
  const {width, height} = useWindowDimensions()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (uri) setLoading(true)
  }, [uri])

  if (!uri) return null

  const resolvedUri = resolveForumImageUrl(uri)
  const imageWidth = width - 24
  const imageHeight = height - insets.top - insets.bottom - 72

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView className="flex-1">
        <View className="flex-1 bg-black/90">
          <View
            className="absolute left-0 right-0 z-10 flex-row items-center justify-between px-4"
            style={{top: insets.top + 8}}>
            <Text className="text-sm font-medium text-white/80">
              {t('forums_image_viewer_hint')}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{backgroundColor: 'rgba(255,255,255,0.15)'}}>
              <MCI name="close" size={22} color="#fff" />
            </Pressable>
          </View>
          <View
            className="flex-1 items-center justify-center px-3"
            style={{paddingTop: insets.top + 48, paddingBottom: insets.bottom + 16}}>
            {loading ? (
              <ActivityIndicator
                pointerEvents="none"
                color={isDark ? '#93c5fd' : '#fff'}
                size="large"
                style={{position: 'absolute'}}
              />
            ) : null}
            <ZoomableForumImage
              key={resolvedUri}
              uri={resolvedUri}
              width={imageWidth}
              height={imageHeight}
              onLoadEnd={() => setLoading(false)}
              onError={() => setLoading(false)}
              accessibilityLabel={t('forums_image_viewer_label')}
            />
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  )
}

type ForumPostImageProps = {
  displayUri: string
  fullUri: string
  onPress: (fullUri: string) => void
}

export function ForumPostImage({displayUri, fullUri, onPress}: ForumPostImageProps) {
  const {t} = useTranslation()
  const {width: windowWidth} = useWindowDimensions()
  const resolvedDisplay = resolveForumImageUrl(displayUri)
  const imageWidth = Math.min(windowWidth - 48, 560)
  const [imageHeight, setImageHeight] = React.useState(200)

  React.useEffect(() => {
    setImageHeight(200)
  }, [resolvedDisplay])

  return (
    <Pressable
      onPress={() => onPress(fullUri)}
      accessibilityRole="imagebutton"
      accessibilityLabel={t('forums_image_viewer_label')}
      className="my-2 overflow-hidden rounded-lg"
      style={{alignSelf: 'flex-start', maxWidth: '100%'}}>
      <Image
        source={{uri: resolvedDisplay}}
        contentFit="contain"
        style={{
          width: imageWidth,
          height: imageHeight,
          maxHeight: 480,
        }}
        onLoad={event => {
          const {width, height} = event.source
          if (width > 0 && height > 0) {
            setImageHeight(
              Math.min(480, Math.max(80, (imageWidth / width) * height)),
            )
          }
        }}
      />
    </Pressable>
  )
}
