import {useColorScheme, type ViewStyle} from 'react-native'

export type SidePalette = {
  panel: string
  panelWinner: string
  border: string
  ink: string
  accent: string
  button: string
  onButton: string
}

const HOME_LIGHT: SidePalette = {
  panel: '#FFF1F2',
  panelWinner: '#FFE4E6',
  border: '#FECDD3',
  ink: '#9F1239',
  accent: '#E11D48',
  button: '#E11D48',
  onButton: '#FFFFFF',
}

const HOME_DARK: SidePalette = {
  panel: 'rgba(244, 63, 94, 0.16)',
  panelWinner: 'rgba(244, 63, 94, 0.32)',
  border: 'rgba(251, 113, 133, 0.38)',
  ink: '#FECDD3',
  accent: '#FB7185',
  button: '#E11D48',
  onButton: '#FFFFFF',
}

const AWAY_LIGHT: SidePalette = {
  panel: '#EEF2FF',
  panelWinner: '#E0E7FF',
  border: '#C7D2FE',
  ink: '#3730A3',
  accent: '#4F46E5',
  button: '#4F46E5',
  onButton: '#FFFFFF',
}

const AWAY_DARK: SidePalette = {
  panel: 'rgba(99, 102, 241, 0.18)',
  panelWinner: 'rgba(99, 102, 241, 0.34)',
  border: 'rgba(165, 180, 252, 0.4)',
  ink: '#C7D2FE',
  accent: '#A5B4FC',
  button: '#4F46E5',
  onButton: '#FFFFFF',
}

export function useScoresheetTheme() {
  const isDark = useColorScheme() === 'dark'
  return {
    isDark,
    canvas: isDark ? '#121418' : '#EEF2F6',
    card: isDark ? '#1C2230' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(15,23,42,0.08)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? 'rgba(226,232,240,0.62)' : 'rgba(15,23,42,0.52)',
    faint: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.06)',
    divider: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(15,23,42,0.08)',
    home: isDark ? HOME_DARK : HOME_LIGHT,
    away: isDark ? AWAY_DARK : AWAY_LIGHT,
    win: isDark ? '#34D399' : '#059669',
    gold: '#F5C542',
    goldInk: '#422006',
    shadow: {
      shadowColor: '#0F172A',
      shadowOpacity: isDark ? 0.4 : 0.08,
      shadowRadius: 12,
      shadowOffset: {width: 0, height: 6},
      elevation: 3,
    } satisfies ViewStyle,
  }
}
