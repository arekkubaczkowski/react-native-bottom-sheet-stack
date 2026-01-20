import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, sharedStyles } from '../styles/theme';

interface BadgeProps {
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function Badge({
  label,
  color = colors.primaryDark,
  style,
}: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}20` }, style]}>
      <Text style={[sharedStyles.levelBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
});
