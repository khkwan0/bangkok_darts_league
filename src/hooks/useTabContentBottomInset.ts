import {getTabFabOverflowInset} from '@/components/navigation/tabBarMetrics'

export function useTabContentBottomInset(extra = 28) {
  return getTabFabOverflowInset(extra)
}
