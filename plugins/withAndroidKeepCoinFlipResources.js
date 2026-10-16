const {withDangerousMod} = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

/**
 * Release builds enable shrinkResources. Coin PNGs are only referenced from JS
 * (expo-gl textures), so AAPT2 can drop them and the GL scene goes black.
 * Keep the drawable names Metro emits for assets/images/coin/*.
 */
const KEEP_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools"
    tools:keep="@drawable/assets_images_coin_*,@drawable/*rama*,@drawable/*temple*,@drawable/*ten_baht*" />
`

function withAndroidKeepCoinFlipResources(config) {
  return withDangerousMod(config, [
    'android',
    async config => {
      const resRaw = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/raw',
      )
      fs.mkdirSync(resRaw, {recursive: true})
      fs.writeFileSync(path.join(resRaw, 'keep_coin_flip.xml'), KEEP_XML)
      return config
    },
  ])
}

module.exports = withAndroidKeepCoinFlipResources
