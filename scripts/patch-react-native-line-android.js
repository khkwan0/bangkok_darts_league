/**
 * @xmartlabs/react-native-line@6.0.1 uses Kotlin `currentActivity`, which broke
 * when React Native moved ReactContextBaseJavaModule to Kotlin (synthetic
 * property no longer generated). Prefer the ReactApplicationContext accessor.
 */
const fs = require('fs')
const path = require('path')

const file = path.join(
  __dirname,
  '..',
  'node_modules',
  '@xmartlabs',
  'react-native-line',
  'android',
  'src',
  'main',
  'java',
  'com',
  'xmartlabs',
  'line',
  'LineLoginModule.kt',
)

if (!fs.existsSync(file)) {
  return
}

const src = fs.readFileSync(file, 'utf8')
const next = src.replace(
  /val activity = currentActivity/g,
  'val activity = reactApplicationContext.currentActivity',
)

if (next !== src) {
  fs.writeFileSync(file, next)
  console.log('Patched @xmartlabs/react-native-line Android currentActivity')
}
