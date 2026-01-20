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
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <View style={[styles.cardArrow, { backgroundColor: color }]}>
        <Text style={styles.cardArrowText}>›</Text>
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
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  cardArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  cardArrowText: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '300',
  },
  featureItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '47%',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureIconText: {
    fontSize: 20,
    color: colors.purple,
    fontWeight: '600',
  },
  featureLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
});
