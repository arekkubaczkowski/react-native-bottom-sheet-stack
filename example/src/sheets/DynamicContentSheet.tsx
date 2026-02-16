import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useBottomSheetContext } from 'react-native-bottom-sheet-stack';

import { SecondaryButton, Sheet } from '../components';
import { colors, sharedStyles } from '../styles/theme';

function HeavyItem({ index }: { index: number }) {
  const hue = (index * 20 + 250) % 360;
  return (
    <View style={[styles.item, { backgroundColor: `hsl(${hue}, 45%, 15%)` }]}>
      <View
        style={[styles.itemIcon, { backgroundColor: `hsl(${hue}, 50%, 25%)` }]}
      >
        <Text style={styles.itemIconText}>{index + 1}</Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>Item {index + 1}</Text>
        <Text style={styles.itemSubtitle}>Dynamically loaded content</Text>
      </View>
    </View>
  );
}

export const HeavySheet = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetContext();
  const [items, setItems] = useState<number[]>(() =>
    Array.from({ length: 5 }, (_, i) => i)
  );
  const [loadCount, setLoadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const intervals = [1000, 2000, 3000];
    const timeouts = intervals.map((delay, idx) =>
      setTimeout(() => {
        setLoadCount(idx + 1);
        setItems((prev) => [
          ...prev,
          ...Array.from({ length: 5 }, (_, i) => prev.length + i),
        ]);
      }, delay)
    );
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <Sheet ref={ref} snapPoints={['80%']} scrollable>
      <Text style={sharedStyles.h1}>Dynamic Content</Text>
      <Text style={sharedStyles.text}>
        This sheet demonstrates async loading and dynamic content updates. Watch
        as new items appear over time.
      </Text>

      <View style={styles.statsRow}>
        <View style={sharedStyles.statBox}>
          <Text style={sharedStyles.statValue}>{items.length}</Text>
          <Text style={sharedStyles.statLabel}>Items</Text>
        </View>
        <View style={sharedStyles.statBox}>
          <Text style={sharedStyles.statValue}>{loadCount}/3</Text>
          <Text style={sharedStyles.statLabel}>Loads</Text>
        </View>
      </View>

      {isLoading && (
        <View style={sharedStyles.loadingBox}>
          <Text style={sharedStyles.loadingText}>Loading initial data...</Text>
        </View>
      )}

      {items.map((i) => (
        <HeavyItem key={i} index={i} />
      ))}

      <View style={{ marginTop: 16 }}>
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

HeavySheet.displayName = 'HeavySheet';

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  item: {
    padding: 14,
    marginVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemIconText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
  },
  itemSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
