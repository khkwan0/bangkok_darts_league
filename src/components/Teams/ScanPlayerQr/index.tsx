import React from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import {CameraView, useCameraPermissions} from 'expo-camera'
import {useNavigation} from 'expo-router/react-navigation'
import {useTranslation} from 'react-i18next'
import {MaterialCommunityIcons} from '@expo/vector-icons'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView} from '@/components/ThemedView'
import Button from '@/components/Button'
import config from '@/config'
import {useLeague} from '@/hooks'
import {parsePlayerIdFromQrPayload} from '@/lib/playerDeepLink'

export type ScannedPlayer = {
  id: number
  nickname: string
  firstname?: string | null
  lastname?: string | null
  profile_picture?: string | null
}

type Props = {
  onConfirm: (player: ScannedPlayer) => Promise<void> | void
}

export default function ScanPlayerQr({onConfirm}: Props) {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const league = useLeague()
  const [permission, requestPermission] = useCameraPermissions()
  const [locked, setLocked] = React.useState(false)
  const [scanError, setScanError] = React.useState('')
  const [loadingPlayer, setLoadingPlayer] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const [player, setPlayer] = React.useState<ScannedPlayer | null>(null)
  const resumeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    navigation.setOptions({title: t('scan_player_qr')})
  }, [navigation, t])

  React.useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current)
    }
  }, [])

  function resumeScanning(delayMs = 1200) {
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(() => {
      setLocked(false)
      setScanError('')
    }, delayMs)
  }

  async function handleBarcodeScanned({data}: {data: string}) {
    if (locked || loadingPlayer || player) return
    setLocked(true)
    setScanError('')

    const playerId = parsePlayerIdFromQrPayload(data)
    if (playerId == null) {
      setScanError(t('invalid_player_qr'))
      resumeScanning()
      return
    }

    try {
      setLoadingPlayer(true)
      const res = await league.GetPlayerName(playerId)
      const info = res?.data
      if (!info?.nickname && !info?.name) {
        setScanError(t('invalid_player_qr'))
        resumeScanning()
        return
      }
      setPlayer({
        id: playerId,
        nickname: String(info.nickname || info.name || `Player #${playerId}`),
        firstname: info.firstname ?? null,
        lastname: info.lastname ?? null,
        profile_picture: info.profile_picture ?? null,
      })
    } catch (e) {
      console.error(e)
      setScanError(t('invalid_player_qr'))
      resumeScanning()
    } finally {
      setLoadingPlayer(false)
    }
  }

  function handleCancelConfirm() {
    setPlayer(null)
    setConfirming(false)
    resumeScanning(400)
  }

  async function handleConfirm() {
    if (!player || confirming) return
    try {
      setConfirming(true)
      await onConfirm(player)
    } catch (e) {
      console.error(e)
      setScanError(t('error_adding_player'))
      setPlayer(null)
      setConfirming(false)
      resumeScanning()
    }
  }

  if (!permission) {
    return <ThemedView className="flex-1" />
  }

  if (!permission.granted) {
    return (
      <ThemedView className="flex-1 items-center justify-center p-6">
        <MaterialCommunityIcons name="camera-off" size={48} color="#64748b" />
        <Text className="mt-4 text-center text-base">
          {t('camera_permission_required')}
        </Text>
        <View className="mt-6 w-full max-w-[280px]">
          <Button onPress={() => void requestPermission()}>
            {t('grant_camera_permission')}
          </Button>
        </View>
      </ThemedView>
    )
  }

  const picUri = player?.profile_picture
    ? `${config.profileUrl}${player.profile_picture}`
    : null

  return (
    <ThemedView className="flex-1">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-center text-sm opacity-70">
          {t('scan_player_qr_hint')}
        </Text>
      </View>

      <View className="flex-1 overflow-hidden mx-4 mb-4 rounded-2xl">
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{barcodeTypes: ['qr']}}
          onBarcodeScanned={
            locked || player ? undefined : handleBarcodeScanned
          }
        />
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center">
          <View className="h-56 w-56 rounded-2xl border-2 border-white/80" />
        </View>
        {(loadingPlayer || locked) && !player ? (
          <View className="absolute inset-0 items-center justify-center bg-black/40">
            {loadingPlayer ? (
              <ActivityIndicator size="large" color="#ffffff" />
            ) : null}
          </View>
        ) : null}
      </View>

      {scanError ? (
        <Text className="px-4 pb-4 text-center text-red-500">{scanError}</Text>
      ) : (
        <Text className="px-4 pb-4 text-center text-sm opacity-60">
          {t('scan_player_qr')}
        </Text>
      )}

      <Modal
        visible={player != null}
        transparent
        animationType="fade"
        onRequestClose={handleCancelConfirm}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/60 px-6"
          onPress={handleCancelConfirm}>
          <Pressable
            className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-slate-800"
            onPress={e => e.stopPropagation()}>
            <Text className="mb-4 text-center text-lg font-semibold">
              {t('confirm_add_player')}
            </Text>
            <View className="items-center mb-4">
              {picUri ? (
                <Image
                  source={{uri: picUri}}
                  className="h-20 w-20 rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                  <Text className="text-2xl font-semibold">
                    {(player?.nickname ?? '?').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text className="mt-3 text-base font-semibold">
                {player?.nickname}
              </Text>
              {player?.firstname || player?.lastname ? (
                <Text className="mt-1 text-sm opacity-70">
                  {[player?.firstname, player?.lastname]
                    .filter(Boolean)
                    .join(' ')}
                </Text>
              ) : null}
              <Text className="mt-1 text-xs opacity-50">
                ID: {player?.id}
              </Text>
            </View>
            <Button onPress={() => void handleConfirm()} disabled={confirming}>
              {confirming ? t('loading') : t('confirm_add_player')}
            </Button>
            <View className="mt-3">
              <Button
                type="outline"
                onPress={handleCancelConfirm}
                disabled={confirming}>
                {t('cancel')}
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  )
}
