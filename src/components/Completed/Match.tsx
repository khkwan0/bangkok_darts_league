import React from 'react'
import {View, FlatList} from 'react-native'
import {useSeason} from '@/hooks'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import MatchHeader from '@/components/Completed/MatchHeader'
import FrameDetail from '@/components/Completed/FrameDetail'
import Divider from '@/components/Divider'
import {useNavigation} from "expo-router/react-navigation"
import {useColorScheme} from 'react-native'

export default function Match({match}: {match: Match}) {
  const [matchDetails, setMatchDetails] = React.useState([])
  const [err, setErr] = React.useState('')
  const season = useSeason()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const colorscheme = useColorScheme()
  React.useEffect(() => {
    navigation.setOptions({
      title: `Match #${match.matchId}`,
    })
  }, [match.matchId, navigation])
  React.useEffect(() => {
    ;(async () => {
      try {
        const res = await season.GetMatchStats(match.matchId)
        if (typeof res.status !== 'undefined' && res.status === 'ok') {
          setMatchDetails(res.data)
        } else {
          setErr(res.error)
        }
      } catch (e) {
        console.log(e)
      }
    })()
  }, [match.matchId])

  if (matchDetails.length > 0) {
    return (
      <FlatList
        contentContainerStyle={{
          paddingBottom: insets.bottom,
          backgroundColor: colorscheme === 'dark' ? 'black' : 'white',
        }}
        ListHeaderComponent={<MatchHeader matchData={matchDetails} />}
        data={matchDetails}
        keyExtractor={(item, idx) => 'asdasd' + idx}
        renderItem={({item, index}) => (
          <FrameDetail item={item} idx={index} matchId={match.matchId} />
        )}
        ItemSeparatorComponent={<Divider />}
      />
    )
  } else {
    return null
  }
}
