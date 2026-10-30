import React from 'react'
import {router, useLocalSearchParams} from 'expo-router'
import {useLeague} from '@/hooks'
import ScanPlayerQr, {type ScannedPlayer} from './index'

export default function ScanPlayerQrForTeam() {
  const league = useLeague()
  const {teamIdParams, returnPath} = useLocalSearchParams()
  const teamId = JSON.parse(teamIdParams as string).teamId

  async function handleConfirm(player: ScannedPlayer) {
    const res = await league.AddPlayerToTeam(player.id, teamId)
    if (res.status !== 'ok') {
      throw new Error(res?.msg || 'error_adding_player')
    }
    if (returnPath) {
      router.dismissTo({
        pathname: returnPath as any,
        params: {params: JSON.stringify({teamId})},
      })
    } else {
      router.back()
    }
  }

  return <ScanPlayerQr onConfirm={handleConfirm} />
}
