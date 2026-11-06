import ScanPlayerQr, {
  type ScannedPlayer,
} from '@/components/Teams/ScanPlayerQr'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView} from '@/components/ThemedView'
import {useMatchContext} from '@/context/MatchContext'
import {useLeague} from '@/hooks'
import {useLocalSearchParams, useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Alert} from 'react-native'

const MERGE_ERROR_KEYS: Record<string, string> = {
  forbidden: 'merge_error_forbidden',
  master_not_on_team: 'merge_error_master_not_on_team',
  master_is_alt: 'merge_error_master_is_alt',
  alt_already_merged: 'merge_error_alt_already_merged',
  alt_has_merged_players: 'merge_error_alt_has_merged_players',
  player_not_found: 'player_not_found',
  same_player: 'merge_error_same_player',
  invalid_parameters: 'merge_player_failed',
  historical_team_readonly: 'merge_error_historical',
  unauthorized: 'merge_error_forbidden',
  network_error: 'merge_player_failed',
  server_error: 'merge_player_failed',
}

type MergeTarget = {
  teamId: number
  masterPlayerId: number
  masterNickname: string
}

function readMergeTarget(value: string | string[] | undefined): MergeTarget | null {
  const values = Array.isArray(value) ? value : [value]
  for (const raw of values) {
    if (typeof raw !== 'string' || raw.length === 0) continue
    try {
      const parsed = JSON.parse(raw) as {
        teamId?: number
        masterPlayerId?: number
        masterNickname?: string
      }
      const teamId = Number(parsed.teamId)
      const masterPlayerId = Number(parsed.masterPlayerId)
      if (!Number.isInteger(teamId) || teamId <= 0) continue
      if (!Number.isInteger(masterPlayerId) || masterPlayerId <= 0) continue
      return {
        teamId,
        masterPlayerId,
        masterNickname: String(parsed.masterNickname || `#${masterPlayerId}`),
      }
    } catch {
      // A parent screen may pass another `params` value in the same slot.
    }
  }
  return null
}

export default function MergePlayerScan() {
  const {t} = useTranslation()
  const router = useRouter()
  const league = useLeague()
  const {UpdateTeams} = useMatchContext() as {
    UpdateTeams?: () => Promise<void>
  }
  const {params, mergeParams} = useLocalSearchParams()
  const target = React.useMemo(
    () => readMergeTarget(mergeParams) ?? readMergeTarget(params),
    [mergeParams, params],
  )

  if (!target) {
    return (
      <ThemedView className="flex-1 items-center justify-center p-6">
        <Text>{t('merge_player_failed')}</Text>
      </ThemedView>
    )
  }

  async function handleConfirm(player: ScannedPlayer) {
    if (player.id === target!.masterPlayerId) {
      throw new Error(t('merge_error_same_player'))
    }
    const res = await league.MergeAltIntoTeamMaster(
      target!.teamId,
      target!.masterPlayerId,
      player.id,
    )
    if (res?.status !== 'ok') {
      const key = MERGE_ERROR_KEYS[String(res?.error || '')]
      throw new Error(key ? t(key) : t('merge_player_failed'))
    }
    const alt = player.nickname
    const master = target!.masterNickname
    await UpdateTeams?.()
    router.back()
    Alert.alert(
      t('merge_player_account'),
      t('merge_player_success', {alt, master}),
      [{text: t('ok')}],
    )
  }

  return (
    <ScanPlayerQr
      screenTitleKey="merge_player_account"
      hint={t('merge_player_scan_hint', {master: target.masterNickname})}
      confirmTitle={player =>
        t('merge_into_master_confirm', {
          alt: player.nickname,
          master: target.masterNickname,
        })
      }
      confirmButtonKey="merge_player_confirm"
      formatError={error =>
        error instanceof Error && error.message
          ? error.message
          : t('merge_player_failed')
      }
      onConfirm={handleConfirm}
    />
  )
}
