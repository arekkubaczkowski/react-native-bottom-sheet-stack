import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, sharedStyles } from '../styles/theme';

interface BadgeProps {
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, color = colors.primary, style }: BadgeProps) {
  return (
    <View style={[sharedStyles.levelBadge, { backgroundColor: color }, style]}>
      <Text style={sharedStyles.levelBadgeText}>{label}</Text>
    </View>
  );
}
