import {AdaptiveSplit} from '@/components/layout/AdaptiveSplit'
import {SettingsRootList} from '@/components/Settings/SettingsRootList'
import {useContentSafePadding} from '@/hooks/useContentSafePadding'
import {useSettingsSplitLayout} from '@/hooks/useSettingsSplitLayout'
import {useStackContentSafeStyle} from '@/hooks/useStackContentSafeStyle'
import {settingsHeaderTitleKey} from '@/lib/settingsHeaderTitle'
import {Stack, useNavigation, usePathname, usePreventRemove} from 'expo-router'
import {useEffect, useLayoutEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Platform, View} from 'react-native'

type StackNav = {
  index?: number
  key?: string
  type?: string
  routes?: Array<{key: string; state?: StackNav}>
}

/** Pop one screen inside the Settings stack, not the root stack that owns it. */
function isSettingsRoot(pathname: string) {
  return (pathname.replace(/\/$/, '') || '/Settings') === '/Settings'
}

function popFocusedChildStack(navigation: {
  getState: () => unknown
  dispatch: (action: {
    type: string
    payload?: object
    target?: string
    source?: string
  }) => void
}): boolean {
  const state = navigation.getState() as
    | {index?: number; routes?: Array<{state?: StackNav}>}
    | undefined
  const nested = state?.routes?.[state.index ?? 0]?.state
  const index = nested?.index ?? 0
  const source = nested?.routes?.[index]?.key
  if (nested?.type !== 'stack' || !nested.key || index < 1 || !source) {
    return false
  }
  // Screen dispatch stamps `source` with the root Settings route. Override it
  // so POP targets the focused screen inside the nested stack.
  navigation.dispatch({
    type: 'POP',
    payload: {count: 1},
    target: nested.key,
    source,
  })
  return true
}

export default function SettingsLayout() {
  const {t} = useTranslation()
  const isSplit = useSettingsSplitLayout()
  const contentStyle = useStackContentSafeStyle()
  const horizontalSafe = useContentSafePadding()
  const pathname = usePathname()
  const parentNavigation = useNavigation()
  const [allowRootPop, setAllowRootPop] = useState(false)
  // iOS only shows this root header. Its back button pops the whole Settings
  // stack. While a subscreen is open, keep that pop from leaving Settings and
  // drop one nested screen instead. Android draws the nested headers itself.
  const blockRootPop =
    Platform.OS === 'ios' && !isSettingsRoot(pathname) && !allowRootPop

  useEffect(() => {
    setAllowRootPop(false)
  }, [pathname])

  usePreventRemove(blockRootPop, () => {
    if (!popFocusedChildStack(parentNavigation)) {
      setAllowRootPop(true)
    }
  })

  useLayoutEffect(() => {
    if (Platform.OS !== 'ios') {
      return
    }
    // Player profile writes the player's name onto this header. A static
    // title here would replace it on the next pathname-driven update.
    const keepPlayerTitle = pathname.toLowerCase().includes('/playerinfo')
    parentNavigation.setOptions({
      gestureEnabled: !blockRootPop,
      ...(keepPlayerTitle
        ? null
        : {
            title: t(settingsHeaderTitleKey(pathname)),
            headerBackTitle: t('back'),
          }),
    })
  }, [blockRootPop, parentNavigation, pathname, t])

  const stack = (
    <Stack
      screenOptions={{
        headerShown: Platform.OS !== 'ios',
        headerBackTitle: t('back'),
        // When split, the outer wrapper already applies Duo rail insets.
        contentStyle: isSplit ? undefined : contentStyle,
      }}>
      <Stack.Screen name="index" options={{title: t('settings')}} />
    </Stack>
  )

  if (!isSplit) {
    return stack
  }

  return (
    <View style={[{flex: 1}, horizontalSafe]}>
      <AdaptiveSplit
        split
        listWidth={360}
        list={<SettingsRootList showPaneTitle />}
        detail={stack}
      />
    </View>
  )
}
