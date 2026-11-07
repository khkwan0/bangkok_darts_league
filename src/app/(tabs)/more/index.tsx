import {QuickActionsContent} from '@/components/navigation/QuickActionsContent'
import {useTabListContentContainerStyle} from '@/hooks/useTabListContentContainerStyle'

/**
 * Quick Actions as a normal tab screen — no sheet, no selection hop.
 * Header stays the competition switcher, same as the other tabs.
 */
export default function MoreTabScreen() {
  const listContentStyle = useTabListContentContainerStyle()

  return <QuickActionsContent contentContainerStyle={listContentStyle} />
}
