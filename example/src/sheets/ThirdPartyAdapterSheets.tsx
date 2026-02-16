import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ActionsSheetAdapter,
  CustomModalAdapter,
  ReactNativeModalAdapter,
  useBottomSheetContext,
  useBottomSheetManager,
} from 'react-native-bottom-sheet-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Badge,
  Button,
  SecondaryButton,
  Sheet,
  SmallButton,
} from '../components';
import { useUser } from '../context/UserContext';
import { colors, sharedStyles } from '../styles/theme';

// ---------------------------------------------------------------------------
// Built-in ModalAdapter (View-based zoom+fade centered modal)
// ---------------------------------------------------------------------------

/**
 * Demonstrates the built-in ModalAdapter stacking with itself.
 */
export function ModalAdapterDemoContent() {
  const { close } = useBottomSheetContext<'modal-adapter-demo'>();
  const { open } = useBottomSheetManager();
  const user = useUser();

  const handlePush = () => {
    open(<StackedModal mode="push" />, { mode: 'push', scaleBackground: true });
  };

  const handleSwitch = () => {
    open(<StackedModal mode="switch" />, {
      mode: 'switch',
      scaleBackground: true,
    });
  };

  const handleReplace = () => {
    open(<StackedModal mode="replace" />, {
      mode: 'replace',
      scaleBackground: true,
    });
  };

  return (
    <CustomModalAdapter contentContainerStyle={styles.dialogOverlay}>
      <View style={styles.dialogCard}>
        <View style={styles.badgeRow}>
          <Badge label="ModalAdapter" color={colors.success} />
          <Badge label="Stacking" color={colors.primary} />
        </View>
        <Text style={[sharedStyles.h1, { marginTop: 8 }]}>Custom Modal</Text>
        <Text style={sharedStyles.text}>
          A centered dialog using the built-in ModalAdapter with zoom + fade
          animation. Zero native dependencies, works on all platforms.
        </Text>

        <View
          style={[sharedStyles.contextBox, { borderColor: colors.success }]}
        >
          <Text style={sharedStyles.contextTitle}>Context Preserved</Text>
          <Text style={[sharedStyles.contextValue, { color: colors.success }]}>
            Username: {user?.username ?? 'undefined'}
          </Text>
        </View>

        <View style={sharedStyles.scaleInfo}>
          <Text style={sharedStyles.scaleInfoTitle}>Navigation Modes</Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>Push</Text>{' '}
            — Both modals stay in stack
          </Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              Switch
            </Text>{' '}
            — This modal hides, new one shows. Close to restore
          </Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              Replace
            </Text>{' '}
            — This modal is removed, replaced by new one
          </Text>
        </View>

        <View style={styles.actions}>
          <Button title="Push Modal" onPress={handlePush} />
          <Button title="Switch Modal" onPress={handleSwitch} />
          <Button title="Replace Modal" onPress={handleReplace} />
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </View>
    </CustomModalAdapter>
  );
}

// ---------------------------------------------------------------------------
// react-native-modal adapter
// ---------------------------------------------------------------------------

/**
 * Demonstrates ReactNativeModalAdapter stacking with itself.
 */
export function RNModalDemoContent() {
  const { close } = useBottomSheetContext<'rn-modal-demo'>();
  const { open } = useBottomSheetManager();
  const user = useUser();

  const handlePush = () => {
    open(<StackedRNModal mode="push" />, { mode: 'push' });
  };

  const handleSwitch = () => {
    open(<StackedRNModal mode="switch" />, { mode: 'switch' });
  };

  const handleReplace = () => {
    open(<StackedRNModal mode="replace" />, { mode: 'replace' });
  };

  return (
    <ReactNativeModalAdapter
      animationIn="zoomIn"
      animationOut="zoomOut"
      swipeDirection="down"
      swipeThreshold={80}
      backdropOpacity={0.6}
      animationInTiming={400}
      animationOutTiming={300}
      style={{ margin: 0 }}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHandle}>
          <View style={styles.modalHandleBar} />
        </View>
        <View style={styles.modalContent}>
          <View style={styles.badgeRow}>
            <Badge label="react-native-modal" color={colors.warning} />
            <Badge label="Stacking" color={colors.primary} />
          </View>
          <Text style={sharedStyles.h1}>Fancy Animations</Text>
          <Text style={sharedStyles.text}>
            This adapter wraps react-native-modal. Try the navigation modes
            below — each opens another react-native-modal with a different
            stacking behavior.
          </Text>

          <View
            style={[sharedStyles.contextBox, { borderColor: colors.success }]}
          >
            <Text style={sharedStyles.contextTitle}>Context Preserved</Text>
            <Text
              style={[sharedStyles.contextValue, { color: colors.success }]}
            >
              Username: {user?.username ?? 'undefined'}
            </Text>
          </View>

          <View style={sharedStyles.scaleInfo}>
            <Text style={sharedStyles.scaleInfoTitle}>Navigation Modes</Text>
            <Text style={sharedStyles.scaleInfoItem}>
              <Text style={{ fontWeight: '600', color: colors.text }}>
                Push
              </Text>{' '}
              — Both modals stay in stack
            </Text>
            <Text style={sharedStyles.scaleInfoItem}>
              <Text style={{ fontWeight: '600', color: colors.text }}>
                Switch
              </Text>{' '}
              — This modal hides, new one shows. Close to restore
            </Text>
            <Text style={sharedStyles.scaleInfoItem}>
              <Text style={{ fontWeight: '600', color: colors.text }}>
                Replace
              </Text>{' '}
              — This modal is removed, replaced by new one
            </Text>
          </View>

          <View style={styles.actions}>
            <Button title="Push Modal" onPress={handlePush} />
            <Button title="Switch Modal" onPress={handleSwitch} />
            <Button title="Replace Modal" onPress={handleReplace} />
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </SafeAreaView>
    </ReactNativeModalAdapter>
  );
}

// ---------------------------------------------------------------------------
// react-native-actions-sheet adapter
// ---------------------------------------------------------------------------

/**
 * Demonstrates ActionsSheetAdapter stacking with itself.
 */
export function ActionsSheetDemoContent() {
  const { close } = useBottomSheetContext<'actions-sheet-demo'>();
  const { open } = useBottomSheetManager();

  const handlePush = () => {
    open(<StackedActionsSheet mode="push" />, { mode: 'push' });
  };

  const handleSwitch = () => {
    open(<StackedActionsSheet mode="switch" />, { mode: 'switch' });
  };

  const handleReplace = () => {
    open(<StackedActionsSheet mode="replace" />, { mode: 'replace' });
  };

  return (
    <ActionsSheetAdapter
      gestureEnabled
      snapPoints={[50, 100]}
      initialSnapIndex={0}
      closeOnTouchBackdrop
      containerStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      indicatorStyle={{ backgroundColor: colors.border }}
    >
      <View style={styles.nativeSheetContent}>
        <View style={styles.badgeRow}>
          <Badge label="ActionsSheet" color={colors.purple} />
          <Badge label="Stacking" color={colors.primary} />
        </View>
        <Text style={sharedStyles.h1}>Actions Sheet</Text>
        <Text style={sharedStyles.text}>
          Zero-dependency action sheet with snap points. Try swiping up for full
          height, then test navigation modes to stack more actions sheets.
        </Text>

        <View style={sharedStyles.scaleInfo}>
          <Text style={sharedStyles.scaleInfoTitle}>Navigation Modes</Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>Push</Text>{' '}
            — Another actions sheet stacks on top
          </Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              Switch
            </Text>{' '}
            — This hides, new one shows. Close to restore
          </Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              Replace
            </Text>{' '}
            — This is removed, replaced by new one
          </Text>
        </View>

        <View style={styles.actions}>
          <Button title="Push Actions Sheet" onPress={handlePush} />
          <Button title="Switch Actions Sheet" onPress={handleSwitch} />
          <Button title="Replace Actions Sheet" onPress={handleReplace} />
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </View>
    </ActionsSheetAdapter>
  );
}

// ---------------------------------------------------------------------------
// @gorhom/bottom-sheet (default adapter)
// ---------------------------------------------------------------------------

/**
 * Demonstrates the default GorhomSheetAdapter stacking with itself.
 */
export function GorhomSheetDemoContent() {
  const { close } = useBottomSheetContext<'gorhom-sheet-demo'>();
  const { open } = useBottomSheetManager();
  const user = useUser();

  const handlePush = () => {
    open(<StackedGorhomSheet mode="push" />, {
      mode: 'push',
      scaleBackground: true,
    });
  };

  const handleSwitch = () => {
    open(<StackedGorhomSheet mode="switch" />, {
      mode: 'switch',
      scaleBackground: true,
    });
  };

  const handleReplace = () => {
    open(<StackedGorhomSheet mode="replace" />, {
      mode: 'replace',
      scaleBackground: true,
    });
  };

  return (
    <Sheet>
      <View style={styles.badgeRow}>
        <Badge label="@gorhom/bottom-sheet" color={colors.cyan} />
        <Badge label="Stacking" color={colors.primary} />
      </View>
      <Text style={sharedStyles.h1}>Gorhom Bottom Sheet</Text>
      <Text style={sharedStyles.text}>
        The default adapter — feature-rich bottom sheet with snap points, swipe
        gestures, and spring animations.
      </Text>

      <View style={[sharedStyles.contextBox, { borderColor: colors.success }]}>
        <Text style={sharedStyles.contextTitle}>Context Preserved</Text>
        <Text style={[sharedStyles.contextValue, { color: colors.success }]}>
          Username: {user?.username ?? 'undefined'}
        </Text>
      </View>

      <View style={sharedStyles.scaleInfo}>
        <Text style={sharedStyles.scaleInfoTitle}>Navigation Modes</Text>
        <Text style={sharedStyles.scaleInfoItem}>
          <Text style={{ fontWeight: '600', color: colors.text }}>Push</Text> —
          Both sheets stay in stack
        </Text>
        <Text style={sharedStyles.scaleInfoItem}>
          <Text style={{ fontWeight: '600', color: colors.text }}>Switch</Text>{' '}
          — This hides, new one shows. Close to restore
        </Text>
        <Text style={sharedStyles.scaleInfoItem}>
          <Text style={{ fontWeight: '600', color: colors.text }}>Replace</Text>{' '}
          — This is removed, replaced by new one
        </Text>
      </View>

      <View style={styles.actions}>
        <Button title="Push Sheet" onPress={handlePush} />
        <Button title="Switch to Sheet" onPress={handleSwitch} />
        <Button title="Replace with Sheet" onPress={handleReplace} />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Stacked components (same adapter type for each)
// ---------------------------------------------------------------------------

interface StackedProps {
  mode: 'push' | 'switch' | 'replace';
  ref?: React.Ref<unknown>;
}

const modeDescriptions = (adapterName: string) => ({
  push: `Both ${adapterName} instances are in the stack. Close this to go back.`,
  switch: `The previous ${adapterName} is hidden but still in the stack. Close this and it will reappear.`,
  replace: `The previous ${adapterName} was removed from the stack. This one took its place.`,
});

const StackedModal = ({ mode, ref }: StackedProps) => {
  const { close } = useBottomSheetContext();
  const { open } = useBottomSheetManager();

  const descriptions = modeDescriptions('modal');

  const handlePushAnother = () => {
    open(<StackedModal mode="push" />, {
      mode: 'push',
      scaleBackground: true,
    });
  };

  return (
    <CustomModalAdapter
      ref={ref as any}
      contentContainerStyle={styles.dialogOverlay}
    >
      <View style={styles.dialogCard}>
        <View style={styles.badgeRow}>
          <Badge label="ModalAdapter" color={colors.success} />
          <Badge
            label={mode}
            color={
              mode === 'push'
                ? colors.success
                : mode === 'switch'
                  ? colors.warning
                  : colors.error
            }
          />
        </View>
        <Text style={[sharedStyles.h1, { marginTop: 8 }]}>
          Stacked via {mode}
        </Text>
        <Text style={sharedStyles.text}>{descriptions[mode]}</Text>

        <View style={styles.actions}>
          <SmallButton
            title="Push Another Modal"
            color={colors.primaryDark}
            onPress={handlePushAnother}
          />
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </View>
    </CustomModalAdapter>
  );
};

const StackedRNModal = ({ mode, ref }: StackedProps) => {
  const { close } = useBottomSheetContext();
  const { open } = useBottomSheetManager();

  const descriptions = modeDescriptions('react-native-modal');

  const handlePushAnother = () => {
    open(<StackedRNModal mode="push" />, { mode: 'push' });
  };

  return (
    <ReactNativeModalAdapter
      ref={ref as any}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      swipeDirection="down"
      style={{ margin: 0 }}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHandle}>
          <View style={styles.modalHandleBar} />
        </View>
        <View style={styles.modalContent}>
          <View style={styles.badgeRow}>
            <Badge label="react-native-modal" color={colors.warning} />
            <Badge
              label={mode}
              color={
                mode === 'push'
                  ? colors.success
                  : mode === 'switch'
                    ? colors.warning
                    : colors.error
              }
            />
          </View>
          <Text style={sharedStyles.h1}>Stacked via {mode}</Text>
          <Text style={sharedStyles.text}>{descriptions[mode]}</Text>

          <View style={styles.actions}>
            <SmallButton
              title="Push Another Modal"
              color={colors.primaryDark}
              onPress={handlePushAnother}
            />
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </SafeAreaView>
    </ReactNativeModalAdapter>
  );
};

const StackedActionsSheet = ({ mode, ref }: StackedProps) => {
  const { close } = useBottomSheetContext();
  const { open } = useBottomSheetManager();

  const descriptions = modeDescriptions('actions sheet');

  const handlePushAnother = () => {
    open(<StackedActionsSheet mode="push" />, { mode: 'push' });
  };

  return (
    <ActionsSheetAdapter
      ref={ref as any}
      gestureEnabled
      snapPoints={[50, 100]}
      initialSnapIndex={0}
      containerStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      indicatorStyle={{ backgroundColor: colors.border }}
    >
      <View style={styles.nativeSheetContent}>
        <View style={styles.badgeRow}>
          <Badge label="ActionsSheet" color={colors.purple} />
          <Badge
            label={mode}
            color={
              mode === 'push'
                ? colors.success
                : mode === 'switch'
                  ? colors.warning
                  : colors.error
            }
          />
        </View>
        <Text style={sharedStyles.h1}>Stacked via {mode}</Text>
        <Text style={sharedStyles.text}>{descriptions[mode]}</Text>

        <View style={styles.actions}>
          <SmallButton
            title="Push Another"
            color={colors.primaryDark}
            onPress={handlePushAnother}
          />
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </View>
    </ActionsSheetAdapter>
  );
};

const StackedGorhomSheet = ({ mode, ref }: StackedProps) => {
  const { close } = useBottomSheetContext();
  const { open } = useBottomSheetManager();

  const descriptions = modeDescriptions('bottom sheet');

  const handlePushAnother = () => {
    open(<StackedGorhomSheet mode="push" />, {
      mode: 'push',
      scaleBackground: true,
    });
  };

  return (
    <Sheet ref={ref as any}>
      <View style={styles.badgeRow}>
        <Badge label="GorhomSheet" color={colors.cyan} />
        <Badge
          label={mode}
          color={
            mode === 'push'
              ? colors.success
              : mode === 'switch'
                ? colors.warning
                : colors.error
          }
        />
      </View>
      <Text style={sharedStyles.h1}>Stacked via {mode}</Text>
      <Text style={sharedStyles.text}>{descriptions[mode]}</Text>

      <View style={styles.actions}>
        <SmallButton
          title="Push Another Sheet"
          color={colors.primaryDark}
          onPress={handlePushAnother}
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  dialogOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 24,
  },
  dialogCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
  },
  nativeSheetContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actions: {
    gap: 12,
    marginTop: 20,
  },
  infoBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
