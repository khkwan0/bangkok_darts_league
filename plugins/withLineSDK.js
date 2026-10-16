const {
  withAppDelegate,
  withInfoPlist,
  withPlugins,
  withXcodeProject,
} = require('expo/config-plugins')
const generateCode = require('@expo/config-plugins/build/utils/generateCode')
const {
  createBuildSourceFile,
} = require('@expo/config-plugins/build/ios/XcodeProjectFile')
const {getProjectName} = require('@expo/config-plugins/build/ios/utils/Xcodeproj')

const LINE_URL_SCHEME = 'line3rdp.$(PRODUCT_BUNDLE_IDENTIFIER)'
const LINE_QUERY_SCHEME = 'lineauth2'
const SCENE_DELEGATE_CLASS = '$(PRODUCT_MODULE_NAME).SceneDelegate'

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

const SCENE_DELEGATE_CONTENTS = `internal import Expo
import react_native_line

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // LINE Login returns via line3rdp.<bundle-id>://…
  // SDK 58's scene forwarder still notifies RCTLinking after AppDelegate
  // handles the URL, so Expo Router opens +not-found. Consume LINE URLs here
  // and do not forward them to super / Expo Router.
  public override func scene(
    _ scene: UIScene,
    openURLContexts URLContexts: Set<UIOpenURLContext>
  ) {
    var passthrough = Set<UIOpenURLContext>()
    for context in URLContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
      if let sourceApplication = context.options.sourceApplication {
        options[.sourceApplication] = sourceApplication
      }
      if let annotation = context.options.annotation {
        options[.annotation] = annotation
      }
      options[.openInPlace] = context.options.openInPlace

      if LineLogin.application(
        UIApplication.shared,
        open: context.url,
        options: options
      ) {
        continue
      }
      passthrough.insert(context)
    }
    if !passthrough.isEmpty {
      super.scene(scene, openURLContexts: passthrough)
    }
  }
}
`

/**
 * @xmartlabs/react-native-line's config plugin still anchors on the pre–SDK 58
 * AppDelegate linking return. SDK 58's scene-based template no longer has that
 * method, so prebuild fails. This local plugin keeps the Info.plist URL schemes,
 * injects AppDelegate openURL for LineLogin, and overrides SceneDelegate so LINE
 * callbacks are not also delivered to Expo Router.
 */
function withLineAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error(
        'withLineSDK: only Swift AppDelegate is supported (Expo SDK 58+).',
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
          'withLineSDK: failed to add import react_native_line to AppDelegate.swift',
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
            'withLineSDK: failed to inject LineLogin into existing openURL handler',
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
            'withLineSDK: failed to add application(_:open:options:) for LineLogin (SDK 58 AppDelegate template changed?)',
          )
        }
        contents = withMethod.contents
      }
    }

    config.modResults.contents = contents
    return config
  })
}

function withLineSceneDelegate(config) {
  return withXcodeProject(config, (config) => {
    const projectName = getProjectName(config.modRequest.projectRoot)
    config.modResults = createBuildSourceFile({
      project: config.modResults,
      nativeProjectRoot: config.modRequest.platformProjectRoot,
      filePath: `${projectName}/SceneDelegate.swift`,
      fileContents: SCENE_DELEGATE_CONTENTS,
      overwrite: true,
    })
    return config
  })
}

function withLineInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    const urlTypes = config.modResults.CFBundleURLTypes ?? []
    const hasLineScheme = urlTypes.some((entry) =>
      (entry.CFBundleURLSchemes ?? []).includes(LINE_URL_SCHEME),
    )
    if (!hasLineScheme) {
      config.modResults.CFBundleURLTypes = [
        ...urlTypes,
        {CFBundleURLSchemes: [LINE_URL_SCHEME]},
      ]
    }

    const queries = config.modResults.LSApplicationQueriesSchemes ?? []
    if (!queries.includes(LINE_QUERY_SCHEME)) {
      config.modResults.LSApplicationQueriesSchemes = [
        ...queries,
        LINE_QUERY_SCHEME,
      ]
    }

    // Point the scene at our SceneDelegate so LINE callbacks are not forwarded
    // to Expo Router via EXExpoAppSceneDelegate / SceneEventForwarder.
    const sceneConfigs =
      config.modResults.UIApplicationSceneManifest?.UISceneConfigurations
        ?.UIWindowSceneSessionRoleApplication
    if (Array.isArray(sceneConfigs) && sceneConfigs[0]) {
      sceneConfigs[0].UISceneDelegateClassName = SCENE_DELEGATE_CLASS
    }

    return config
  })
}

module.exports = function withLineSDK(config) {
  return withPlugins(config, [
    withLineAppDelegate,
    withLineSceneDelegate,
    withLineInfoPlist,
  ])
}
