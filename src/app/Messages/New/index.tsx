import NewMessage from '@/components/Messages/New'
import {useLocalSearchParams} from 'expo-router'

export default function NewMessageScreen() {
  const {params} = useLocalSearchParams()
  const {recipientId, nickname} = JSON.parse(params as string)

  return <NewMessage recipientId={recipientId} nickname={nickname} />
}
