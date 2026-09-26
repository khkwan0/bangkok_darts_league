import {Host, Switch} from '@expo/ui'
import React from 'react'

type AppSwitchProps = {
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  testID?: string
}

export default function AppSwitch({
  value,
  onValueChange,
  disabled,
  testID,
}: AppSwitchProps) {
  return (
    <Host matchContents>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        testID={testID}
      />
    </Host>
  )
}
