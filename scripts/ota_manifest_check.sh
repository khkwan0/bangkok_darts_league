#!/usr/bin/env bash
# Sanity-check the xprem OTA manifest for this app.
# Usage:
#   npm run ota_check
#   PLATFORM=android npm run ota_check
#   CHANNEL=staging npm run ota_check
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

PLATFORM="${PLATFORM:-ios}"
CHANNEL="${CHANNEL:-${RELEASE_CHANNEL:-production}}"

case "$PLATFORM" in
  ios|android) ;;
  *)
    echo "error: PLATFORM must be ios or android (got: $PLATFORM)" >&2
    exit 1
    ;;
esac

echo "Resolving Expo config…"
CONFIG_JSON="$(npx expo config --json 2>/dev/null)"

eval "$(
  node -e '
const c = JSON.parse(process.argv[1])
const updates = c.updates || {}
const headers = updates.requestHeaders || {}
const url = updates.url
const appId = headers["expo-app-id"]
if (!url) {
  console.error("error: updates.url missing from Expo config")
  process.exit(1)
}
if (!appId) {
  console.error("error: updates.requestHeaders[\"expo-app-id\"] missing")
  process.exit(1)
}
const policy = c.runtimeVersion && c.runtimeVersion.policy
let runtime = typeof c.runtimeVersion === "string" ? c.runtimeVersion : ""
if (policy === "appVersion") {
  runtime = c.version || ""
}
if (!runtime) {
  console.error("error: could not resolve runtimeVersion (set policy appVersion + expo.version, or a string runtimeVersion)")
  process.exit(1)
}
const esc = (s) => String(s).replace(/'\''/g, "'\''\\'\'''\''")
console.log(`MANIFEST_URL='\''${esc(url)}'\''`)
console.log(`APP_ID='\''${esc(appId)}'\''`)
console.log(`RUNTIME_VERSION='\''${esc(runtime)}'\''`)
' "$CONFIG_JSON"
)"

TMP_HEADERS="$(mktemp)"
TMP_BODY="$(mktemp)"
trap 'rm -f "$TMP_HEADERS" "$TMP_BODY"' EXIT

echo "GET $MANIFEST_URL"
echo "  expo-app-id:          $APP_ID"
echo "  expo-channel-name:    $CHANNEL"
echo "  expo-runtime-version: $RUNTIME_VERSION"
echo "  expo-platform:        $PLATFORM"
echo

HTTP_CODE="$(
  curl -sS -D "$TMP_HEADERS" -o "$TMP_BODY" -w "%{http_code}" \
    "$MANIFEST_URL" \
    -H "expo-app-id: $APP_ID" \
    -H "expo-channel-name: $CHANNEL" \
    -H "expo-runtime-version: $RUNTIME_VERSION" \
    -H "expo-platform: $PLATFORM" \
    -H "expo-protocol-version: 1" \
    -H "accept: multipart/mixed, application/expo+json, application/json"
)"

echo "── response headers ──"
sed -n '1,40p' "$TMP_HEADERS"
echo
echo "── response body (first 80 lines) ──"
sed -n '1,80p' "$TMP_BODY"
echo

if [[ "$HTTP_CODE" != "200" && "$HTTP_CODE" != "204" ]]; then
  echo "error: unexpected HTTP $HTTP_CODE" >&2
  exit 1
fi

if grep -qiE 'expo-manifest-filters|content-type:.*(expo\+json|json|multipart)' "$TMP_HEADERS"; then
  echo "OK: manifest responded HTTP $HTTP_CODE for channel=$CHANNEL runtime=$RUNTIME_VERSION platform=$PLATFORM"
  exit 0
fi

# Empty 204 with no body can still be valid (no update); treat as soft OK with note.
if [[ "$HTTP_CODE" == "204" ]]; then
  echo "OK: HTTP 204 (no update / empty multipart) for channel=$CHANNEL runtime=$RUNTIME_VERSION"
  exit 0
fi

echo "error: response did not look like an Expo Updates manifest" >&2
exit 1
