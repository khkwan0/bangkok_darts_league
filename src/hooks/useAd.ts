import {useNetwork} from './useNetwork'

export const useAd = () => {
  const {Get, Post} = useNetwork()

  const HandleClick = async (adId: string) => {
    try {
      const res = await Get('/ad/click/' + adId)
      return res
    } catch (e) {
      console.error(e)
      return null
    }
  }

  const GetAdSpot = async (adSpotId: string) => {
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

  return {HandleClick, GetAdSpot, GetFrequency}
}
