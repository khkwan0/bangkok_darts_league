#!/usr/bin/env bash
# Publish an OTA update for iOS and Android (skips web — native-only deps break web export).
# Usage:
#   npm run ota_publish -- -m "Fix standings crash"
#   npm run ota_publish -- --branch staging -m "QA build"
#
# Requires EOO_TOKEN in the environment (eoas does not load .env files).
# Optional: RELEASE_CHANNEL (defaults to production via app.config.js).
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [ -z "${EOO_TOKEN:-}" ]; then
  echo "error: EOO_TOKEN is not set (create an API token in the xprem dashboard)" >&2
  exit 1
fi

BRANCH="production"
MESSAGE=""
EXTRA=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)
      BRANCH="${2:?}"
      shift 2
      ;;
    -m|--message)
      MESSAGE="${2:?}"
      shift 2
      ;;
    *)
      EXTRA+=("$1")
      shift
      ;;
  esac
done

if [ -z "$MESSAGE" ]; then
  MESSAGE="$(git log -1 --pretty=%s 2>/dev/null || echo "OTA update")"
fi

export RELEASE_CHANNEL="${RELEASE_CHANNEL:-production}"

echo "Publishing to branch=$BRANCH channel=$RELEASE_CHANNEL"
echo "Message: $MESSAGE"
echo

for platform in ios android; do
  echo "── eoas publish --platform $platform ──"
  # "${EXTRA[@]+…}" avoids unbound-variable under `set -u` when EXTRA is empty (bash 3.2).
  npx eoas publish \
    --branch "$BRANCH" \
    --platform "$platform" \
    -m "$MESSAGE" \
    ${EXTRA[@]+"${EXTRA[@]}"}
  echo
done

echo "Done. Run: npm run ota_check"
