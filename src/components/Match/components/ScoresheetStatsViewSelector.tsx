import type {ScoresheetStatsView} from '@/lib/scoresheetStatsView'
import {SCORESHEET_STATS_VIEWS} from '@/lib/scoresheetStatsView'
import * as Haptics from 'expo-haptics'
import {useTranslation} from 'react-i18next'
import {Pressable, Text, View} from 'react-native'
import {useScoresheetTheme} from './scoresheetTheme'

const LABEL_KEYS: Record<ScoresheetStatsView, string> = {
  compact: 'scoresheet_view_compact',
  full: 'scoresheet_view_full',
  focus: 'scoresheet_view_focus',
}

type Props = {
  value: ScoresheetStatsView
  onChange: (view: ScoresheetStatsView) => void
}

export default function ScoresheetStatsViewSelector({value, onChange}: Props) {
  const {t} = useTranslation()
  const theme = useScoresheetTheme()

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginBottom: 4,
        padding: 4,
        borderRadius: 12,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        flexDirection: 'row',
        gap: 4,
      }}>
      {SCORESHEET_STATS_VIEWS.map(view => {
        const selected = view === value
        return (
          <Pressable
            key={view}
            onPress={() => {
              if (view === value) return
              Haptics.selectionAsync()
              onChange(view)
            }}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 9,
              alignItems: 'center',
              backgroundColor: selected ? theme.faint : 'transparent',
            }}
            accessibilityRole="button"
            accessibilityState={{selected}}>
            <Text
              style={{
                color: selected ? theme.text : theme.muted,
                fontSize: 12,
                fontWeight: selected ? '800' : '600',
              }}>
              {t(LABEL_KEYS[view])}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
