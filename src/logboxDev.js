import {LogBox} from 'react-native'

/**
 * Imported first from index.js.
 *
 * On this RN 0.88 / iOS build, dismissing the yellow LogBox banner (or opening
 * the full inspector) can leave an invisible overlay that eats all touches.
 * Until that is fixed upstream, hide in-app LogBox in dev. Warnings still
 * print in the Metro terminal — use that, don't dismiss on-device banners.
 */
if (__DEV__) {
  LogBox.ignoreLogs([
    /contains an invalid package.json configuration/i,
    /ImageBackground is deprecated/i,
    /onAnimatedValueUpdate/i,
  ])
  LogBox.ignoreAllLogs(true)
}