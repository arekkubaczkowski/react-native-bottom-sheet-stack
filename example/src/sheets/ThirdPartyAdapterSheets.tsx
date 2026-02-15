import { StyleSheet, Text, View } from 'react-native';
import {
  ActionsSheetAdapter,
  ModalAdapter,
  RawBottomSheetAdapter,
  ReactNativeModalAdapter,
  TrueSheetAdapter,
  useBottomSheetContext,
  useBottomSheetControl,
  useBottomSheetManager,
} from 'react-native-bottom-sheet-stack';

import { Badge, Button, SecondaryButton, Sheet, SmallButton } from '../components';
import { useUser } from '../context/UserContext';
import { colors, sharedStyles } from '../styles/theme';

// ---------------------------------------------------------------------------
// react-native-modal adapter
// ---------------------------------------------------------------------------

/**
 * Demonstrates ReactNativeModalAdapter with stacking: push a gorhom bottom
 * sheet on top, switch to hide the modal and show a sheet, or replace.
 */
export function RNModalDemoContent() {
  const { close } = useBottomSheetContext<'rn-modal-demo'>();
  const { open } = useBottomSheetManager();
  const user = useUser();

  const handlePush = () => {
    open(
      <StackedSheet
        mode="push"
        fromAdapter="react-native-modal"
        fromColor={colors.warning}
      />,
      { mode: 'push', scaleBackground: false }
    );
  };

  const handleSwitch = () => {
    open(
      <StackedSheet
        mode="switch"
        fromAdapter="react-native-modal"
        fromColor={colors.warning}
      />,
      { mode: 'switch', scaleBackground: true }
    );
  };

  const handleReplace = () => {
    open(
      <StackedSheet
        mode="replace"
        fromAdapter="react-native-modal"
        fromColor={colors.warning}
      />,
      { mode: 'replace', scaleBackground: true }
    );
  };

  return (
    <ReactNativeModalAdapter
      animationIn="slideInUp"
      animationOut="slideOutDown"
      swipeDirection="down"
      swipeThreshold={80}
      backdropOpacity={0.6}
      animationInTiming={400}
      animationOutTiming={300}
    >
      <View style={styles.modalContainer}>
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
            This adapter wraps react-native-modal. Try the navigation modes below
            — each opens a @gorhom/bottom-sheet with a different stacking behavior.
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
              <Text style={{ fontWeight: '600', color: colors.text }}>
                Push
              </Text>{' '}
              — Both this modal and the sheet stay in stack
            </Text>
            <Text style={sharedStyles.scaleInfoItem}>
              <Text style={{ fontWeight: '600', color: colors.text }}>
                Switch
              </Text>{' '}
              — This modal hides, sheet shows. Close sheet to restore modal
            </Text>
            <Text style={sharedStyles.scaleInfoItem}>
              <Text style={{ fontWeight: '600', color: colors.text }}>
                Replace
              </Text>{' '}
              — This modal is removed, replaced by the sheet
            </Text>
          </View>

          <View style={styles.actions}>
            <Button title="Push Bottom Sheet" onPress={handlePush} />
            <Button title="Switch to Bottom Sheet" onPress={handleSwitch} />
            <Button title="Replace with Bottom Sheet" onPress={handleReplace} />
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </View>
    </ReactNativeModalAdapter>
  );
}

// ---------------------------------------------------------------------------
// @lodev09/react-native-true-sheet adapter
// ---------------------------------------------------------------------------

/**
 * Demonstrates TrueSheetAdapter with native C++/Fabric sheet and
 * cross-adapter stacking modes.
 */
export function TrueSheetDemoContent() {
  const { close } = useBottomSheetContext<'true-sheet-demo'>();
  const { open } = useBottomSheetManager();
  const rnModalControl = useBottomSheetControl('rn-modal-demo');

  const handlePushGorhom = () => {
    open(
      <StackedSheet
        mode="push"
        fromAdapter="true-sheet"
        fromColor={colors.success}
      />,
      { mode: 'push', scaleBackground: false }
    );
  };

  const handleSwitchGorhom = () => {
    open(
      <StackedSheet
        mode="switch"
        fromAdapter="true-sheet"
        fromColor={colors.success}
      />,
      { mode: 'switch', scaleBackground: true }
    );
  };

  const handlePushModal = () => {
    rnModalControl.open({ mode: 'push' });
  };

  return (
    <TrueSheetAdapter
      detents={['auto', 0.6]}
      grabber
      dismissible
      draggable
      cornerRadius={20}
      backgroundColor={colors.surface}
    >
      <View style={styles.nativeSheetContent}>
        <View style={styles.badgeRow}>
          <Badge label="TrueSheet" color={colors.success} />
          <Badge label="Stacking" color={colors.primary} />
        </View>
        <Text style={sharedStyles.h1}>Native Sheet</Text>
        <Text style={sharedStyles.text}>
          Powered by @lodev09/react-native-true-sheet — a fully native C++ sheet.
          Open other sheets on top or swap with switch mode.
        </Text>

        <View style={sharedStyles.scaleInfo}>
          <Text style={sharedStyles.scaleInfoTitle}>Cross-Adapter Stacking</Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              Push Gorhom
            </Text>{' '}
            — Gorhom bottom sheet stacks on top of this native sheet
          </Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              Switch Gorhom
            </Text>{' '}
            — This hides, gorhom shows. Close it to come back here
          </Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              Push Modal
            </Text>{' '}
            — Open a react-native-modal on top of this native sheet
          </Text>
        </View>

        <View style={styles.actions}>
          <Button title="Push Gorhom Sheet" onPress={handlePushGorhom} />
          <Button title="Switch to Gorhom Sheet" onPress={handleSwitchGorhom} />
          <Button title="Push RN Modal on Top" onPress={handlePushModal} />
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </View>
    </TrueSheetAdapter>
  );
}

// ---------------------------------------------------------------------------
// react-native-actions-sheet adapter
// ---------------------------------------------------------------------------

/**
 * Demonstrates ActionsSheetAdapter with snap points, gestures,
 * and cross-adapter stacking.
 */
export function ActionsSheetDemoContent() {
  const { close } = useBottomSheetContext<'actions-sheet-demo'>();
  const { open } = useBottomSheetManager();

  const handlePush = () => {
    open(
      <StackedSheet
        mode="push"
        fromAdapter="actions-sheet"
        fromColor={colors.purple}
      />,
      { mode: 'push', scaleBackground: false }
    );
  };

  const handleSwitch = () => {
    open(
      <StackedSheet
        mode="switch"
        fromAdapter="actions-sheet"
        fromColor={colors.purple}
      />,
      { mode: 'switch', scaleBackground: true }
    );
  };

  const handleReplace = () => {
    open(
      <StackedSheet
        mode="replace"
        fromAdapter="actions-sheet"
        fromColor={colors.purple}
      />,
      { mode: 'replace', scaleBackground: true }
    );
  };

  return (
    <ActionsSheetAdapter
      gestureEnabled
      snapPoints={[50, 100]}
      initialSnapIndex={0}
      closeOnTouchBackdrop
    >
      <View style={styles.nativeSheetContent}>
        <View style={styles.badgeRow}>
          <Badge label="ActionsSheet" color={colors.purple} />
          <Badge label="Stacking" color={colors.primary} />
        </View>
        <Text style={sharedStyles.h1}>Actions Sheet</Text>
        <Text style={sharedStyles.text}>
          Zero-dependency action sheet with snap points. Try swiping up for full
          height, then test navigation modes to open gorhom sheets.
        </Text>

        <View style={sharedStyles.scaleInfo}>
          <Text style={sharedStyles.scaleInfoTitle}>Navigation Modes</Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              Push
            </Text>{' '}
            — Gorhom sheet stacks on top (both in stack)
          </Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              Switch
            </Text>{' '}
            — This hides, gorhom shows. Close to restore
          </Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              Replace
            </Text>{' '}
            — This is removed, replaced by gorhom sheet
          </Text>
        </View>

        <View style={styles.actions}>
          <Button title="Push Bottom Sheet" onPress={handlePush} />
          <Button title="Switch to Bottom Sheet" onPress={handleSwitch} />
          <Button title="Replace with Bottom Sheet" onPress={handleReplace} />
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </View>
    </ActionsSheetAdapter>
  );
}

// ---------------------------------------------------------------------------
// react-native-raw-bottom-sheet adapter
// ---------------------------------------------------------------------------

/**
 * Demonstrates RawBottomSheetAdapter — the simplest sheet,
 * with cross-adapter push/switch stacking.
 */
export function RawBottomSheetDemoContent() {
  const { close } = useBottomSheetContext<'raw-bottom-sheet-demo'>();
  const { open } = useBottomSheetManager();

  const handlePush = () => {
    open(
      <StackedSheet
        mode="push"
        fromAdapter="raw-bottom-sheet"
        fromColor={colors.cyan}
      />,
      { mode: 'push', scaleBackground: false }
    );
  };

  const handleSwitch = () => {
    open(
      <StackedSheet
        mode="switch"
        fromAdapter="raw-bottom-sheet"
        fromColor={colors.cyan}
      />,
      { mode: 'switch', scaleBackground: true }
    );
  };

  const handlePushModal = () => {
    open(
      <StackedModalFromAdapter />,
      { mode: 'push' }
    );
  };

  return (
    <RawBottomSheetAdapter
      height={420}
      draggable
      closeOnPressMask
      openDuration={250}
      closeDuration={200}
      customStyles={{
        container: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        },
        draggableIcon: {
          backgroundColor: colors.border,
          width: 40,
        },
      }}
    >
      <View style={styles.nativeSheetContent}>
        <View style={styles.badgeRow}>
          <Badge label="RBSheet" color={colors.cyan} />
          <Badge label="Stacking" color={colors.primary} />
        </View>
        <Text style={sharedStyles.h1}>Raw Bottom Sheet</Text>
        <Text style={sharedStyles.text}>
          The simplest, most lightweight option. Even this minimal sheet
          fully supports stack navigation across adapter types.
        </Text>

        <View style={sharedStyles.scaleInfo}>
          <Text style={sharedStyles.scaleInfoTitle}>Cross-Adapter Stacking</Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              Push Gorhom
            </Text>{' '}
            — Stack a feature-rich sheet on top
          </Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              Switch Gorhom
            </Text>{' '}
            — Hide this, show gorhom. Close to restore
          </Text>
          <Text style={sharedStyles.scaleInfoItem}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              Push Modal
            </Text>{' '}
            — Stack a native RN Modal on top of this sheet
          </Text>
        </View>

        <View style={styles.actions}>
          <Button title="Push Gorhom Sheet" onPress={handlePush} />
          <Button title="Switch to Gorhom Sheet" onPress={handleSwitch} />
          <Button title="Push Native Modal" onPress={handlePushModal} />
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </View>
    </RawBottomSheetAdapter>
  );
}

// ---------------------------------------------------------------------------
// Stacked gorhom bottom sheet (opened from adapters with push/switch/replace)
// ---------------------------------------------------------------------------

interface StackedSheetProps {
  mode: 'push' | 'switch' | 'replace';
  fromAdapter: string;
  fromColor: string;
  ref?: React.Ref<unknown>;
}

const StackedSheet = (
  { mode, fromAdapter, fromColor, ref }: StackedSheetProps,
) => {
  const { close } = useBottomSheetContext();
  const { open } = useBottomSheetManager();

  const modeDescriptions = {
    push: `Both this sheet and the ${fromAdapter} are in the stack. Close this to go back.`,
    switch: `The ${fromAdapter} is hidden but still in the stack. Close this sheet and it will reappear.`,
    replace: `The ${fromAdapter} was removed from the stack. This sheet took its place.`,
  };

  const handlePushAnother = () => {
    open(
      <StackedSheet
        mode="push"
        fromAdapter="gorhom (nested)"
        fromColor={colors.primary}
      />,
      { mode: 'push', scaleBackground: true }
    );
  };

  return (
    <Sheet ref={ref as any}>
      <View style={styles.badgeRow}>
        <Badge label="GorhomSheet" color={colors.primary} />
        <Badge label={fromAdapter} color={fromColor} />
        <Badge label={mode} color={
          mode === 'push' ? colors.success
            : mode === 'switch' ? colors.warning
              : colors.error
        } />
      </View>
      <Text style={sharedStyles.h1}>Stacked via {mode}</Text>
      <Text style={sharedStyles.text}>
        {modeDescriptions[mode]}
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          This @gorhom/bottom-sheet was opened with mode: "{mode}" from a{' '}
          {fromAdapter} adapter. The stack manager treats all adapters equally.
        </Text>
      </View>

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
// Stacked native Modal (opened from RawBottomSheet to show cross-adapter)
// ---------------------------------------------------------------------------

const StackedModalFromAdapter = (
  { ref }: { ref?: React.Ref<unknown> },
) => {
  const { close } = useBottomSheetContext();

  return (
    <ModalAdapter animationType="slide" presentationStyle="pageSheet" ref={ref as any}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHandle}>
          <View style={styles.modalHandleBar} />
        </View>
        <View style={styles.modalContent}>
          <View style={styles.badgeRow}>
            <Badge label="Native Modal" color={colors.warning} />
            <Badge label="From RBSheet" color={colors.cyan} />
          </View>
          <Text style={sharedStyles.h1}>Modal from RBSheet</Text>
          <Text style={sharedStyles.text}>
            This native React Native Modal was pushed on top of a
            react-native-raw-bottom-sheet. Three different adapter types
            can all coexist in the same stack.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Close this modal to return to the RawBottomSheet underneath.
              The stack manager handles the restore automatically.
            </Text>
          </View>

          <View style={styles.actions}>
            <SecondaryButton title="Close Modal" onPress={close} />
          </View>
        </View>
      </View>
    </ModalAdapter>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
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
