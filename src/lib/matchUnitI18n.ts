import i18n from '@/i18n'

/** Scoresheet row unit for darts: Game N (a game contains legs). */
const GAME_LABELS: Record<string, {frame: string; frames: string}> = {
  en: {frame: 'Game', frames: 'Games'},
  th: {frame: 'เกม', frames: 'เกม'},
  zh: {frame: '局', frames: '局'},
  ja: {frame: 'ゲーム', frames: 'ゲーム'},
  cockney: {frame: 'Game', frames: 'Games'},
}

const FRAME_LABELS: Record<string, {frame: string; frames: string}> = {
  en: {frame: 'Frame', frames: 'Frames'},
  th: {frame: 'กระดาน', frames: 'เฟรม'},
  zh: {frame: '局', frames: '局'},
  ja: {frame: 'フレーム', frames: 'フレーム'},
  cockney: {frame: 'Frame', frames: 'Frames'},
}

/** Apply pool/darts scoring-unit labels to i18n resources. */
export function applyScoreUnitToI18n(scoreUnit: 'frame' | 'leg' | string) {
  const unit = scoreUnit === 'leg' || scoreUnit === 'legs' ? 'leg' : 'frame'
  // Darts score_unit is "leg" but scoresheet rows are labeled Game (legs are inside a game).
  const labelsByLng = unit === 'leg' ? GAME_LABELS : FRAME_LABELS

  for (const [lng, labels] of Object.entries(labelsByLng)) {
    i18n.addResource(lng, 'translation', 'frame', labels.frame)
    i18n.addResource(lng, 'translation', 'frames', labels.frames)
  }

  if (unit === 'leg') {
    for (const lng of Object.keys(labelsByLng)) {
      const bundle = i18n.getResourceBundle(lng, 'translation') || {}
      const patched: Record<string, string> = {}
      for (const [key, value] of Object.entries(bundle)) {
        if (typeof value !== 'string') continue
        if (key === 'frame' || key === 'frames' || key === 'legs' || key === 'leg')
          continue
        let next = value
        if (lng === 'th') {
          // Remap pool frame wording only; keep เลก for series legs where intentional.
          next = next.replace(/เฟรม/g, 'เกม').replace(/กระดาน/g, 'เกม')
        } else if (lng === 'ja') {
          next = next.replace(/フレーム/g, 'ゲーム')
        } else if (lng !== 'zh') {
          next = next
            .replace(/\bFrames\b/g, 'Games')
            .replace(/\bframes\b/g, 'games')
            .replace(/\bFrame\b/g, 'Game')
            .replace(/\bframe\b/g, 'game')
        }
        if (next !== value) patched[key] = next
      }
      for (const [key, value] of Object.entries(patched)) {
        i18n.addResource(lng, 'translation', key, value)
      }
    }
  }
}
