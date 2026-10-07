const {AndroidConfig, withAndroidManifest} = require('expo/config-plugins')

/**
 * Strip advertising-ID permissions from the merged manifest without listing
 * them in app.json `blockedPermissions` (that string is embedded in
 * app.config inside the AAB and can trip Play Console's AD_ID check).
 */
const PERMISSIONS_TO_REMOVE = [
  'com.google.android.gms.permission.AD_ID',
  'android.permission.ACCESS_ADSERVICES_AD_ID',
]

function ensureRemovePermission(manifest, name) {
  const key = 'uses-permission'
  const list = manifest[key] ?? []
  const rest = list.filter(entry => entry.$?.['android:name'] !== name)
  rest.push({
    $: {
      'android:name': name,
      'tools:node': 'remove',
    },
  })
  manifest[key] = rest
}

module.exports = function withAndroidBlockAdId(config) {
  return withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest ?? config.modResults
    if (manifest?.$) {
      manifest.$['xmlns:tools'] =
        manifest.$['xmlns:tools'] ?? 'http://schemas.android.com/tools'
    }

    for (const name of PERMISSIONS_TO_REMOVE) {
      ensureRemovePermission(manifest, name)
    }

    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    )
    mainApplication['meta-data'] = mainApplication['meta-data'] ?? []
    const metaName = 'google_analytics_adid_collection_enabled'
    const existing = mainApplication['meta-data'].find(
      entry => entry.$?.['android:name'] === metaName,
    )
    if (existing) {
      existing.$['android:value'] = 'false'
    } else {
      mainApplication['meta-data'].push({
        $: {
          'android:name': metaName,
          'android:value': 'false',
        },
      })
    }

    return config
  })
}
