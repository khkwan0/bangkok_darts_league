const { withAppDelegate, withInfoPlist, withPlugins } =
  require('expo/config-plugins')
const generateCode = require('@expo/config-plugins/build/utils/generateCode')

const LINE_URL_SCHEME = 'line3rdp.$(PRODUCT_BUNDLE_IDENTIFIER)'
const LINE_QUERY_SCHEME = 'lineauth2'

const OLD_OPEN_URL_ANCHOR =
  /return\s+super\.application\(\s*app,\s*open:\s*url,\s*options:\s*options\s*\)\s*\|\|\s*RCTLinkingManager\.application\(\s*app,\s*open:\s*url,\s*options:\s*options\s*\)/

// mergeContents matches anchors per line, so keep this single-line.
const SDK58_DID_FINISH_ANCHOR =
  /return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/

const LINE_OPEN_URL_METHOD = `  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if LineLogin.application(app, open: url, options: options) {
      return true
    }
    return super.application(app, open: url, options: options)
  }`

/**
 * @xmartlabs/react-native-line's config plugin still anchors on the pre–SDK 58
 * AppDelegate linking return. SDK 58's scene-based template no longer has that
 * method, so prebuild fails. This local plugin keeps the Info.plist URL schemes
 * and injects a full openURL override that Expo forwards from SceneDelegate.
 */
function withLineAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error(
        'withLineSDK: only Swift AppDelegate is supported (Expo SDK 58+).'
      )
    }

    let contents = config.modResults.contents

    if (!contents.includes('import react_native_line')) {
      const withImport = generateCode.mergeContents({
        comment: '//',
        offset: 1,
        src: contents,
        tag: 'react-native-line-import',
        anchor: /import\s+Expo/,
        newSrc: 'import react_native_line',
      })
      if (!withImport.didMerge) {
        throw new Error(
          'withLineSDK: failed to add import react_native_line to AppDelegate.swift'
        )
      }
      contents = withImport.contents
    }

    if (!contents.includes('LineLogin.application')) {
      if (OLD_OPEN_URL_ANCHOR.test(contents)) {
        const withOpenUrl = generateCode.mergeContents({
          comment: '//',
          offset: 0,
          src: contents,
          tag: 'react-native-line-linking',
          anchor: OLD_OPEN_URL_ANCHOR,
          newSrc:
            '    if LineLogin.application(app, open: url, options: options) {\n      return true\n    }',
        })
        if (!withOpenUrl.didMerge) {
          throw new Error(
            'withLineSDK: failed to inject LineLogin into existing openURL handler'
          )
        }
        contents = withOpenUrl.contents
      } else {
        // Offset 2: skip the return line and the method's closing `}`.
        const withMethod = generateCode.mergeContents({
          comment: '//',
          offset: 2,
          src: contents,
          tag: 'react-native-line-linking',
          anchor: SDK58_DID_FINISH_ANCHOR,
          newSrc: `\n${LINE_OPEN_URL_METHOD}`,
        })
        if (!withMethod.didMerge) {
          throw new Error(
            'withLineSDK: failed to add application(_:open:options:) for LineLogin (SDK 58 AppDelegate template changed?)'
          )
        }
        contents = withMethod.contents
      }
    }

    config.modResults.contents = contents
    return config
  })
}

function withLineInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    const urlTypes = config.modResults.CFBundleURLTypes ?? []
    const hasLineScheme = urlTypes.some((entry) =>
      (entry.CFBundleURLSchemes ?? []).includes(LINE_URL_SCHEME)
    )
    if (!hasLineScheme) {
      config.modResults.CFBundleURLTypes = [
        ...urlTypes,
        { CFBundleURLSchemes: [LINE_URL_SCHEME] },
      ]
    }

    const queries = config.modResults.LSApplicationQueriesSchemes ?? []
    if (!queries.includes(LINE_QUERY_SCHEME)) {
      config.modResults.LSApplicationQueriesSchemes = [
        ...queries,
        LINE_QUERY_SCHEME,
      ]
    }

    return config
  })
}

module.exports = function withLineSDK(config) {
  return withPlugins(config, [withLineAppDelegate, withLineInfoPlist])
}
