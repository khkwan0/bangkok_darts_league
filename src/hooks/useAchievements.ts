import {useNetwork} from '@/hooks/useNetwork'
import type {PlayerAchievements} from '@/types/achievements'
import React from 'react'

export function useAchievements() {
  const network = useNetwork()
  const networkRef = React.useRef(network)
  networkRef.current = network

  const getPlayerAchievements = React.useCallback(
    async (playerId: number): Promise<PlayerAchievements | null> => {
      if (!playerId || playerId <= 0) return null
      const res = await networkRef.current.Get(
        `/player/${playerId}/achievements`,
      )
      if (!res || res.status === 'error' || res.httpStatus) {
        return null
      }
      if (typeof res !== 'object' || !('unlocked' in res)) {
        return null
      }
      return res as PlayerAchievements
    },
    [],
  )

  return {getPlayerAchievements}
}
