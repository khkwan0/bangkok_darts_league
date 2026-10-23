import {EmptySplitDetail} from '@/components/layout/EmptySplitDetail'
import {SettingsRootList} from '@/components/Settings/SettingsRootList'
import {useSettingsSplitLayout} from '@/hooks/useSettingsSplitLayout'
import {useNavigation} from 'expo-router/react-navigation'
import React, {useEffect} from 'react'
import {useTranslation} from 'react-i18next'
import {Platform} from 'react-native'

export default function Settings() {
  const navigation = useNavigation()
  const {t} = useTranslation()
  const isSplit = useSettingsSplitLayout()

  useEffect(() => {
    navigation.setOptions({
      title: t('settings'),
      // iOS: root stack owns the header (Stack-in-Stack). Android: this stack.
      // Split: master list is in the left pane; index is the empty detail.
      headerShown: Platform.OS !== 'ios' && !isSplit,
    })
  }, [navigation, t, isSplit])

  if (isSplit) {
    return <EmptySplitDetail message={t('settings_select_item')} />
  }

  return <SettingsRootList />
}
