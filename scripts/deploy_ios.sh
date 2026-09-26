#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

echo "Syncing version from app.json → src/config.js…"
node <<'EOF'
const fs = require('fs')
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'))
const version = app.expo.version
const build = Number(app.expo.ios.buildNumber)
if (!version || !Number.isFinite(build)) {
  console.error('Missing expo.version or expo.ios.buildNumber in app.json')
  process.exit(1)
}
const path = 'src/config.js'
let config = fs.readFileSync(path, 'utf8')
config = config.replace(/build:\s*\d+/, `build: ${build}`)
config = config.replace(/version:\s*['"][^'"]*['"]/, `version: '${version}'`)
fs.writeFileSync(path, config)
console.log(`Updated src/config.js → version ${version}, build ${build}`)
EOF

echo "Unlocking login keychain for code signing…"
security unlock-keychain ~/Library/Keychains/login.keychain-db

echo "Running prebuild…"
npx expo prebuild --platform ios

echo "Syncing darts splash/app icons into iOS assets…"
bash "$(dirname "$0")/ios_sync_brand_assets.sh"

echo "Forcing Manual signing onto darts development profile…"
bash "$(dirname "$0")/ios_force_dev_signing.sh"

# Cap parallelism so the build doesn't pin every core.
# expo run:ios doesn't forward -jobs, so wrap xcodebuild on PATH.
MAX_CPUS="${MAX_CPUS:-4}"
XCODEBUILD_BIN="$(command -v xcodebuild)"
WRAP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/xcodebuild-wrap.XXXXXX")"
cleanup_wrap() { rm -rf "$WRAP_DIR"; }
trap cleanup_wrap EXIT
cat > "$WRAP_DIR/xcodebuild" <<EOF
#!/usr/bin/env bash
exec "$XCODEBUILD_BIN" \\
  -jobs "$MAX_CPUS" \\
  -IDEBuildOperationMaxNumberOfConcurrentCompileTasks="$MAX_CPUS" \\
  "\$@"
EOF
chmod +x "$WRAP_DIR/xcodebuild"
export PATH="$WRAP_DIR:$PATH"

echo "Building and installing on device (max ${MAX_CPUS} CPUs)…"
# --no-build-cache: force Xcode to recompile Assets.car / launch storyboard
# so a previously-compiled pool-ball splash cannot linger in DerivedData.
npx expo run:ios --no-build-cache --device "$@"
