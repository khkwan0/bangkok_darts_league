import {Image} from 'react-native'

export default function PlayerAvatar({avatar}: {avatar: string}) {
  return <Image source={{uri: avatar}} />
}
