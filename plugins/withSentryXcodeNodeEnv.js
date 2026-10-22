const {withXcodeProject} = require('expo/config-plugins')

const PHASE_NAME = 'Upload Debug Symbols to Sentry'

// Call the upload script by path. Sentry's default phase uses
// `${NODE_BINARY:-node}` to *resolve* the script path first, before
// .xcode.env is loaded — Xcode GUI has no Homebrew on PATH, so that
// fails with "node: command not found". The script itself sources
// React Native's with-environment.sh and loads NODE_BINARY correctly.
const FIXED_SCRIPT = [
  'if [ -f "$SRCROOT/.xcode.env" ]; then',
  '  . "$SRCROOT/.xcode.env"',
  'fi',
  'if [ -f "$SRCROOT/.xcode.env.local" ]; then',
  '  . "$SRCROOT/.xcode.env.local"',
  'fi',
  '/bin/sh "$SRCROOT/../node_modules/@sentry/react-native/scripts/sentry-xcode-debug-files.sh"',
].join('\n')

function readShellScript(phase) {
  try {
    return JSON.parse(phase.shellScript)
  } catch {
    return phase.shellScript
  }
}

function writeShellScript(phase, script) {
  phase.shellScript = JSON.stringify(script)
}

/**
 * Replace Sentry's "Upload Debug Symbols" phase so it does not invoke bare
 * `node` before ios/.xcode.env(.local) is available.
 */
module.exports = function withSentryXcodeNodeEnv(config) {
  return withXcodeProject(config, config => {
    const project = config.modResults
    const phase = project.pbxItemByComment(PHASE_NAME, 'PBXShellScriptBuildPhase')
    if (!phase) {
      return config
    }

    const current = readShellScript(phase)
    const disablePrefix =
      current.match(/^export SENTRY_DISABLE_AUTO_UPLOAD=true\n?/)?.[0] ?? ''

    // Always rewrite — Sentry's plugin overwrites this phase on every prebuild.
    writeShellScript(phase, `${disablePrefix}${FIXED_SCRIPT}`)
    return config
  })
}
