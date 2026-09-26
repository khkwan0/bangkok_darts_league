#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Syncing version from app.json → src/config.js…"
node <<'EOF'
const fs = require('fs')
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'))
const version = app.expo.version
const build = Number(app.expo.android?.versionCode)
if (!version || !Number.isFinite(build)) {
  console.error('Missing expo.version or expo.android.versionCode in app.json')
  process.exit(1)
}
const path = 'src/config.js'
let config = fs.readFileSync(path, 'utf8')
config = config.replace(/build:\s*\d+/, `build: ${build}`)
config = config.replace(/version:\s*['"][^'"]*['"]/, `version: '${version}'`)
fs.writeFileSync(path, config)
console.log(`Updated src/config.js → version ${version}, build ${build}`)
EOF

echo "Running prebuild…"
npx expo prebuild --platform android

# Cap CPU + JVM heaps so the Mac mini stays out of swap.
# shellcheck source=android_gradle_limits.sh
source "$(dirname "$0")/android_gradle_limits.sh"
apply_android_gradle_limits

echo "Building and installing on device (max ${MAX_CPUS} CPUs, heap ${MAX_HEAP_MB}m)…"
npx expo run:android --device "$@"
