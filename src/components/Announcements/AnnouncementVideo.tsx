import {useEvent} from 'expo'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useVideoPlayer, VideoView} from 'expo-video'
import React from 'react'
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native'

type AnnouncementVideoProps = {
  uri: string
}

export function AnnouncementVideo({uri}: AnnouncementVideoProps) {
  const {width: windowWidth} = useWindowDimensions()
  const player = useVideoPlayer(uri, p => {
    p.loop = false
  })
  const {isPlaying} = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  })

  const videoWidth = Math.min(Math.max(windowWidth - 72, 200), 420)
  const videoHeight = Math.round((videoWidth * 9) / 16)

  function togglePlayback() {
    if (player.playing) {
      player.pause()
    } else {
      player.play()
    }
  }

  return (
    <View style={[styles.wrap, {width: videoWidth}]}>
      <VideoView
        style={{width: videoWidth, height: videoHeight}}
        player={player}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{enable: true}}
        playsInline
      />
      {/*
        RN Pressable overlay for play — native VideoView controls often miss
        taps inside Modal/ScrollView. Hide once playing so native chrome works.
      */}
      {!isPlaying ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play video"
          onPress={togglePlayback}
          style={[styles.playOverlay, {width: videoWidth, height: videoHeight}]}>
          <View style={styles.playButton}>
            <MCI name="play" size={36} color="#FFFFFF" />
          </View>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    alignSelf: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.28)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
})
