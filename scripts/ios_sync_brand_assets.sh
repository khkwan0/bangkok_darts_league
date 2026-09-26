#!/usr/bin/env bash
# Copy darts-themed icon/splash into the generated iOS asset catalogs after
# `expo prebuild`, clear Expo's splash caches (which can still hold pool-ball
# art), and rename the launch storyboard so iOS SpringBoard cannot show a
# cached snapshot of the old splash.
set -euo pipefail

cd "$(dirname "$0")/.."

ICON="assets/images/icon.png"
SPLASH="assets/images/splash-icon.png"

if [ ! -f "$ICON" ] || [ ! -f "$SPLASH" ]; then
  echo "error: missing $ICON or $SPLASH" >&2
  exit 1
fi

# Expo caches resized splash/app icons under .expo/web/cache keyed by content
# hash — an older pool-ball entry can be reapplied on prebuild.
if [ -d .expo/web/cache ]; then
  rm -rf .expo/web/cache
  echo "Cleared .expo/web/cache"
fi

APPICON=$(find ios -path '*/AppIcon.appiconset/App-Icon-1024x1024@1x.png' | head -1)
SPLASH_DIR=$(find ios -type d -path '*/SplashScreenLogo.imageset' | head -1)
BG_JSON=$(find ios -path '*/SplashScreenBackground.colorset/Contents.json' | head -1)
INFO_PLIST=$(find ios -maxdepth 2 -name Info.plist ! -path '*/Pods/*' | head -1)
APP_DIR=$(dirname "${INFO_PLIST:-ios/App}")
OLD_SB=$(find ios -maxdepth 2 -name 'SplashScreen.storyboard' ! -path '*/Pods/*' | head -1)
# Remove a previous cache-bust copy so prebuild's fresh SplashScreen can replace it.
if [ -f "${APP_DIR}/SplashScreenDarts.storyboard" ] && [ -n "${OLD_SB:-}" ]; then
  rm -f "${APP_DIR}/SplashScreenDarts.storyboard"
fi
# If only the renamed copy exists (no fresh prebuild output), keep using it.
if [ -z "${OLD_SB:-}" ]; then
  OLD_SB=$(find ios -maxdepth 2 -name 'SplashScreenDarts.storyboard' ! -path '*/Pods/*' | head -1)
fi
NEW_NAME="SplashScreenDarts"
NEW_SB="${APP_DIR}/${NEW_NAME}.storyboard"

if [ -f "$APPICON" ]; then
  sips -s format png "$ICON" --out "$APPICON" >/dev/null
  echo "Synced AppIcon ← $ICON"
fi

if [ -d "$SPLASH_DIR" ]; then
  for f in "$SPLASH_DIR"/*.png; do
    [ -f "$f" ] || continue
    w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
    h=$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')
    sips -z "$h" "$w" "$SPLASH" --out /tmp/bkk-darts-splash.png >/dev/null
    sips -s format png /tmp/bkk-darts-splash.png --out "$f" >/dev/null
  done
  echo "Synced SplashScreenLogo ← $SPLASH"
fi

if [ -f "$BG_JSON" ]; then
  cat > "$BG_JSON" <<'EOF'
{
  "colors": [
    {
      "color": {
        "components": {
          "alpha": "1.000",
          "blue": "0.06666666666667",
          "green": "0.06666666666667",
          "red": "0.06666666666667"
        },
        "color-space": "srgb"
      },
      "idiom": "universal"
    },
    {
      "color": {
        "components": {
          "alpha": "1.000",
          "blue": "0.06666666666667",
          "green": "0.06666666666667",
          "red": "0.06666666666667"
        },
        "color-space": "srgb"
      },
      "idiom": "universal",
      "appearances": [
        {
          "appearance": "luminosity",
          "value": "dark"
        }
      ]
    }
  ],
  "info": {
    "version": 1,
    "author": "expo"
  }
}
EOF
  echo "Synced SplashScreenBackground → #111111"
fi

# Bust iOS launch-screen snapshot cache: rename storyboard + Info.plist key.
# SpringBoard keys the cache by storyboard name; "SplashScreen" from the pool
# era can keep flashing the old art for a frame even after assets change.
if [ -n "${OLD_SB:-}" ] && [ -f "$OLD_SB" ]; then
  if [ "$OLD_SB" != "$NEW_SB" ]; then
    mv "$OLD_SB" "$NEW_SB"
  fi
  if [ -f "$INFO_PLIST" ]; then
    /usr/libexec/PlistBuddy -c "Set :UILaunchStoryboardName ${NEW_NAME}" "$INFO_PLIST" 2>/dev/null \
      || /usr/libexec/PlistBuddy -c "Add :UILaunchStoryboardName string ${NEW_NAME}" "$INFO_PLIST"
  fi
  PBX=$(find ios -name project.pbxproj ! -path '*/Pods/*' | head -1)
  if [ -n "$PBX" ] && [ -f "$PBX" ]; then
    /usr/bin/sed -i '' 's/SplashScreen\.storyboard/SplashScreenDarts.storyboard/g' "$PBX"
  fi
  echo "Launch storyboard → ${NEW_NAME} (cache bust)"
fi
