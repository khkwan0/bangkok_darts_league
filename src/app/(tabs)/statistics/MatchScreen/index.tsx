import React from 'react'
import {View, ActivityIndicator} from 'react-native'
import {useLocalSearchParams} from 'expo-router'
import CompleteMatchDetails from '@/components/Completed/CompletedMatchDetails'

export default function MatchScreen() {
  const {matchId} = useLocalSearchParams()
  return <CompleteMatchDetails matchId={Number(matchId)} />
}
