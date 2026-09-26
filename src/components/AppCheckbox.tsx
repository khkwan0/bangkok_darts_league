import {Checkbox, Host} from '@expo/ui'
import React from 'react'

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
  return (
    <Host matchContents>
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
