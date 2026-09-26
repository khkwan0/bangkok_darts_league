import {useTranslation} from 'react-i18next'
import {useColorScheme, Text} from 'react-native'

const schemeStyle = {
  default: 'text-neutral-500 leading-6 text-lg',
}

export function MyText(props) {
  const scheme = useColorScheme()
  const {t} = useTranslation()
  console.log(scheme)

  return (
    <Text className={`${schemeStyle.default} ${props.className}`}>
      {t(props.children)}
    </Text>
  )
}