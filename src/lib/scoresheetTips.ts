import {resolveNoPlayers} from '@/lib/matchFormat'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {Alert} from 'react-native'

export const SHOW_SCORESHEET_TIPS_KEY = 'show_scoresheet_tips'

export async function loadShowScoresheetTips(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SHOW_SCORESHEET_TIPS_KEY)
    if (!raw) return true
    const parsed = JSON.parse(raw)
    return typeof parsed?.show === 'boolean' ? parsed.show : true
  } catch {
    return true
  }
}

export async function saveShowScoresheetTips(show: boolean): Promise<void> {
  await AsyncStorage.setItem(
    SHOW_SCORESHEET_TIPS_KEY,
    JSON.stringify({show}),
  )
}

function countAssigned(ids?: number[]): number {
  if (!Array.isArray(ids)) return 0
  return ids.filter(id => id != null && Number(id) > 0).length
}

export function winPlayersRequiredMessage(args: {
  type?: string
  noPlayers?: number
  minPlayers?: number
  homePlayerIds?: number[]
  awayPlayerIds?: number[]
  homeLabel: string
  awayLabel: string
  t: (key: string, params?: Record<string, string | number>) => string
}): {title: string; message: string} {
  const need = resolveNoPlayers(
    args.type,
    null,
    args.minPlayers ?? args.noPlayers,
  )
  const home = countAssigned(args.homePlayerIds)
  const away = countAssigned(args.awayPlayerIds)
  const shortSides: string[] = []
  if (home < need) shortSides.push(args.homeLabel)
  if (away < need) shortSides.push(args.awayLabel)
  return {
    title: args.t('players_required_title'),
    message: args.t('players_required_message', {
      count: need,
      home,
      away,
      sides: shortSides.join(', '),
    }),
  }
}

/**
 * Gate explanation dialog. When tips are on, includes "Don't show tips";
 * disabling tips shows where to re-enable them in Preferences.
 */
export function showScoresheetGateDialog(opts: {
  title: string
  message: string
  tipsEnabled: boolean
  onDisableTips: () => void | Promise<void>
  t: (key: string) => string
}): void {
  const {title, message, tipsEnabled, onDisableTips, t} = opts
  if (!tipsEnabled) {
    Alert.alert(title, message, [{text: t('ok')}])
    return
  }
  Alert.alert(title, message, [
    {
      text: t('tip_turn_off'),
      style: 'cancel',
      onPress: () => {
        void (async () => {
          await onDisableTips()
          Alert.alert(t('tip_turned_off_title'), t('tip_turned_off_body'), [
            {text: t('ok')},
          ])
        })()
      },
    },
    {text: t('ok')},
  ])
}
