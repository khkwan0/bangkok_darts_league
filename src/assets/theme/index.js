export const theme = {
  roundness: 8,
  palette: {
    light: {
      colors: {
        primary: 'rgb(16, 68, 153)', //brand-500
        onPrimary: 'rgb(255, 255, 255)', //neutral-50
        primaryContainer: 'rgb(252, 254, 255)', //brand-50
        onPrimaryContainer: 'rgb(17, 20, 61)', //brand-800

        playerRosterCardBackground: '#0000ff22',
        altPlayerRosterCardBackground: '#0011aa22',

        secondary: 'rgb(32, 86, 204)', //blue-500
        onSecondary: 'rgb(255, 255, 255)', //neutral-50
        secondaryContainer: 'rgb(235, 244, 255)', //blue-50
        onSecondaryContainer: 'rgb(10, 33, 118)', //blue-800

        tertiary: 'rgb(114, 85, 114)', //not used
        onTertiary: 'rgb(255, 255, 255)', //not used
        tertiaryContainer: 'rgb(253, 215, 250)', //not used
        onTertiaryContainer: 'rgb(42, 19, 44)', //not used

        teamCard: '#eee',
        teamCardAlt: '#fff',

        error: 'rgb(201, 32, 40)', // red-500
        onError: 'rgb(255, 255, 255)', //neutral-50

        errorContainer: 'rgb(255, 245, 240)', //red-50
        onErrorContainer: 'rgb(116, 10, 43)', // red-800

        background: '#eee',
        onBackground: 'rgb(29, 30, 34)', //neutral-900

        headerBackground: '#fff',
        onHeaderBackground: '#1d1e22',
        surface: '#fff',
        onSurface: '#1d1e22',
        surfaceVariant: '#fafafa', //neutral-100
        onSurfaceVariant: 'rgb(68, 70, 79)', //neutral-600

        onSurfaceVariant2: '#6b6d76',

        infoSurface: '#f5f6f9', // neutral-200
        onInfoSurface: '#393a40', // neutral-700

        outline: 'rgb(188, 192, 203)', //neutral-500
        outlineVariant: 'rgb(220, 223, 232)', //neutral-400

        matchCardBackground: '#fff',

        shadow: 'rgb(29, 30, 34)', //neutral-900
        scrim: 'rgb(29, 30, 34)', //neutral-900

        inverseSurface: 'rgb(17, 20, 61)', //brand-800
        inverseOnSurface: 'rgb(255, 255, 255)', //neutral-50
        inversePrimary: 'rgb(126, 162, 214)', //brand-200

        pressablePressed: '#aaa',
        switchThumb: '#a00',
        thumbTrack: '#aaa',

        filterButtonSurface: 'rgb(17, 20, 61)', //brand-800
        onFilterButtonSurface: 'rgb()',

        chosenInvestmentAsset: '#ebf4ff',
        activeSubsBackground: '#ebf4ff',
        redeemInfoBackground: '#ebf4ff',

        completedFrame: '#fff',
        completedFrameAlt: '#ccc',
        profilePicBackground: '#fff',

        success: '#3abb70',
        alert: '#DE5852', // red-400
        alertSurface: '#DE5852', // red-400
        onAlertSurface: '#fff',
        elevation: {
          level0: 'transparent',
          level1: 'rgb(244, 243, 251)',
          level2: 'rgb(238, 238, 249)',
          level3: 'rgb(231, 233, 246)',
          level4: 'rgb(229, 232, 246)',
          level5: 'rgb(225, 229, 244)',
        },
        surfaceVariant2: '#f5f6f9',
        surfaceDisabled: '#fafafa', // neutral-100 (Paper default code have opacity - let me know if we need to follow the exact thing)
        onSurfaceDisabled: 'rgb(188, 192, 203)', //neutral-500 (Paper default code have opacity - let me know if we need to follow the exact thing)
        backdrop: 'rgba(46, 48, 56, 0.4)',
        warning: '#F99807',
        warningBackground: '#FFFAE9',
        onWarningContainer: '#904602',
        brand: {
          800: '#11143D',
        },
        neutral: {
          100: '#fafafa',
          300: '#ebeef4',
          400: '#dcdfe8',
          500: '#bcc0cb',
          600: '#6B6D76',
          700: '#393a40',
          900: '#1d1e22',
        },
        blue: {
          50: '#ebf4ff',
          300: '#76a4ef',
          500: '#2056cc',
        },
        green: {
          50: '#ecffe8',
          300: '#63dd89',
          400: '#3abb70',
          500: '#0cbe4f',
          600: '#087a4e',
        },
        orange: {
          500: '#F99807',
          600: '#d67905',
        },
        yieldtextgray: '#6B6D76',
        boxSurface: 'rgb(17, 20, 61)', //neutral-50
        iconTheme: '#1d1e22',
      },
    },
    dark: {
      colors: {
        primary: 'rgb(16, 68, 153)', //brand-500
        onPrimary: 'rgb(255, 255, 255)', //neutral-50
        primaryContainer: 'rgb(38, 39, 43)', //neutral-800
        onPrimaryContainer: 'rgb(255, 255, 255)', //neutral-50

        secondary: 'rgb(32, 86, 204)', //blue-500
        onSecondary: 'rgb(255, 255, 255)', //neutral-50
        secondaryContainer: 'rgb(38, 39, 43)', //neutral-800
        onSecondaryContainer: 'rgb(255, 255, 255)', //neutral-50

        tertiary: 'rgb(114, 85, 114)', //not used
        onTertiary: 'rgb(255, 255, 255)', //not used
        tertiaryContainer: 'rgb(253, 215, 250)', //not used
        onTertiaryContainer: 'rgb(42, 19, 44)', //not used

        teamCard: '#1d1d1d',
        teamCardAlt: '#222',

        error: 'rgb(222, 88, 82)', // red-400
        onError: 'rgb(255, 255, 255)', //neutral-50
        errorContainer: 'rgb(255, 245, 240)', //red-50
        onErrorContainer: 'rgb(116, 10, 43)', // red-800

        background: 'rgb(29, 30, 34)', //neutral-900
        onBackground: 'rgb(255, 255, 255)', //neutral-50
        surface: 'rgb(29, 30, 34)', //neutral-900
        headerBackground: 'rgb(29, 30, 34)', //neutral-900
        onHeaderBackground: 'rgb(255, 255, 255)', //neutral-50
        onSurface: '#eee',
        surfaceVariant: 'rgb(57, 58, 64)', //neutral-700
        onSurfaceVariant: 'rgb(68, 70, 79)', //neutral-500
        backgroundVariant: '#fafafa',

        frameBackground: '#333',
        altFrameBackground: '#444',
        profilePicBackground: '#aaa',

        infoSurface: '#26272B', // neutral-200
        onInfoSurface: '#f5f6f9', // neutral-700

        outline: '#ebeef4', // neutral-300
        outlineVariant: 'rgb(107, 109, 118)', //neutral-600

        matchCardBackground: '#333',
        shadow: 'rgb(29, 30, 34)', //neutral-900
        scrim: 'rgb(29, 30, 34)', //neutral-900
        success: '#3abb70',

        chosenInvestmentAsset: '#2056cc',
        activeSubsBackground: '#ebf4ff',
        redeemInfoBackground: '#ebf4ff',
        inverseSurface: 'rgb(255, 255, 255)', //neutral-50
        inverseOnSurface: 'rgb(17, 20, 61)', //brand-800
        inversePrimary: 'rgb(16, 68, 153)', //brand-500

        pressablePressed: '#aaa',
        pressableUnpressed: '#444',
        completedFrame: '#fff',
        completedFrameAlt: '#ccc',

        alert: '#DE5852', // red-400
        alertSurface: '#DE5852', // red-400
        onAlertSurface: '#fff',
        filterButtonSurface: 'rgb(32, 86, 204)', //brand-800
        onFilterButtonSurface: '#fff',
        elevation: {
          level0: 'transparent',
          level1: 'rgb(244, 243, 251)',
          level2: 'rgb(238, 238, 249)',
          level3: 'rgb(231, 233, 246)',
          level4: 'rgb(229, 232, 246)',
          level5: 'rgb(225, 229, 244)',
        },
        surfaceDisabled: 'rgb(57, 58, 64)', // neutral-700 (PaperNative default code have opacity - let me know if we need to follow the exact thing)
        onSurfaceDisabled: 'rgb(188, 192, 203)', //neutral-500 (PaperNative default code have opacity - let me know if we need to follow the exact thing)
        backdrop: 'rgba(46, 48, 56, 0.4)',
        neutral: {
          100: '#fafafa',
          300: '#ebeef4',
          400: '#dcdfe8',
          500: '#bcc0cb',
          600: '#6B6D76',
          900: '#1d1e22',
        },
        blue: {
          50: '#ebf4ff',
          300: '#76a4ef',
          500: '#2056cc',
        },
        green: {
          50: '#ecffe8',
          300: '#63dd89',
          500: '#0cbe4f',
          600: '#087a4e',
        },
        orange: {
          500: '#F99807',
          600: '#d67905',
        },
        warningBackground: '#FFFAE9',
        onWarningContainer: '#904602',
        boxSurface: 'rgb(17, 20, 61)', //neutral-50
        yieldtextgray: '#6B6D76',
        iconTheme: '#ffffff',
      },
    },
    green: {
      colors: {
        primary: 'rgb(16, 68, 153)', //brand-500
        onPrimary: 'rgb(255, 255, 255)', //neutral-50
        primaryContainer: 'rgb(252, 254, 255)', //brand-50
        onPrimaryContainer: 'rgb(17, 20, 61)', //brand-800

        secondary: 'rgb(32, 86, 204)', //blue-500
        onSecondary: 'rgb(255, 255, 255)', //neutral-50
        secondaryContainer: 'rgb(235, 244, 255)', //blue-50
        onSecondaryContainer: 'rgb(10, 33, 118)', //blue-800

        tertiary: 'rgb(114, 85, 114)', //not used
        onTertiary: 'rgb(255, 255, 255)', //not used
        tertiaryContainer: 'rgb(253, 215, 250)', //not used
        onTertiaryContainer: 'rgb(42, 19, 44)', //not used

        error: 'rgb(201, 32, 40)', // red-500
        onError: 'rgb(255, 255, 255)', //neutral-50

        errorContainer: 'rgb(255, 245, 240)', //red-50
        onErrorContainer: 'rgb(116, 10, 43)', // red-800

        background: '#142e0d',
        onBackground: 'rgb(29, 30, 34)', //neutral-900

        surface: 'rgb(255, 255, 255)', //neutral-50
        onSurface: 'rgb(29, 30, 34)', //neutral-900
        surfaceVariant: '#fafafa', //neutral-100
        onSurfaceVariant: 'rgb(68, 70, 79)', //neutral-600

        onSurfaceVariant2: '#6b6d76',

        infoSurface: '#f5f6f9', // neutral-200
        onInfoSurface: '#393a40', // neutral-700

        outline: 'rgb(188, 192, 203)', //neutral-500
        outlineVariant: 'rgb(220, 223, 232)', //neutral-400

        shadow: 'rgb(29, 30, 34)', //neutral-900
        scrim: 'rgb(29, 30, 34)', //neutral-900

        inverseSurface: 'rgb(17, 20, 61)', //brand-800
        inverseOnSurface: 'rgb(255, 255, 255)', //neutral-50
        inversePrimary: 'rgb(126, 162, 214)', //brand-200

        filterButtonSurface: 'rgb(17, 20, 61)', //brand-800
        onFilterButtonSurface: 'rgb()',

        chosenInvestmentAsset: '#ebf4ff',
        activeSubsBackground: '#ebf4ff',
        redeemInfoBackground: '#ebf4ff',

        success: '#3abb70',
        alert: '#DE5852', // red-400
        alertSurface: '#DE5852', // red-400
        onAlertSurface: '#fff',
        elevation: {
          level0: 'transparent',
          level1: 'rgb(244, 243, 251)',
          level2: 'rgb(238, 238, 249)',
          level3: 'rgb(231, 233, 246)',
          level4: 'rgb(229, 232, 246)',
          level5: 'rgb(225, 229, 244)',
        },
        surfaceVariant2: '#f5f6f9',
        surfaceDisabled: '#fafafa', // neutral-100 (Paper default code have opacity - let me know if we need to follow the exact thing)
        onSurfaceDisabled: 'rgb(188, 192, 203)', //neutral-500 (Paper default code have opacity - let me know if we need to follow the exact thing)
        backdrop: 'rgba(46, 48, 56, 0.4)',
        warning: '#F99807',
        warningBackground: '#FFFAE9',
        onWarningContainer: '#904602',
        brand: {
          800: '#11143D',
        },
        neutral: {
          100: '#fafafa',
          300: '#ebeef4',
          400: '#dcdfe8',
          500: '#bcc0cb',
          600: '#6B6D76',
          700: '#393a40',
          900: '#1d1e22',
        },
        blue: {
          50: '#ebf4ff',
          300: '#76a4ef',
          500: '#2056cc',
        },
        green: {
          50: '#ecffe8',
          300: '#63dd89',
          400: '#3abb70',
          500: '#0cbe4f',
          600: '#087a4e',
        },
        orange: {
          500: '#F99807',
          600: '#d67905',
        },
        yieldtextgray: '#6B6D76',
        boxSurface: 'rgb(17, 20, 61)', //neutral-50
        iconTheme: '#1d1e22',
      },
    },
  },
}
