import { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BottomSheetHost,
  BottomSheetManaged,
  BottomSheetManagerProvider,
  BottomSheetPortal,
  BottomSheetScaleView,
  useBottomSheetControl,
  useBottomSheetManager,
  useBottomSheetState,
} from 'react-native-bottom-sheet-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// ============================================================================
// Demo Context - to prove context preservation works
// ============================================================================

interface UserContextValue {
  username: string;
  theme: string;
}

const UserContext = createContext<UserContextValue | null>(null);

function useUser() {
  return useContext(UserContext);
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <BottomSheetManagerProvider
          id="default"
          scaleConfig={{ scale: 0.92, translateY: 0, borderRadius: 24 }}
        >
          <BottomSheetScaleView>
            {/* UserContext.Provider is INSIDE HomeScreen's parent, but OUTSIDE BottomSheetHost */}
            {/* This means imperative sheets (rendered in BottomSheetHost) won't have access */}
            {/* But portal sheets (rendered here, then teleported) will have access */}
            <UserContext.Provider
              value={{ username: 'John Doe', theme: 'dark' }}
            >
              <HomeScreen />
            </UserContext.Provider>
          </BottomSheetScaleView>
          <BottomSheetHost />
        </BottomSheetManagerProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

// ============================================================================
// Home Screen
// ============================================================================

function HomeScreen() {
  const { top } = useSafeAreaInsets();
  const { openBottomSheet } = useBottomSheetManager();
  const portalSheetControl = useBottomSheetControl('context-portal-sheet');

  return (
    <View style={styles.container}>
      {/* Portal-based sheet - rendered here in React tree, preserves context */}
      <BottomSheetPortal id="context-portal-sheet">
        <ContextSheetPortal />
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
            color="#10b981"
            onPress={() =>
              openBottomSheet(
                <ContextComparisonSheet
                  onOpenPortal={() =>
                    portalSheetControl.open({ scaleBackground: true })
                  }
                />,
                { scaleBackground: true }
              )
            }
          />

          <DemoCard
            title="Navigation Flow"
            description="Switch, Push, and Replace modes for managing sheet navigation"
            color="#6366f1"
            onPress={() =>
              openBottomSheet(<SheetA />, { scaleBackground: true })
            }
          />

          <DemoCard
            title="Nested Scale"
            description="Cascading scale effect with multiple stacked sheets"
            color="#8b5cf6"
            onPress={() =>
              openBottomSheet(<NestedSheet1 />, { scaleBackground: true })
            }
          />

          <DemoCard
            title="Dynamic Content"
            description="Async loading and dynamic content updates"
            color="#ec4899"
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

// ============================================================================
// UI Components
// ============================================================================

function DemoCard({
  title,
  description,
  color,
  onPress,
}: {
  title: string;
  description: string;
  color: string;
  onPress: () => void;
}) {
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

function FeatureItem({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureIconText}>{icon}</Text>
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const Button = ({ onPress, title }: { onPress: () => void; title: string }) => (
  <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

const SecondaryButton = ({
  onPress,
  title,
}: {
  onPress: () => void;
  title: string;
}) => (
  <TouchableOpacity
    style={styles.secondaryButton}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={styles.secondaryButtonText}>{title}</Text>
  </TouchableOpacity>
);

// ============================================================================
// Context Preservation Demo
// ============================================================================

// Entry point sheet - just explains the demo and offers two options
const ContextComparisonSheet = forwardRef<
  BottomSheetMethods,
  { onOpenPortal: () => void }
>(({ onOpenPortal }, ref) => {
  const { close } = useBottomSheetState();
  const { openBottomSheet } = useBottomSheetManager();

  return (
    <BottomSheetManaged enableDynamicSizing ref={ref}>
      <BottomSheetView>
        <View style={styles.sheet}>
          <View style={[styles.levelBadge, { backgroundColor: '#10b981' }]}>
            <Text style={styles.levelBadgeText}>Context Demo</Text>
          </View>
          <Text style={styles.h1}>Context Preservation</Text>
          <Text style={styles.text}>
            This demo shows the difference between imperative and portal-based
            APIs.
            {'\n\n'}A UserContext with username "John Doe" is defined in the
            app. Open each sheet below to see if it can access this context.
          </Text>

          <View style={{ gap: 12 }}>
            <Button
              title="Open Imperative Sheet"
              onPress={() =>
                openBottomSheet(<ContextSheetImperative />, { mode: 'push' })
              }
            />
            <Button title="Open Portal Sheet" onPress={onOpenPortal} />
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

// This sheet uses the IMPERATIVE API - context will be LOST
const ContextSheetImperative = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetState();
  const user = useUser();

  return (
    <BottomSheetManaged enableDynamicSizing ref={ref}>
      <BottomSheetView>
        <View style={styles.sheet}>
          <View style={[styles.levelBadge, { backgroundColor: '#ef4444' }]}>
            <Text style={styles.levelBadgeText}>Imperative API</Text>
          </View>
          <Text style={styles.h1}>Context Lost ❌</Text>
          <Text style={styles.text}>
            This sheet was opened with openBottomSheet(). The content is stored
            in Zustand and rendered in BottomSheetHost - outside the original
            React tree. Context is NOT available.
          </Text>

          <View style={[styles.contextBox, { borderColor: '#ef4444' }]}>
            <Text style={styles.contextTitle}>UserContext Access</Text>
            <Text style={[styles.contextValue, { color: '#ef4444' }]}>
              Username: {user?.username ?? '❌ undefined'}
            </Text>
            <Text style={[styles.contextValue, { color: '#ef4444' }]}>
              Theme: {user?.theme ?? '❌ undefined'}
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

// This sheet uses the PORTAL API - context will be PRESERVED
const ContextSheetPortal = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetState();
  const { openBottomSheet } = useBottomSheetManager();
  const user = useUser();

  return (
    <BottomSheetManaged enableDynamicSizing ref={ref}>
      <BottomSheetView>
        <View style={styles.sheet}>
          <View style={[styles.levelBadge, { backgroundColor: '#10b981' }]}>
            <Text style={styles.levelBadgeText}>Portal API</Text>
          </View>
          <Text style={styles.h1}>Context Preserved ✅</Text>
          <Text style={styles.text}>
            This sheet was opened with BottomSheetPortal +
            useBottomSheetControl(). The content is rendered in its original
            location in the React tree, then teleported to BottomSheetHost.
            Context IS available!
          </Text>

          <View style={[styles.contextBox, { borderColor: '#10b981' }]}>
            <Text style={styles.contextTitle}>UserContext Access</Text>
            <Text style={[styles.contextValue, { color: '#10b981' }]}>
              Username: {user?.username ?? '❌ undefined'}
            </Text>
            <Text style={[styles.contextValue, { color: '#10b981' }]}>
              Theme: {user?.theme ?? '❌ undefined'}
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <Button
              title="Open Nested Imperative Sheet"
              onPress={() =>
                openBottomSheet(<NestedImperativeSheet />, { mode: 'push' })
              }
            />
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

// This sheet is opened from portal sheet using imperative API
const NestedImperativeSheet = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetState();
  const user = useUser();

  return (
    <BottomSheetManaged enableDynamicSizing ref={ref}>
      <BottomSheetView>
        <View style={styles.sheet}>
          <View style={[styles.levelBadge, { backgroundColor: '#f59e0b' }]}>
            <Text style={styles.levelBadgeText}>Mixed APIs</Text>
          </View>
          <Text style={styles.h1}>Nested from Portal</Text>
          <Text style={styles.text}>
            This sheet was opened using the imperative API from within a
            portal-based sheet. Notice that context is lost again - the
            imperative API always renders in BottomSheetHost.
          </Text>

          <View style={[styles.contextBox, { borderColor: '#f59e0b' }]}>
            <Text style={styles.contextTitle}>UserContext Access</Text>
            <Text style={[styles.contextValue, { color: '#ef4444' }]}>
              Username: {user?.username ?? '❌ undefined'}
            </Text>
            <Text style={[styles.contextValue, { color: '#ef4444' }]}>
              Theme: {user?.theme ?? '❌ undefined'}
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

// ============================================================================
// Navigation Flow Sheets
// ============================================================================

const SheetA = forwardRef<BottomSheetMethods>((_, ref) => {
  const { openBottomSheet } = useBottomSheetManager();
  const { close } = useBottomSheetState();

  return (
    <BottomSheetManaged enableDynamicSizing ref={ref}>
      <BottomSheetView>
        <View style={styles.sheet}>
          <Text style={styles.h1}>Navigation Flow</Text>
          <Text style={styles.text}>
            This demo shows different navigation modes. Use "Switch" to replace
            this sheet while keeping it in the stack (you can go back).
          </Text>
          <View style={{ gap: 12 }}>
            <Button
              title="Switch to Sheet B"
              onPress={() => openBottomSheet(<SheetB />, { mode: 'switch' })}
            />
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

const SheetB = forwardRef<BottomSheetMethods>((_, ref) => {
  const { openBottomSheet } = useBottomSheetManager();
  const { close } = useBottomSheetState();

  return (
    <BottomSheetManaged enableDynamicSizing ref={ref}>
      <BottomSheetView>
        <View style={styles.sheet}>
          <Text style={styles.h1}>Sheet B</Text>
          <Text style={styles.text}>
            This sheet was opened with "Switch" mode. Sheet A is hidden but
            still in the stack. Use "Push" to add a new sheet on top.
          </Text>
          <View style={{ gap: 12 }}>
            <Button
              title="Push Sheet C"
              onPress={() => openBottomSheet(<SheetC />, { mode: 'push' })}
            />
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

const SheetC = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetState();
  const { openBottomSheet } = useBottomSheetManager();

  return (
    <BottomSheetManaged enableDynamicSizing ref={ref}>
      <BottomSheetView>
        <View style={styles.sheet}>
          <Text style={styles.h1}>Sheet C</Text>
          <Text style={styles.text}>
            This sheet was "Pushed" on top. Use "Replace" to swap this sheet
            with a new one (removes this from stack).
          </Text>
          <View style={{ gap: 12 }}>
            <Button
              title="Replace with Sheet D"
              onPress={() => openBottomSheet(<SheetD />, { mode: 'replace' })}
            />
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

const SheetD = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetState();

  return (
    <BottomSheetManaged enableDynamicSizing ref={ref}>
      <BottomSheetView>
        <View style={styles.sheet}>
          <Text style={styles.h1}>Sheet D</Text>
          <Text style={styles.text}>
            This sheet "Replaced" Sheet C. Sheet C is no longer in the stack.
            Close this to go back to Sheet B.
          </Text>
          <View style={{ gap: 12 }}>
            <Button title="Close" onPress={close} />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

// ============================================================================
// Dynamic Content Sheet
// ============================================================================

const HeavyItem = ({ index }: { index: number }) => {
  return (
    <View
      style={{
        padding: 12,
        marginVertical: 4,
        backgroundColor: `hsl(${(index * 25 + 220) % 360}, 50%, 25%)`,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: `hsl(${(index * 25 + 220) % 360}, 50%, 35%)`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>{index + 1}</Text>
      </View>
      <View>
        <Text style={{ color: 'white', fontWeight: '600' }}>
          Item {index + 1}
        </Text>
        <Text style={{ color: '#9ca3af', fontSize: 12 }}>
          Dynamically loaded content
        </Text>
      </View>
    </View>
  );
};

const HeavySheet = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetState();
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
    <BottomSheetManaged snapPoints={['80%']} ref={ref}>
      <BottomSheetScrollView>
        <View style={styles.sheet}>
          <Text style={styles.h1}>Dynamic Content</Text>
          <Text style={styles.text}>
            This sheet demonstrates async loading and dynamic content updates.
            Watch as new items appear over time.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{items.length}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{loadCount}/3</Text>
              <Text style={styles.statLabel}>Loads</Text>
            </View>
          </View>

          {isLoading && (
            <View style={styles.loadingBox}>
              <Text style={styles.loadingText}>Loading initial data...</Text>
            </View>
          )}

          {items.map((i) => (
            <HeavyItem key={i} index={i} />
          ))}

          <View style={{ marginTop: 16 }}>
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheetManaged>
  );
});

// ============================================================================
// Nested Scale Demo
// ============================================================================

const NestedSheet1 = forwardRef<BottomSheetMethods>((_, ref) => {
  const { openBottomSheet } = useBottomSheetManager();
  const { close } = useBottomSheetState();
  const { top } = useSafeAreaInsets();

  return (
    <BottomSheetManaged
      snapPoints={['50%']}
      enableDynamicSizing={false}
      topInset={top}
      ref={ref}
    >
      <BottomSheetView
        style={[styles.sheet, { flex: 1, backgroundColor: '#1e1e3f' }]}
      >
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>Level 1</Text>
        </View>
        <Text style={styles.h1}>Nested Scale</Text>
        <Text style={styles.text}>
          This demo shows the cascading scale effect. Each new sheet scales down
          the ones below it, creating a depth effect.
        </Text>
        <View style={{ gap: 12, marginTop: 'auto' }}>
          <Button
            title="Open Level 2"
            onPress={() =>
              openBottomSheet(<NestedSheet2 />, {
                mode: 'push',
                scaleBackground: true,
              })
            }
          />
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

const NestedSheet2 = forwardRef<BottomSheetMethods>((_, ref) => {
  const { openBottomSheet } = useBottomSheetManager();
  const { close } = useBottomSheetState();
  const { top } = useSafeAreaInsets();

  return (
    <BottomSheetManaged
      snapPoints={['48%']}
      enableDynamicSizing={false}
      topInset={top}
      ref={ref}
    >
      <BottomSheetView
        style={[styles.sheet, { flex: 1, backgroundColor: '#252552' }]}
      >
        <View style={[styles.levelBadge, { backgroundColor: '#8b5cf6' }]}>
          <Text style={styles.levelBadgeText}>Level 2</Text>
        </View>
        <Text style={styles.h1}>Going Deeper</Text>
        <Text style={styles.text}>
          Notice how Level 1 is now scaled down behind this sheet. The
          background content also remains scaled. Open Level 3 to see even more
          depth.
        </Text>
        <View style={{ gap: 12, marginTop: 'auto' }}>
          <Button
            title="Open Level 3"
            onPress={() =>
              openBottomSheet(<NestedSheet3 />, {
                mode: 'push',
                scaleBackground: true,
              })
            }
          />
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

const NestedSheet3 = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetState();
  const { top } = useSafeAreaInsets();

  return (
    <BottomSheetManaged
      snapPoints={['100%']}
      enableDynamicSizing={false}
      topInset={top}
      ref={ref}
    >
      <BottomSheetView
        style={[styles.sheet, { flex: 1, backgroundColor: '#2d2d6d' }]}
      >
        <View style={[styles.levelBadge, { backgroundColor: '#ec4899' }]}>
          <Text style={styles.levelBadgeText}>Level 3</Text>
        </View>
        <Text style={styles.h1}>Maximum Depth</Text>
        <Text style={styles.text}>
          You're now 3 levels deep. Each sheet behind is progressively more
          scaled, creating a visual stack effect. Close sheets to go back.
        </Text>
        <View style={styles.scaleInfo}>
          <Text style={styles.scaleInfoTitle}>Current Scale Values</Text>
          <Text style={styles.scaleInfoItem}>Background: scale²</Text>
          <Text style={styles.scaleInfoItem}>Level 1: scale²</Text>
          <Text style={styles.scaleInfoItem}>Level 2: scale¹</Text>
          <Text style={styles.scaleInfoItem}>Level 3: no scale</Text>
        </View>
        <View style={{ gap: 12, marginTop: 'auto' }}>
          <Button title="Close" onPress={close} />
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    marginBottom: 32,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    lineHeight: 22,
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },

  // Demo Cards
  card: {
    backgroundColor: '#1a1a2e',
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
    color: '#ffffff',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#9ca3af',
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
    color: '#ffffff',
    fontWeight: '300',
  },

  // Features Grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItem: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '47%',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureIconText: {
    fontSize: 20,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  featureLabel: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },

  // Info Box
  infoBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  infoText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
    textAlign: 'center',
  },

  // Buttons
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3f3f5a',
  },
  secondaryButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },

  // Sheets
  sheet: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 100,
    flexGrow: 1,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: '#9ca3af',
    marginVertical: 16,
    lineHeight: 24,
  },

  // Dynamic Content Sheet
  statBox: {
    flex: 1,
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  loadingBox: {
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  loadingText: {
    color: '#fbbf24',
    textAlign: 'center',
    fontSize: 14,
  },

  // Nested Scale Demo
  levelBadge: {
    alignSelf: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  levelBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scaleInfo: {
    backgroundColor: '#1a1a3a',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  scaleInfoTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  scaleInfoItem: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 4,
  },

  // Context Preservation Demo
  contextBox: {
    backgroundColor: '#1a1a3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3f3f5a',
  },
  contextTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  contextValue: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
