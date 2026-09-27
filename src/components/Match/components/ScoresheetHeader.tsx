import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import {Pressable, View} from 'react-native'
import FirstBreak from './FirstBreak'
import Score from './Score'
import VSHeader from './VSHeader'
import {useScoresheetTheme} from './scoresheetTheme'

type ScoresheetHeaderProps = {
  sticky: boolean
  onToggleSticky: () => void
}

export default function ScoresheetHeader({
  sticky,
  onToggleSticky,
}: ScoresheetHeaderProps) {
  const theme = useScoresheetTheme()

  function handleToggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onToggleSticky()
  }

  return (
    <View
      style={[
        {
          marginHorizontal: 12,
          marginTop: 12,
          marginBottom: 8,
          borderRadius: 18,
        },
        sticky ? {backgroundColor: theme.canvas} : null,
        theme.shadow,
      ]}>
      <View
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.cardBorder,
          paddingBottom: 16,
        }}>
        <View style={{flexDirection: 'row', height: 4}}>
          <View style={{flex: 1, backgroundColor: theme.home.accent}} />
          <View style={{flex: 1, backgroundColor: theme.away.accent}} />
        </View>
        <View style={{position: 'absolute', top: 10, right: 10, zIndex: 2}}>
          <Pressable
            onPress={handleToggle}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              sticky ? 'Unpin scoresheet header' : 'Pin scoresheet header'
            }
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.faint,
            }}>
            {({pressed}) => (
              <MCI
                name={sticky ? 'pin' : 'pin-off'}
                size={16}
                color={pressed ? theme.win : sticky ? theme.text : theme.muted}
              />
            )}
          </Pressable>
        </View>
        <View style={{paddingTop: 16}}>
          <VSHeader />
        </View>
        <Score />
        <FirstBreak />
      </View>
    </View>
  )
}
