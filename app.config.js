const appJson = require('./app.json')

const SENTRY_PLUGIN = '@sentry/react-native/expo'

function applyEnvConfig(expo) {
  const plugins = (expo.plugins ?? []).filter((entry) => {
    const name = Array.isArray(entry) ? entry[0] : entry
    return name !== SENTRY_PLUGIN
  })

  const sentryOrg = process.env.SENTRY_ORG
  const sentryProject = process.env.SENTRY_PROJECT
  if (sentryOrg && sentryProject) {
    plugins.push([
      SENTRY_PLUGIN,
      {
        url: 'https://sentry.io/',
        organization: sentryOrg,
        project: sentryProject,
      },
    ])
  }

  const ios = {...expo.ios}
  if (process.env.APPLE_TEAM_ID) {
    ios.appleTeamId = process.env.APPLE_TEAM_ID
  } else {
    delete ios.appleTeamId
  }

  return {
    ...expo,
    ios,
    plugins,
  }
}

/** xprem dashboard App ID for Bangkok Darts League (set in .env.local). */
const xpremAppId = process.env.XPREM_APP_ID || ''

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => ({
  // Must nest updates/runtimeVersion under `expo` — top-level siblings are ignored.
  expo: {
    ...applyEnvConfig(appJson.expo),
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://ota.bkkleague.com/manifest',
      enabled: true,
      codeSigningMetadata: process.env.DISABLE_CODE_SIGNING
        ? undefined
        : {keyid: 'main', alg: 'rsa-v1_5-sha256'},
      codeSigningCertificate: process.env.DISABLE_CODE_SIGNING
        ? undefined
        : './certs/certificate.pem',
      requestHeaders: {
        // Literal (or RELEASE_CHANNEL with a default). An unset env key is
        // stripped at export time and breaks channel resolution.
        'expo-channel-name': process.env.RELEASE_CHANNEL || 'production',
        'expo-app-id': xpremAppId,
        // Branch surfing — empty means the channel decides.
        'xprem-branch': '',
      },
    },
  },
})
