import {useNetwork} from '@/hooks/useNetwork'

export const useMatch = () => {
  const {Get, Post} = useNetwork()

  const GetFrames = async matchId => {
    try {
      const frames = await Get('/frames/' + matchId)
      return frames
    } catch (e) {
      return []
    }
  }

  const GetMatchDetails = async matchId => {
    try {
      const res = await Get('/match/details/' + matchId)
      return res
    } catch (e) {
      console.log(e)
      return {}
    }
  }

  const GetMatchInfo = async matchId => {
    try {
      const res = await Get('/match/' + matchId)
      return res
    } catch (e) {
      return {}
    }
  }

  const UpdateCompletedMatch = async (type, matchId, data) => {
    try {
      const res = await Post('/admin/match/completed', {
        type: type,
        matchId: matchId,
        data: data,
      })
      return res
    } catch (e) {
      return {status: 'error', error: 'network_error'}
    }
  }

  const RescheduleMatch = async (matchId, newDate) => {
    try {
      const res = await Post('/admin/match/date', {
        matchId: matchId,
        newDate: newDate,
      })
      return res
    } catch (e) {
      throw new Error(e)
    }
  }

  const ProposeRescheduleMatch = async proposedData => {
    try {
      const res = await Post('/match/reschedule/propose', proposedData)
      return res
    } catch (e) {
      throw new Error(e)
    }
  }

  const AcceptRescheduleProposal = async (matchId, teamId) => {
    try {
      const res = await Post('/match/reschedule/accept', {
        matchId: matchId,
        teamId: teamId,
      })
      if (res.status === 'ok') {
        return res
      } else {
        return null
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  const GetMatchMetadata = async matchId => {
    try {
      const res = await Get('/match/meta/' + matchId)
      return res
    } catch (e) {
      throw new Error(e)
    }
  }

  const ConfirmMatch = async (matchId, teamId) => {
    try {
      const res = await Post('/match/confirm/' + matchId, {
        teamId: teamId,
      })
      if (res.status === 'ok') {
        return res
      } else {
        return null
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  const UnconfirmMatch = async (matchId, teamId) => {
    try {
      const res = await Post('/match/unconfirm/' + matchId, {
        teamId: teamId,
      })
      if (res.status === 'ok') {
        return res.data
      } else {
        return null
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  const PostponeIndefinitely = async matchId => {
    try {
      const res = await Post('/match/postpone/indefinitely/' + matchId)
      return res
    } catch (e) {
      console.error(e)
      throw new Error(e)
    }
  }

  const FinalizeMatch = async (matchId, teamId) => {
    try {
      const endpoint = `/match/${matchId}/finalize`
      const res = await Post(endpoint, {
        teamId: teamId,
      })
      return res
    } catch (e) {
      throw new Error(e)
    }
  }

  return {
    AcceptRescheduleProposal,
    ConfirmMatch,
    FinalizeMatch,
    GetFrames,
    GetMatchInfo,
    GetMatchDetails,
    GetMatchMetadata,
    ProposeRescheduleMatch,
    RescheduleMatch,
    UnconfirmMatch,
    UpdateCompletedMatch,
  }
}
