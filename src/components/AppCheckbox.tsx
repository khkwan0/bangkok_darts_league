import {Checkbox, Host} from '@expo/ui'
import React from 'react'
import {useColorScheme} from 'react-native'

type AppCheckboxProps = {
  value: boolean
  onValueChange: (value: boolean) => void
  label?: string
  disabled?: boolean
  testID?: string
}

export default function AppCheckbox({
  value,
  onValueChange,
  label,
  disabled,
  testID,
}: AppCheckboxProps) {
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'

  return (
    <Host matchContents colorScheme={colorScheme}>
      <Checkbox
        value={value}
        onValueChange={onValueChange}
        label={label}
        disabled={disabled}
        testID={testID}
      />
    </Host>
  )
}
