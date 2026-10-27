import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView} from '@/components/ThemedView'
import {playerProfileUniversalUrl} from '@/lib/playerDeepLink'
import {useTheme} from 'expo-router/react-navigation'
import QRCode from 'qrcode'
import React, {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, Share, View} from 'react-native'

type Props = {
  playerId: number
  /** Optional display name shown under the QR. */
  playerName?: string | null
  size?: number
}

/** Pure-JS QR (no react-native-svg) so it works over OTA without a native rebuild. */
function QrMatrix({
  value,
  size,
  color = '#111111',
  backgroundColor = '#ffffff',
}: {
  value: string
  size: number
  color?: string
  backgroundColor?: string
}) {
  const cells = useMemo(() => {
    const qr = QRCode.create(value, {errorCorrectionLevel: 'M'})
    const n = qr.modules.size
    const rows: boolean[][] = []
    for (let y = 0; y < n; y++) {
      const row: boolean[] = []
      for (let x = 0; x < n; x++) {
        row.push(Boolean(qr.modules.get(y, x)))
      }
      rows.push(row)
    }
    return rows
  }, [value])

  const n = cells.length || 1
  const cell = size / n

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor,
      }}>
      {cells.map((row, y) => (
        <View key={y} style={{flexDirection: 'row', height: cell}}>
          {row.map((dark, x) => (
            <View
              key={x}
              style={{
                width: cell,
                height: cell,
                backgroundColor: dark ? color : backgroundColor,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  )
}

export default function PlayerProfileQr({
  playerId,
  playerName,
  size = 220,
}: Props) {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const url = useMemo(() => playerProfileUniversalUrl(playerId), [playerId])

  async function handleShare() {
    try {
      await Share.share({
        message: playerName ? `${playerName}\n${url}` : url,
        url,
      })
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <ThemedView className="rounded-lg p-4 items-center">
      <Text className="text-lg font-semibold mb-1">{t('my_qr_code')}</Text>
      <Text
        className="text-sm text-center mb-4 opacity-70"
        style={{color: colors.text}}>
        {t('my_qr_code_hint')}
      </Text>
      <View
        className="p-4 rounded-2xl mb-4"
        style={{backgroundColor: '#ffffff'}}>
        <QrMatrix value={url} size={size} />
      </View>
      {playerName ? (
        <Text className="text-base font-semibold mb-1">{playerName}</Text>
      ) : null}
      <Text
        className="text-xs text-center mb-4 opacity-60"
        selectable
        style={{color: colors.text}}>
        {url}
      </Text>
      <Pressable
        className="bg-primary px-6 py-3 rounded-full"
        onPress={() => void handleShare()}
        accessibilityRole="button"
        accessibilityLabel={t('share_profile_link')}>
        <Text className="text-white text-base">{t('share_profile_link')}</Text>
      </Pressable>
    </ThemedView>
  )
}
