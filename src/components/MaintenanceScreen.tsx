import Button from '@/components/Button'
import {ConstructionGraphic} from '@/components/ConstructionGraphic'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import config from '@/config'
import {leagueRequestHeaders} from '@/lib/leagueRequest'
import {
  isMaintenanceActive,
  rememberApiBase,
  subscribeMaintenance,
} from '@/lib/maintenanceGate'
import * as Haptics from 'expo-haptics'
import {useEffect, useRef, useState} from 'react'
import {ActivityIndicator, Modal, ScrollView, useWindowDimensions} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

export default function MaintenanceScreen() {
  const {apiUrl} = useLeagueContext()
  const insets = useSafeAreaInsets()
  const {width} = useWindowDimensions()
  const [visible, setVisible] = useState(isMaintenanceActive)
  const [checking, setChecking] = useState(false)
  const wasVisible = useRef(false)

  rememberApiBase(apiUrl)

  useEffect(() => subscribeMaintenance(setVisible), [])

  useEffect(() => {
    if (visible && !wasVisible.current && process.env.EXPO_OS === 'ios') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    }
    wasVisible.current = visible
  }, [visible])

  async function retry() {
    const base = (apiUrl || config.apiUrl || '').replace(/\/$/, '')
    if (!base || checking) return
    rememberApiBase(base)
    setChecking(true)
    try {
      await fetch(`${base}/branding`, {headers: leagueRequestHeaders()})
    } catch {
      // Offline or still unreachable. The screen stays up.
    } finally {
      setChecking(false)
    }
  }

  const column = Math.min(width - 48, 420)

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={() => {}}>
      <View style={{flex: 1}}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          bounces={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: insets.top + 24,
            paddingBottom: 16,
            paddingHorizontal: 24,
          }}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{backgroundColor: 'transparent'}}>
            <ConstructionGraphic width={Math.min(column, 320)} />
          </View>
          <Text
            type="title"
            accessibilityRole="header"
            style={{
              textAlign: 'center',
              marginTop: 28,
              maxWidth: column,
              lineHeight: 36,
            }}>
            maintenance_title
          </Text>
          <Text
            style={{
              textAlign: 'center',
              marginTop: 12,
              maxWidth: column,
              lineHeight: 26,
            }}>
            maintenance_body
          </Text>
        </ScrollView>
        <View
          style={{
            backgroundColor: 'transparent',
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: insets.bottom + 24,
            alignItems: 'center',
          }}>
          <Button
            disabled={checking}
            icon={
              checking ? <ActivityIndicator color="#ffffff" /> : undefined
            }
            onPress={() => {
              void retry()
            }}
            style={{width: column}}>
            maintenance_retry
          </Button>
        </View>
      </View>
    </Modal>
  )
}
