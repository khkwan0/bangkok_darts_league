import React from 'react'
import {ThemedView as View} from '@/components/ThemedView'
import {ThemedText as Text} from '@/components/ThemedText'
import {useTranslation} from 'react-i18next'
import {
  PANEL_I18N_KEY,
  PANEL_STATS_KEY,
  type HomePanelId,
} from '@/lib/homePanels'

interface StatsType {
  [gameType: string]: {
    played: number
    won: number
    winp: number
  }
}

const Stats = ({
  stats,
  panels,
}: {
  stats: StatsType
  panels?: HomePanelId[]
}) => {
  const {t} = useTranslation()

  const rows: Array<{key: string; label: string; bold?: boolean}> = []
  if (panels && panels.length > 0) {
    for (const panelId of panels) {
      const statsKey = PANEL_STATS_KEY[panelId]
      if (!stats[statsKey]) continue
      rows.push({
        key: statsKey,
        label: t(PANEL_I18N_KEY[panelId], {defaultValue: statsKey}),
      })
    }
    if (stats.Total) {
      rows.push({key: 'Total', label: t('total', {defaultValue: 'Total'}), bold: true})
    }
  } else {
    for (const gameType of Object.keys(stats)) {
      rows.push({
        key: gameType,
        label: gameType,
        bold: gameType === 'Total',
      })
    }
  }

  return (
    <>
      {rows.map((row, index) => {
        const margin = row.bold ? 10 : 0
        const fw = row.bold ? 'bold' : 'normal'
        const bucket = stats[row.key]
        if (!bucket) return null
        return (
          <View
            className="flex-row"
            key={row.key + '_' + index}
            style={{marginVertical: margin}}>
            <View style={{flex: 2}}>
              <Text style={{fontWeight: fw}}>{row.label}</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={{fontWeight: fw}}>{String(bucket.played)}</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={{fontWeight: fw}}>{String(bucket.won)}</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={{fontWeight: fw}}>{String(bucket.winp)}</Text>
            </View>
          </View>
        )
      })}
    </>
  )
}

export default Stats
