import {
  TextInput as RNTextInput,
  TextInputProps,
  View,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  useColorScheme,
  Pressable,
} from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import Ionicons from '@expo/vector-icons/Ionicons'
import type {Icon} from '@expo/vector-icons/build/createIconSet'
import {useState} from 'react'

interface CustomTextInputProps extends TextInputProps {
  leftIcon?: typeof MaterialCommunityIcons | typeof Ionicons
  rightIcon?: typeof MaterialCommunityIcons | typeof Ionicons
  leftIconProps?:
    | React.ComponentProps<typeof MaterialCommunityIcons>
    | React.ComponentProps<typeof Ionicons>
  rightIconProps?:
    | React.ComponentProps<typeof MaterialCommunityIcons>
    | React.ComponentProps<typeof Ionicons>
  onLeftIconPress?: () => void
  onRightIconPress?: () => void
  iconSize?: number
  iconColor?: string
  containerStyle?: ViewStyle
  inputStyle?: TextStyle
  error?: boolean
  disabled?: boolean
}

export default function CustomTextInput({
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  leftIconProps,
  rightIconProps,
  onLeftIconPress,
  onRightIconPress,
  iconSize = 24,
  iconColor = '#666',
  style,
  containerStyle,
  inputStyle,
  error,
  disabled,
  multiline,
  ...props
}: CustomTextInputProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const [isFocused, setIsFocused] = useState(false)

  const defaultContainerStyle: ViewStyle = {
    flexDirection: multiline ? 'column' : 'row',
    alignItems: multiline ? 'stretch' : 'center',
    position: 'relative',
    backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: error
      ? '#ef4444'
      : isFocused
        ? isDark
          ? '#60a5fa'
          : '#3b82f6'
        : isDark
          ? '#374151'
          : '#e5e7eb',
  }

  const defaultInputStyle: TextStyle = {
    flex: multiline ? undefined : 1,
    alignSelf: multiline ? 'stretch' : undefined,
    width: multiline ? '100%' : undefined,
    height: multiline ? undefined : 48,
    minHeight: multiline ? 48 : undefined,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingLeft: LeftIcon ? 44 : 16,
    paddingRight: RightIcon ? 44 : 16,
    paddingTop: multiline ? 12 : undefined,
    color: isDark ? '#fff' : '#000',
    fontSize: 16,
  }

  const computedIconColor = error
    ? '#ef4444'
    : isFocused
      ? isDark
        ? '#60a5fa'
        : '#3b82f6'
      : isDark
        ? '#9ca3af'
        : '#6b7280'

  return (
    <View style={{...defaultContainerStyle, ...containerStyle}}>
      {LeftIcon && (
        <TouchableOpacity
          onPress={onLeftIconPress}
          disabled={!onLeftIconPress}
          style={{
            position: 'absolute',
            zIndex: 1,
            padding: 10,
            left: 2,
          }}>
          <LeftIcon
            size={iconSize}
            color={computedIconColor}
            {...leftIconProps}
          />
        </TouchableOpacity>
      )}
      <RNTextInput
        editable={!disabled}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[defaultInputStyle, inputStyle, style]}
        placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {RightIcon && (
        <TouchableOpacity
          onPress={onRightIconPress}
          disabled={!onRightIconPress}
          style={{
            position: 'absolute',
            zIndex: 1,
            padding: 10,
            right: 2,
          }}>
          <RightIcon
            size={iconSize}
            color={computedIconColor}
            {...rightIconProps}
          />
        </TouchableOpacity>
      )}
    </View>
  )
}
