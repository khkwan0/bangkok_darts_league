/**
 * expo-three → expo-asset-utils declares expo-modules-core as a peer, so npm
 * nests a second copy under expo-three. That trips expo-doctor's native-module
 * duplicate check even when the version matches expo's. Remove the nest so
 * resolution walks up to expo's copy.
 */
const fs = require('fs')
const path = require('path')

const nested = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-three',
  'node_modules',
  'expo-modules-core',
)

fs.rmSync(nested, {recursive: true, force: true})
