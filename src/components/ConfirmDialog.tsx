import React from 'react'
import {ActivityIndicator, Modal, Platform, useColorScheme} from 'react-native'
import {ThemedView as View} from './ThemedView'
import {ThemedText as Text} from './ThemedText'
import Button from './Button'
import {useTranslation} from 'react-i18next'

interface ConfirmDialogProps {
  isVisible: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  /** @deprecated Use `submitting` */
  buttonsDisabled?: boolean
  submitting?: boolean
}

export default function ConfirmDialog({
  isVisible,
  title,
  message,
  onConfirm,
  onCancel,
  buttonsDisabled = false,
  submitting = false,
}: ConfirmDialogProps) {
  const {t} = useTranslation()
  const colorScheme = useColorScheme()
  const isBusy = submitting || buttonsDisabled
  const spinnerColor = colorScheme === 'dark' ? '#e5e7eb' : '#ffffff'

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={isBusy ? () => {} : onCancel}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          ...(Platform.OS === 'android' && {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }),
        }}>
        <View className="p-5 rounded-lg bg-white dark:bg-gray-800 w-4/5">
          <Text type="defaultSemiBold" className="text-lg mb-2">
            {title}
          </Text>
          <Text className="mb-4">{message}</Text>
          {isBusy && (
            <View className="flex-row items-center justify-center gap-2 mb-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text className="text-gray-600 dark:text-gray-300">
                {t('submitting')}
              </Text>
            </View>
          )}
          <View className="flex-row justify-end gap-2">
            <Button onPress={onCancel} disabled={isBusy}>
              cancel
            </Button>
            <Button
              onPress={onConfirm}
              disabled={isBusy}
              icon={
                isBusy ? (
                  <ActivityIndicator size="small" color={spinnerColor} />
                ) : undefined
              }>
              confirm
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  )
}
