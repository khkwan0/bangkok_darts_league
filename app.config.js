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

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => ({
  expo: applyEnvConfig(appJson.expo),
})
