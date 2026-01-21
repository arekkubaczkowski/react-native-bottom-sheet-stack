import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const scannerControl = useBottomSheetControl('scanner-sheet');

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
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconText}>⬡</Text>
            </View>
            <Text style={styles.logo}>Bottom Sheet Stack</Text>
          </View>
          <Text style={styles.subtitle}>
            Stack management, navigation modes, and iOS-style scale animations
            for React Native bottom sheets.
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

          <DemoCard
            title="Persistent Scanner"
            description="Pre-mounted sheet with keepMounted - opens instantly"
            color={colors.cyan}
            onPress={() =>
              scannerControl.open({
                scaleBackground: true,
                params: { source: 'home', title: 'Scanner from Home' },
              })
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
    paddingBottom: 48,
  },
  header: {
    marginBottom: 36,
    paddingTop: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  logoIconText: {
    fontSize: 22,
    color: colors.text,
  },
  logo: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
});
