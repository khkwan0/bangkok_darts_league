import React from 'react'
import {router, useLocalSearchParams} from 'expo-router'
import ScanPlayerQr, {
  type ScannedPlayer,
} from '@/components/Teams/ScanPlayerQr'
import {useTeams} from '@/hooks'
import {useMatchContext} from '@/context/MatchContext'

export default function MatchScanPlayerQrScreen() {
  const teams = useTeams()
  const {state, UpdateFramePlayers}: any = useMatchContext()
  const {params} = useLocalSearchParams()
  const {frameIndex, slot, side, frameNumber, frameType} = JSON.parse(
    params as string,
  )

  async function handleConfirm(player: ScannedPlayer) {
    await teams.AddExistingPlayerToTeam(
      side === 'home'
        ? state.matchInfo.home_team_id
        : state.matchInfo.away_team_id,
      player.id,
    )
    UpdateFramePlayers(
      frameIndex,
      side,
      slot,
      player.id,
      player.nickname,
      false,
      frameType,
      frameNumber,
    )
    // Pop ScanPlayerQr + AddPlayer + ChoosePlayer.
    if (router.canDismiss()) {
      router.dismiss(3)
    } else {
      router.back()
    }
  }

  return <ScanPlayerQr onConfirm={handleConfirm} />
}
