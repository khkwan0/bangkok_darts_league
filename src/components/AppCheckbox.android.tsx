import {Colors} from '@/constants/Colors'
import {
  Checkbox,
  Host,
  Row,
  Text,
} from '@expo/ui/jetpack-compose'
import {clickable} from '@expo/ui/jetpack-compose/modifiers'
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
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const labelColor = Colors[scheme].text

  if (label == null) {
    return (
      <Host matchContents colorScheme={scheme} testID={testID}>
        <Checkbox
          value={value}
          onCheckedChange={disabled ? undefined : onValueChange}
          enabled={!disabled}
        />
      </Host>
    )
  }

  // Keep checkbox + label in one Compose Row so they stay vertically
  // centered; set Text color from the app theme (Material defaults stay dark).
  // Omit Checkbox onCheckedChange while Row is clickable to avoid double-toggle.
  return (
    <Host matchContents colorScheme={scheme} testID={testID}>
      <Row
        verticalAlignment="center"
        horizontalArrangement={{spacedBy: 8}}
        modifiers={[
          clickable(() => {
            if (!disabled) onValueChange(!value)
          }),
        ]}>
        <Checkbox value={value} enabled={!disabled} />
        <Text color={labelColor}>{label}</Text>
      </Row>
    </Host>
  )
}
