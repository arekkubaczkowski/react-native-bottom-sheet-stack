import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../styles/theme';

interface DemoCardProps {
  title: string;
  description: string;
  color: string;
  onPress: () => void;
}

export function DemoCard({
  title,
  description,
  color,
  onPress,
}: DemoCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <View style={[styles.cardArrow, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.cardArrowText, { color }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

interface FeatureItemProps {
  icon: string;
  label: string;
}

export function FeatureItem({ icon, label }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureIconText}>{icon}</Text>
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardContent: {
    flex: 1,
    paddingLeft: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  cardArrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  cardArrowText: {
    fontSize: 20,
    fontWeight: '500',
    marginTop: -1,
  },
  featureItem: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '47%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureIconText: {
    fontSize: 20,
    color: colors.purple,
    fontWeight: '700',
  },
  featureLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
