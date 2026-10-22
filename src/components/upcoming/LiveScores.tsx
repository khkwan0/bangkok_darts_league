import LiveScoresTicker from '@/components/upcoming/LiveScoresTicker'

/**
 * In-page live scores crawl (legacy / fallback).
 * Prefer NativeTabs BottomAccessory via LiveScoresBottomAccessory.
 */
export default function LiveScores() {
  return <LiveScoresTicker variant="default" />
}
