import {useMatchContext} from '@/context/MatchContext'
import {router} from 'expo-router'
import {Pressable, Text, View} from 'react-native'
import {useScoresheetTheme} from './scoresheetTheme'

export default function VSHeader() {
  const {state}: any = useMatchContext()
  const theme = useScoresheetTheme()

  function openTeam(teamId: number) {
    router.push({
      pathname: '../Match/Team',
      params: {
        params: JSON.stringify({teamId}),
      },
    })
  }

  return (
    <View style={{flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12}}>
      <Pressable
        style={{flex: 1, alignItems: 'center'}}
        onPress={() => openTeam(state.matchInfo.home_team_id)}>
        <Text
          style={{
            textAlign: 'center',
            color: theme.text,
            fontSize: 18,
            fontWeight: '800',
            letterSpacing: 0.2,
          }}
          numberOfLines={2}>
          {state.matchInfo.home_team_short_name}
        </Text>
        <View
          style={{
            marginTop: 8,
            width: 36,
            height: 3,
            borderRadius: 2,
            backgroundColor: theme.home.accent,
          }}
        />
      </Pressable>
      <View style={{width: 44, alignItems: 'center'}}>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: theme.faint,
          }}>
          <Text
            style={{
              color: theme.muted,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1,
            }}>
            VS
          </Text>
        </View>
      </View>
      <Pressable
        style={{flex: 1, alignItems: 'center'}}
        onPress={() => openTeam(state.matchInfo.away_team_id)}>
        <Text
          style={{
            textAlign: 'center',
            color: theme.text,
            fontSize: 18,
            fontWeight: '800',
            letterSpacing: 0.2,
          }}
          numberOfLines={2}>
          {state.matchInfo.away_team_short_name}
        </Text>
        <View
          style={{
            marginTop: 8,
            width: 36,
            height: 3,
            borderRadius: 2,
            backgroundColor: theme.away.accent,
          }}
        />
      </Pressable>
    </View>
  )
}
