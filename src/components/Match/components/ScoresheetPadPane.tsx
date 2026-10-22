import {EmptySplitDetail} from '@/components/layout/EmptySplitDetail'
import {useScoresheetPad} from '@/context/ScoresheetPadContext'
import {useTranslation} from 'react-i18next'
import {View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import StatNumberPadInline from './StatNumberPadInline'
import {useScoresheetTheme} from './scoresheetTheme'

/** Trailing scoresheet pane: persistent number pad or idle empty state. */
export default function ScoresheetPadPane() {
  const pad = useScoresheetPad()
  const {t} = useTranslation()
  const theme = useScoresheetTheme()
  const insets = useSafeAreaInsets()

  if (pad?.session == null) {
    return (
      <View style={{flex: 1, backgroundColor: theme.canvas}}>
        <EmptySplitDetail message={t('tap_stat_to_score')} />
      </View>
    )
  }

  const {session} = pad
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.canvas,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 12,
      }}>
      <StatNumberPadInline
        title={session.title}
        value={session.value}
        max={session.max}
        accent={session.accent}
        onCancel={() => {
          session.onCancel()
          pad.closePad()
        }}
        onConfirm={value => {
          session.onConfirm(value)
          pad.closePad()
        }}
      />
    </View>
  )
}
