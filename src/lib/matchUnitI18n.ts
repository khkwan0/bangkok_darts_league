import i18n from '@/i18n'

const LEG_LABELS: Record<string, {frame: string; frames: string}> = {
  en: {frame: 'Leg', frames: 'Legs'},
  th: {frame: 'เลก', frames: 'เลก'},
  cockney: {frame: 'Leg', frames: 'Legs'},
}

const FRAME_LABELS: Record<string, {frame: string; frames: string}> = {
  en: {frame: 'Frame', frames: 'Frames'},
  th: {frame: 'กระดาน', frames: 'เฟรม'},
  cockney: {frame: 'Frame', frames: 'Frames'},
}

/** Apply pool/darts scoring-unit labels to i18n resources. */
export function applyScoreUnitToI18n(scoreUnit: 'frame' | 'leg' | string) {
  const unit = scoreUnit === 'leg' || scoreUnit === 'legs' ? 'leg' : 'frame'
  const labelsByLng = unit === 'leg' ? LEG_LABELS : FRAME_LABELS

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
        if (key === 'frame' || key === 'frames') continue
        let next = value
        if (lng === 'th') {
          next = next.replace(/เฟรม/g, 'เลก').replace(/กระดาน/g, 'เลก')
        } else {
          next = next
            .replace(/\bFrames\b/g, 'Legs')
            .replace(/\bframes\b/g, 'legs')
            .replace(/\bFrame\b/g, 'Leg')
            .replace(/\bframe\b/g, 'leg')
        }
        if (next !== value) patched[key] = next
      }
      for (const [key, value] of Object.entries(patched)) {
        i18n.addResource(lng, 'translation', key, value)
      }
    }
  }
}
