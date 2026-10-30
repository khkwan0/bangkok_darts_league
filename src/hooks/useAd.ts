import {useNetwork} from './useNetwork'

export const useAd = () => {
  const {Get, Post} = useNetwork()

  /** Prefer POST so click writes are not skipped by GET caches (same pattern as views). */
  const HandleClick = async (adId: string | number) => {
    try {
      const res = await Post('/ad/click/' + adId, {})
      return res
    } catch (e) {
      console.error(e)
      return null
    }
  }

  /** Impression / view for a campaign placement (public POST). */
  const RecordView = async (placementId: string | number) => {
    try {
      const res = await Post('/ad/placement/' + placementId + '/view', {})
      return res
    } catch (e) {
      console.error(e)
      return null
    }
  }

  const GetAdSpot = async (adSpotId: string | number) => {
    try {
      const res = await Get('/ad/spot/' + adSpotId)
      return res
    } catch (e) {
      console.log(e)
      return null
    }
  }

  const GetFrequency = async () => {
    try {
      const res = await Get('/ad/frequency')
      return res
    } catch (e) {
      console.log(e)
      return null
    }
  }

  return {HandleClick, RecordView, GetAdSpot, GetFrequency}
}