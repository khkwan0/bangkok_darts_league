import React from 'react'
import {FlatList} from 'react-native'
import Divider from '@/components/Divider'
import {useMatch, useSeason} from '@/hooks'
import FrameDetail from './components/FrameDetail'
import {ThemedView as View} from '@/components/ThemedView'
import MatchHeader from './components/MatchHeader'
import {useTranslation} from 'react-i18next'
import {useTheme} from "expo-router/react-navigation"

const MatchDetails = props => {
  const {GetMatchDetails} = useMatch()
  const [matchDetails, setMatchDetails] = React.useState([])
  const [err, setErr] = React.useState('')
  const {colors} = useTheme()
  const {t} = useTranslation()
  const season = useSeason()

  React.useEffect(() => {
    ;(async () => {
      try {
        const res = await season.GetMatchStats(props.matchId)
        if (typeof res.status !== 'undefined' && res.status === 'ok') {
          setMatchDetails(res.data)
        } else {
          setErr(res.error)
        }
      } catch (e) {
        console.log(e)
      }
    })()
  }, [props.matchId])

  if (matchDetails.length > 0) {
    return (
      <View>
        <FlatList
          ListHeaderComponent={<MatchHeader matchData={matchDetails} />}
          style={{backgroundColor: colors.surface}}
          data={matchDetails}
          keyExtractor={(item, idx) => 'asdasd' + idx}
          renderItem={(item, idx) => (
            <FrameDetail item={item} idx={idx} matchId={props.matchId} />
          )}
          ItemSeparatorComponent={<Divider />}
        />
      </View>
    )
  } else {
    return null
  }
}

export default MatchDetails
