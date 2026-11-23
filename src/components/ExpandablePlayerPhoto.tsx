import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {Image} from 'expo-image'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  Modal,
  Pressable,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
} from 'react-native'

type ExpandablePlayerPhotoProps = {
  uri?: string | null
  accessibilityLabel?: string
  children: React.ReactNode
}

export function ExpandablePlayerPhoto({
  uri,
  accessibilityLabel,
  children,
}: ExpandablePlayerPhotoProps) {
  const {t} = useTranslation()
  const isDark = useColorScheme() === 'dark'
  const {width, height} = useWindowDimensions()
  const [open, setOpen] = React.useState(false)
  const photoSize = Math.min(width - 80, height * 0.62, 420)

  if (!uri) return <>{children}</>

  const label =
    accessibilityLabel ||
    t('view_profile_photo', {defaultValue: 'View profile photo'})

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={4}
        onPress={() => setOpen(true)}>
        {children}
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            accessibilityRole="image"
            accessibilityLabel={label}
            onPress={() => {}}
            style={[
              styles.dialog,
              {backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF'},
            ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('close')}
              hitSlop={8}
              onPress={() => setOpen(false)}
              style={styles.close}>
              <MCI
                name="close"
                size={22}
                color={isDark ? '#F8FAFC' : '#111827'}
              />
            </Pressable>
            <Image
              source={{uri}}
              style={{width: photoSize, height: photoSize, borderRadius: 12}}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    borderRadius: 20,
    padding: 12,
    paddingTop: 8,
    alignItems: 'center',
    maxWidth: '100%',
  },
  close: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
})
