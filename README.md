# Bangkok Darts League

Expo / React Native app for the Bangkok Darts League (league id 3), sibling to Bangkok Pool League. API host: `darts.bkkleague.com`.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Create local config

   ```bash
   cp src/config.example.js src/config.js
   cp .env.example .env.local
   ```

   Edit `src/config.js` for your API host and third-party IDs. Set Sentry, Apple team ID, and signing vars in `.env.local`. See [Configuration](#configuration) below.

3. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Configuration

Runtime settings live in **`src/config.js`**, which is **gitignored**. New clones should copy the example:

```bash
cp src/config.example.js src/config.js
```

Import it anywhere as `@/config` or `@/config.js`.

### Environment variables (`.env.local`)

Copy `.env.example` → `.env.local` (gitignored). Expo loads it for **`app.config.js`** at prebuild time and inlines **`EXPO_PUBLIC_*`** into the JS bundle.

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN in `src/app/_layout.tsx` (optional; app runs without it) |
| `SENTRY_ORG` | Sentry org for `@sentry/react-native/expo` plugin |
| `SENTRY_PROJECT` | Sentry project for the plugin |
| `APPLE_TEAM_ID` | Apple Developer team ID (`app.config.js` + `archive_ios` export) |

`app.config.js` merges these into `app.json` — Sentry plugin and `ios.appleTeamId` are not hardcoded in the repo.

Release-build credentials (`ASC_*`, `ANDROID_*`, `PLAY_*`) are also documented in `.env.example` and [Release builds](#release-builds).

### File layout (`src/config.js`)

| Export / field | Purpose |
|----------------|---------|
| `domain` | API hostname (no scheme), used for some Socket.IO connections |
| `webSocketDomain` | Socket.IO hostname (no scheme) |
| `profilePicturesUrl` | Host + path prefix for player avatars |
| `apiUrl` | REST API base, e.g. `https://darts.bkkleague.com/api` |
| `webSocketUrl` | Socket.IO origin, e.g. `https://darts.bkkleague.com` |
| `logoUrl` | Base URL for team/venue logos |
| `profileUrl` | Base URL for profile pictures |
| `forumImagesUrl` | Optional; forum post images (defaults to `/forum_images/` on the `apiUrl` host) |
| `ONESIGNAL_APP_ID` | OneSignal push notification app ID |
| `line.channelId` | LINE Login channel ID |
| `version` | User-facing app version string |
| `build` | Native build number shown in Settings |

### Version sync

Deploy and archive scripts update `version` and `build` in `src/config.js` from **`app.json`** before each build:

- iOS: `expo.version`, `expo.ios.buildNumber`
- Android: `expo.version`, `expo.android.versionCode`

Bump those in `app.json` before store releases; do not rely on hand-editing `config.js` for production builds.

### Overrides at runtime

`LeagueContext` can persist a custom API URL in AsyncStorage (`api_domain`) for admin/staging testing. Defaults always come from `src/config.js`.

### Related files (also gitignored)

| File | Purpose |
|------|---------|
| `.env.local` | Sentry, Apple team ID, signing, and store-upload credentials |
| `.env.example` | Template for `.env.local` |
| `GoogleService-Info.plist` | Firebase iOS config (referenced in `app.json`) |
| `firebase.google-services.json` | Firebase Android config (referenced in `app.json`) |

## Android wireless debugging (Wi-Fi)

Use this when you want to run the app on a physical Android device without a USB cable after initial pairing.

1. Connect your Android device and computer to the same Wi-Fi network.
2. Enable developer options and turn on **USB debugging** on your Android device.
3. Enable wireless debugging
4. Connect the device once with USB and verify ADB can see it:

   ```bash
   adb devices
   ```

5. Pair the device if not paired.

Push the button that allows you to pair with a PIN.
then when the pop up shows...use the ip address and port and type

```bash
adb pair <ip address>:<port>
```

6. Find your phone's local IP address (Wi-Fi details on the device), then connect:

   ```bash
   adb connect <DEVICE_IP>:5555
   ```

7. Unplug USB, confirm the device is still connected, then run Expo:

   ```bash
   adb devices
   npx expo start
   ```

To disconnect later:

```bash
adb disconnect <DEVICE_IP>:5555
```

## Release builds

Scripts live in `scripts/` and are wired in `package.json`. All of them sync `app.json` version fields into `src/config.js` before building.

| Script | Purpose |
|--------|---------|
| `npm run deploy_ios` | Debug build → install on a connected iPhone |
| `npm run deploy_android` | Debug build → install on a connected Android device |
| `npm run archive_ios` | Release archive → export IPA → upload to App Store Connect |
| `npm run archive_android` | Release AAB → upload to Google Play |

Bump **`expo.version`** and the platform build number in **`app.json`** before a store release:

- iOS: `expo.ios.buildNumber`
- Android: `expo.android.versionCode`

### `deploy_ios` / `deploy_android`

Use these for day-to-day testing on a physical device. They run `expo prebuild`, then `expo run:<platform> --device`.

```bash
npm run deploy_ios
npm run deploy_android
```

Extra CLI args are forwarded to `expo run` (e.g. pick a specific device).

**iOS** (`scripts/deploy_ios.sh`):

- Unlocks the login keychain for code signing.
- Caps Xcode parallelism via a temporary `xcodebuild` wrapper (`MAX_CPUS`, default `4`).

**Android** (`scripts/deploy_android.sh`):

- Applies Gradle/Metro memory and worker limits after prebuild (`scripts/android_gradle_limits.sh`).
- See [Gradle limits](#gradle-limits-android) below.

Requires a USB- or Wi‑Fi-paired device (`adb devices` / Xcode device list).

### `archive_ios` / `archive_android`

Use these for store uploads. Both support building only (no upload) with `ARCHIVE_ONLY=1`.

#### iOS archive (`npm run archive_ios`)

1. `expo prebuild --platform ios`
2. `xcodebuild archive` (Release, iPhone only) → `build/BangkokDartsLeague.xcarchive` by default
3. Export IPA via `ios-export/ExportOptions.plist` → `build/`
4. Upload to App Store Connect with `xcrun altool`

**Credentials** (in `.env.local` or the environment):

```bash
ASC_KEY_ID=XXXXXXXXXX
ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Place the API key file at `private_keys/AuthKey_${ASC_KEY_ID}.p8` (or `~/.appstoreconnect/private_keys/`).

**Examples:**

```bash
# Archive, export, and upload (default)
npm run archive_ios

# Archive only — skip export and upload
ARCHIVE_ONLY=1 npm run archive_ios

# Custom paths
ARCHIVE_PATH=build/MyApp.xcarchive EXPORT_PATH=build npm run archive_ios
```

**Optional env vars:** `ARCHIVE_PATH`, `EXPORT_PATH`, `EXPORT_OPTIONS`, `PRIVATE_KEYS_DIR`, `MAX_CPUS` (default `4`), `CLEAN_DERIVED_DATA=1`, `ARCHIVE_LOG`, `SENTRY_ALLOW_FAILURE` (default `true`).

**If archive hangs or crashes:** stop the run (`Ctrl+C`), clear stale build state, then retry:

```bash
killall xcodebuild XCBBuildService 2>/dev/null || true
CLEAN_DERIVED_DATA=1 npm run archive_ios
```

#### Android archive (`npm run archive_android`)

1. `expo prebuild --platform android`
2. Writes `android/keystore.properties` from signing env vars
3. `./gradlew bundleRelease` → `android/app/build/outputs/bundle/release/app-release.aab`
4. Copies the AAB to `build/`
5. Uploads via `scripts/upload_play.js` (Google Play Android Publisher API)

**Signing credentials** (required):

```bash
ANDROID_KEYSTORE_PATH=private_keys/android-release.jks
ANDROID_KEYSTORE_PASSWORD=...
ANDROID_KEY_ALIAS=...
ANDROID_KEY_PASSWORD=...
```

**Play upload credentials** (required unless `ARCHIVE_ONLY=1`):

```bash
PLAY_SERVICE_ACCOUNT_JSON=private_keys/play-service-account.json
PLAY_TRACK=internal          # internal | alpha | beta | production
PLAY_RELEASE_STATUS=completed # completed | draft | halted | inProgress
PLAY_PACKAGE_NAME=com.bangkok_darts_league
```

The service account JSON must be a **Google Cloud service account key** (`type: service_account`), not `google-services.json`. Invite the service account email in Play Console → Users and permissions with release permissions.

**Examples:**

```bash
# Build AAB and upload to internal track (default)
npm run archive_android

# Build AAB only
ARCHIVE_ONLY=1 npm run archive_android

# Upload to a different track
PLAY_TRACK=beta npm run archive_android
```

**Optional env vars:** `AAB_PATH`, `ARCHIVE_ONLY`, `SENTRY_ALLOW_FAILURE` (default `true`), plus Gradle limits below.

### Gradle limits (Android)

`scripts/android_gradle_limits.sh` caps workers and JVM heaps so release builds stay within memory on smaller Macs. Applied by both `deploy_android` and `archive_android` after prebuild.

| Variable | Default | Purpose |
|----------|---------|---------|
| `MAX_CPUS` | `4` | Gradle workers / Xcode `-jobs` |
| `MAX_HEAP_MB` | `1536` | Gradle daemon heap |
| `MAX_METASPACE_MB` | `768` | Gradle metaspace |
| `KOTLIN_HEAP_MB` | `1024` | Kotlin daemon heap |
| `NODE_HEAP_MB` | `1536` | Metro bundler (`NODE_OPTIONS`) |

Example:

```bash
MAX_CPUS=2 MAX_HEAP_MB=2048 npm run archive_android
```

### Local secrets

Create `.env.local` in the project root (gitignored). Both archive scripts `source` it automatically. Never commit keystores, `.p8` keys, or service account JSON — keep them under `private_keys/` or outside the repo.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
