import PostPone from '@/components/Postpone'
import {useLocalSearchParams} from 'expo-router'

export default function PostponeScreen() {
  const {matchInfo} = useLocalSearchParams()

  return <PostPone matchInfo={JSON.parse(matchInfo)} />
}
