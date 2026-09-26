import React from 'react'
import {Text, TextInput, View} from 'react-native'
import Button from '@/components/Button'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {useTranslation} from 'react-i18next'
import MCI from 'expo-vector-icons/MaterialCommunityIcons'
import {useLeague, useYBase} from '~/lib/hooks'
import {FlatList} from 'react-native'
import SeasonPicker from '@/components/SeasonPicker'
import GameTypePicker from '@/components/GameTypePicker'

const Division = props => {
  const division = props.item.item
  return (
    <View py={5}>
      <View className="flex-row items-center space-x-5">
        <View className="flex-2">
          <Text>
            {division.id} {division.name}
          </Text>
        </View>
        <View className="flex-1">
          <Text>{division.short_name}</Text>
        </View>
        {props.season > 10 && (
          <>
            <View className="flex-2">
              <Text>{division.conference_name}</Text>
            </View>
            <View className="flex-2">
              <Text>{division.league_name}</Text>
            </View>
          </>
        )}
      </>
    </View>
  )
}
const Divisions = props => {
  const {colors} = useYBase()
  const league = useLeague()
  const {t} = useTranslation()
  const [season, setSeason] = React.useState(null)
  const [divisions, setDivisions] = React.useState([])
  const [showAdd, setShowAdd] = React.useState(false)
  const [divisionName, setDivisionName] = React.useState('')
  const [gameType, setGameType] = React.useState('')

  React.useEffect(() => {
    ;(async () => {
      try {
        const res2 = await league.GetSeasonV2()
        setSeason(res2[0].id)
      } catch (e) {
        console.log(e)
      }
    })()
  }, [])

  async function GetDivisionsBySeason() {
    try {
      const res = await league.GetDivisionsBySeason(season)
      if (typeof res.status !== 'undefined' && res.status === 'ok') {
        setDivisions(res.data)
      }
    } catch (e) {
      console.log(e)
    }
  }

  React.useEffect(() => {
    GetDivisionsBySeason()
  }, [season])

  function DoCancel() {
    setDivisionName('')
    setShowAdd(false)
  }

  async function DoSave() {
    try {
      if (divisionName && gameType) {
        const res = await league.SaveDivision(divisionName)
      }
    } catch (e) {
      console.log(e)
    }
  }

  if (season) {
    return (
      <View className="flex-1 px-5">
        <SeasonPicker setSeason={setSeason} season={season} />
        <Text className="text-center text-2xl font-bold mb-5">
          {t('season_number', {n: season})}
        </Text>
        <Button onPress={() => setShowAdd(true)}>
          <Text>Add division</Text>
        </Button>
        {showAdd && (
          <View>
            <TextInput
              onChangeText={text => setDivisionName(text)}
              value={divisionName}
              placeholder="Name (required) Ex: 8 Ball - A"
            />
            <GameTypePicker gameType={gameType} setGameType={setGameType} />
            <View className="flex-row items-center">
              <View className="flex-1">
                <Button onPress={() => DoCancel()}>Cancel</Button>
              </View>
              <View className="flex-1">
                <Button onPress={() => DoSave()}>Save</Button>
              </View>
            </View>
          </View>
        )}
        <FlatList
          data={divisions}
          renderItem={(item, idx) => (
            <Division item={item} idx={idx} season={season} />
          )}
        />
      </View>
    )
  } else {
    return <View className="flex-1" />
  }
}

export default Divisions