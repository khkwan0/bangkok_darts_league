#!/usr/bin/env bash
# AGP runs the SDK ninja binary with no -j flag. Ninja then starts one compile
# per CPU, and each clang process can use around a gigabyte. Append -j so the
# last jobs value wins, including when a caller already passed -j.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
jobs="${NINJA_JOBS:-}"
if [[ -z "$jobs" && -f "$root/android/.bpl-ninja-jobs" ]]; then
  jobs="$(tr -d '[:space:]' < "$root/android/.bpl-ninja-jobs")"
fi
if [[ ! "$jobs" =~ ^[1-9][0-9]*$ ]]; then
  jobs=1
fi

if [[ -n "${ANDROID_NINJA_BIN:-}" && -x "$ANDROID_NINJA_BIN" ]]; then
  real="$ANDROID_NINJA_BIN"
else
  sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
  real=""
  for candidate in "$sdk"/cmake/*/bin/ninja; do
    if [[ -x "$candidate" ]]; then
      real="$candidate"
    fi
  done
fi

if [[ -z "$real" || ! -x "$real" ]]; then
  echo "limit-ninja: ninja not found. Set ANDROID_HOME or ANDROID_NINJA_BIN." >&2
  exit 1
fi

exec "$real" "$@" -j "$jobs"
