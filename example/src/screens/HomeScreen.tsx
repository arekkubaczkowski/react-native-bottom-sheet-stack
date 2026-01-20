import { StyleSheet, ScrollView, Text, View } from 'react-native';
import {
  BottomSheetPortal,
  useBottomSheetControl,
  useBottomSheetManager,
} from 'react-native-bottom-sheet-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DemoCard, FeatureItem } from '../components';
import {
  ContextComparisonSheet,
  ContextSheetPortal,
  HeavySheet,
  NestedSheet1,
  PortalModeSheetA,
  PortalModeSheetB,
  SheetA,
} from '../sheets';
import { colors, sharedStyles } from '../styles/theme';

export function HomeScreen() {
  const { top } = useSafeAreaInsets();
  const { openBottomSheet } = useBottomSheetManager();
  const portalSheetControl = useBottomSheetControl('context-portal-sheet');
  const portalModeSheetA = useBottomSheetControl('portal-mode-sheet-a');

  return (
    <View style={sharedStyles.container}>
      {/* Portal-based sheets */}
      <BottomSheetPortal id="context-portal-sheet">
        <ContextSheetPortal />
      </BottomSheetPortal>
      <BottomSheetPortal id="portal-mode-sheet-a">
        <PortalModeSheetA />
      </BottomSheetPortal>
      <BottomSheetPortal id="portal-mode-sheet-b">
        <PortalModeSheetB />
      </BottomSheetPortal>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Bottom Sheet Stack</Text>
          <Text style={styles.subtitle}>
            A powerful bottom sheet manager for React Native
          </Text>
        </View>

        {/* Demo Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demos</Text>

          <DemoCard
            title="Context Preservation"
            description="Compare imperative vs portal API - portal preserves React context"
            color={colors.success}
            onPress={() =>
              openBottomSheet(
                <ContextComparisonSheet
                  onOpenPortal={() =>
                    portalSheetControl.open({
                      scaleBackground: true,
                      params: { greeting: 'Hello from params!' },
                    })
                  }
                />,
                { scaleBackground: true }
              )
            }
          />

          <DemoCard
            title="Navigation Flow"
            description="Switch, Push, and Replace modes for managing sheet navigation"
            color={colors.primary}
            onPress={() =>
              openBottomSheet(<SheetA />, { scaleBackground: true })
            }
          />

          <DemoCard
            title="Portal Navigation Modes"
            description="Push, Switch, Replace modes with portal-based API"
            color={colors.warning}
            onPress={() => portalModeSheetA.open({ scaleBackground: true })}
          />

          <DemoCard
            title="Nested Scale"
            description="Cascading scale effect with multiple stacked sheets"
            color={colors.purple}
            onPress={() =>
              openBottomSheet(<NestedSheet1 />, { scaleBackground: true })
            }
          />

          <DemoCard
            title="Dynamic Content"
            description="Async loading and dynamic content updates"
            color={colors.pink}
            onPress={() =>
              openBottomSheet(<HeavySheet />, { scaleBackground: true })
            }
          />
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featuresGrid}>
            <FeatureItem icon="+" label="Push" />
            <FeatureItem icon="~" label="Switch" />
            <FeatureItem icon="=" label="Replace" />
            <FeatureItem icon="*" label="Scale BG" />
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Built on top of @gorhom/bottom-sheet with stack management,
            navigation modes, and iOS-style scale animations.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
});
