import { Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';

import { sharedStyles } from '../styles/theme';

interface ButtonProps {
  onPress: () => void;
  title: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({ onPress, title, style }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[sharedStyles.button, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={sharedStyles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({ onPress, title, style }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[sharedStyles.secondaryButton, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={sharedStyles.secondaryButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

interface SmallButtonProps extends ButtonProps {
  color?: string;
}

export function SmallButton({ onPress, title, color, style }: SmallButtonProps) {
  return (
    <TouchableOpacity
      style={[
        sharedStyles.smallButton,
        color ? { backgroundColor: color } : undefined,
        style,
      ]}
      onPress={onPress}
    >
      <Text style={sharedStyles.smallButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}
