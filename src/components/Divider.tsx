import {useColorScheme} from 'react-native'
import {ThemedView as View} from './ThemedView'

export default function Divider(props: object) {
  const theme = useColorScheme()
  const borderColor = theme === 'dark' ? '#aaa' : '#222'
  return (
    <View style={{borderWidth: 0.5, borderColor: borderColor}} {...props} />
  )
}
