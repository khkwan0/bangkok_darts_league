import {useVideoPlayer, VideoView} from 'expo-video'
import React from 'react'
import {StyleSheet, View, useWindowDimensions} from 'react-native'

type AnnouncementVideoProps = {
  uri: string
}

export function AnnouncementVideo({uri}: AnnouncementVideoProps) {
  const {width: windowWidth} = useWindowDimensions()
  const player = useVideoPlayer(uri, p => {
    p.loop = false
  })

  const videoWidth = Math.min(Math.max(windowWidth - 72, 200), 420)
  const videoHeight = Math.round((videoWidth * 9) / 16)

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
})
