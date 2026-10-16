const { withAppDelegate } = require('expo/config-plugins')
const generateCode = require('@expo/config-plugins/build/utils/generateCode')

/**
 * @react-native-firebase/app still anchors on factory.startReactNative( /
 * self.moduleName, which Expo SDK 58's scene-based AppDelegate no longer has.
 * Import FirebaseCore may still land, but FirebaseApp.configure() is skipped —
 * then getMessaging() at JS startup throws No Firebase App '[DEFAULT]'.
 */
module.exports = function withFirebaseAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error(
        'withFirebaseAppDelegate: only Swift AppDelegate is supported (Expo SDK 58+).'
      )
    }

    let contents = config.modResults.contents

    if (!contents.includes('import FirebaseCore')) {
      const withImport = generateCode.mergeContents({
        comment: '//',
        offset: 1,
        src: contents,
        tag: 'firebase-import',
        anchor: /import\s+Expo/,
        newSrc: 'import FirebaseCore',
      })
      if (!withImport.didMerge) {
        throw new Error(
          'withFirebaseAppDelegate: failed to add import FirebaseCore'
        )
      }
      contents = withImport.contents
    }

    if (!contents.includes('FirebaseApp.configure()')) {
      // mergeContents matches anchors per line. SDK 58 template:
      //   ) -> Bool {
      //     let delegate = ReactNativeDelegate()
      // offset 0 inserts immediately above the first RN setup line
      const withConfigure = generateCode.mergeContents({
        comment: '//',
        offset: 0,
        src: contents,
        tag: 'firebase-configure',
        anchor: /let delegate = ReactNativeDelegate\(\)/,
        newSrc: '    FirebaseApp.configure()',
      })
      if (!withConfigure.didMerge) {
        throw new Error(
          'withFirebaseAppDelegate: failed to insert FirebaseApp.configure() (AppDelegate template changed?)'
        )
      }
      contents = withConfigure.contents
    }

    config.modResults.contents = contents
    return config
  })
}
