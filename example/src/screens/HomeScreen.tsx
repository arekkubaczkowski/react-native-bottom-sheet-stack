import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetPortal,
  useBottomSheetControl,
  useBottomSheetManager,
} from 'react-native-bottom-sheet-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DemoCard, FeatureItem } from '../components';
import {
  ActionsSheetDemoContent,
  AdapterComparisonContent,
  ContextComparisonSheet,
  ContextSheetPortal,
  HeavySheet,
  GorhomSheetDemoContent,
  ModalAdapterDemoContent,
  MixedStackContent,
  NestedSheet1,
  PortalModeSheetA,
  PortalModeSheetB,
  RNModalDemoContent,
  SheetA,
  SimpleModalContent,
} from '../sheets';
import { colors, sharedStyles } from '../styles/theme';

export function HomeScreen() {
  const { top } = useSafeAreaInsets();
  const { open } = useBottomSheetManager();
  const portalSheetControl = useBottomSheetControl('context-portal-sheet');
  const portalModeSheetA = useBottomSheetControl('portal-mode-sheet-a');
  const scannerControl = useBottomSheetControl('scanner-sheet');
  const persistentWithPortalControl = useBottomSheetControl(
    'persistent-with-portal'
  );
  const mixedStackControl = useBottomSheetControl('mixed-stack');
  const adapterComparisonControl = useBottomSheetControl('adapter-comparison');
  const modalAdapterControl = useBottomSheetControl('modal-adapter-demo');
  const rnModalControl = useBottomSheetControl('rn-modal-demo');
  const actionsSheetControl = useBottomSheetControl('actions-sheet-demo');
  const gorhomSheetControl = useBottomSheetControl('gorhom-sheet-demo');

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
      {/* Modal adapter portals */}
      <BottomSheetPortal id="simple-modal">
        <SimpleModalContent />
      </BottomSheetPortal>
      <BottomSheetPortal id="mixed-stack">
        <MixedStackContent />
      </BottomSheetPortal>
      <BottomSheetPortal id="adapter-comparison">
        <AdapterComparisonContent />
      </BottomSheetPortal>
      {/* Third-party adapter portals */}
      <BottomSheetPortal id="modal-adapter-demo">
        <ModalAdapterDemoContent />
      </BottomSheetPortal>
      <BottomSheetPortal id="rn-modal-demo">
        <RNModalDemoContent />
      </BottomSheetPortal>
      <BottomSheetPortal id="actions-sheet-demo">
        <ActionsSheetDemoContent />
      </BottomSheetPortal>
      <BottomSheetPortal id="gorhom-sheet-demo">
        <GorhomSheetDemoContent />
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
              open(
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
            onPress={() => open(<SheetA />, { scaleBackground: true })}
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
            onPress={() => open(<NestedSheet1 />, { scaleBackground: true })}
          />

          <DemoCard
            title="Dynamic Content"
            description="Async loading and dynamic content updates"
            color={colors.pink}
            onPress={() => open(<HeavySheet />, { scaleBackground: true })}
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

          <DemoCard
            title="Persistent + Nested Portal"
            description="Persistent sheet with portal-based sheet defined inside"
            color={colors.purple}
            onPress={() =>
              persistentWithPortalControl.open({ scaleBackground: true })
            }
          />
        </View>

        {/* Mixed Adapters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mixed Adapters</Text>

          <DemoCard
            title="Mixed Stack"
            description="Chain modals, bottom sheets, and action sheets with push and switch"
            color={colors.purple}
            onPress={() => mixedStackControl.open()}
          />

          <DemoCard
            title="Adapter Comparison"
            description="Open the same content as a bottom sheet or modal — same stack API"
            color={colors.cyan}
            onPress={() => adapterComparisonControl.open()}
          />
        </View>

        {/* Third-Party Adapters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Third-Party Adapters</Text>

          <DemoCard
            title="ModalAdapter (Built-in)"
            description="Zero-dependency View-based overlay with slide-up animation and stacking"
            color={colors.success}
            onPress={() => modalAdapterControl.open({ scaleBackground: true })}
          />

          <DemoCard
            title="react-native-modal"
            description="Fancy animations (slide, bounce, fade), swipe-to-dismiss, custom backdrops"
            color={colors.warning}
            onPress={() => rnModalControl.open()}
          />

          <DemoCard
            title="ActionsSheet"
            description="Zero-dependency action sheet with snap points and gesture controls"
            color={colors.purple}
            onPress={() => actionsSheetControl.open()}
          />

          <DemoCard
            title="@gorhom/bottom-sheet"
            description="Feature-rich bottom sheet with snap points, gestures, and spring animations"
            color={colors.cyan}
            onPress={() => gorhomSheetControl.open({ scaleBackground: true })}
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
            <FeatureItem icon="[" label="Adapters" />
            <FeatureItem icon="#" label="Modals" />
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Library-agnostic stack manager with pluggable adapters. Ships with
            GorhomSheetAdapter, ModalAdapter, and third-party adapters — or
            build your own with the SheetAdapterRef interface.
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
