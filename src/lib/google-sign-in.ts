import {TurboModuleRegistry} from 'react-native'

type GoogleSignInModule = {
  GoogleSignin: {
    configure: (options: {webClientId: string; iosClientId?: string}) => void
    hasPlayServices: (options: {
      showPlayServicesUpdateDialog: boolean
    }) => Promise<boolean>
    signIn: () => Promise<{
      type: string
      data?: {idToken?: string | null}
    }>
  }
  isSuccessResponse: (response: {type: string}) => boolean
  isCancelledResponse: (response: {type: string}) => boolean
  isErrorWithCode: (error: unknown) => error is {code?: string; message?: string}
  statusCodes: {SIGN_IN_CANCELLED: string}
}

/** True only after a native build that includes Google Sign-In. */
export function googleSignInNativeAvailable(): boolean {
  return Boolean(TurboModuleRegistry.get('RNGoogleSignin'))
}

export function loadGoogleSignIn(): GoogleSignInModule | null {
  if (!googleSignInNativeAvailable()) return null
  try {
    // Static import runs TurboModuleRegistry.getEnforcing and crashes
    // binaries built before this native module existed.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin') as GoogleSignInModule
  } catch {
    return null
  }
}
