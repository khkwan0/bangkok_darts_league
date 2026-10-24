/**
 * Xcode GUI builds often blow past expo-modules-autolinking's hard 5s
 * `@ExpoModule` scan timeout (cold scanner + parallel script phases), which
 * fails `[Expo] Configure project` for packages that don't declare modules in
 * expo-module.config.json (expo-application, expo-haptics, …).
 *
 * 1. Raise the scan timeout.
 * 2. Declare the known public module classes so a timed-out scan is non-fatal.
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', 'node_modules')

function patchFile(relPath, transform) {
  const file = path.join(root, relPath)
  if (!fs.existsSync(file)) return
  const before = fs.readFileSync(file, 'utf8')
  const after = transform(before)
  if (after !== before) {
    fs.writeFileSync(file, after)
    console.log(`[patch-expo-modules-scan] updated ${relPath}`)
  }
}

function ensureAppleModules(relConfigPath, modules) {
  const file = path.join(root, relConfigPath)
  if (!fs.existsSync(file)) return
  const config = JSON.parse(fs.readFileSync(file, 'utf8'))
  const apple = config.apple ?? {}
  const existing = apple.modules
  const same =
    Array.isArray(existing) &&
    existing.length === modules.length &&
    modules.every((name, i) => existing[i] === name)
  if (same) return
  config.apple = {...apple, modules}
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`)
  console.log(`[patch-expo-modules-scan] declared apple.modules in ${relConfigPath}`)
}

for (const file of [
  'expo-modules-autolinking/build/platforms/apple/moduleScanner.js',
  'expo-modules-autolinking/src/platforms/apple/moduleScanner.ts',
]) {
  patchFile(file, text =>
    text.replace(
      /scanModules\(roots,\s*\{\s*timeout:\s*5000\s*\}\)/g,
      'scanModules(roots, { timeout: 30000 })',
    ),
  )
}

ensureAppleModules('expo-application/expo-module.config.json', ['ApplicationModule'])
ensureAppleModules('expo-haptics/expo-module.config.json', ['HapticsModule'])
