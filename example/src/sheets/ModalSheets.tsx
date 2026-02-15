import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ModalAdapter,
  useBottomSheetContext,
  useBottomSheetControl,
  useBottomSheetManager,
} from 'react-native-bottom-sheet-stack';

import { Badge, Button, SecondaryButton, Sheet, SmallButton } from '../components';
import { useUser } from '../context/UserContext';
import { colors, sharedStyles } from '../styles/theme';

/**
 * A simple modal sheet using ModalAdapter.
 * Demonstrates that modals work with the same stack management as bottom sheets.
 */
export function SimpleModalContent() {
  const { close, params } = useBottomSheetContext<'simple-modal'>();
  const user = useUser();

  return (
    <ModalAdapter animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHandle}>
          <View style={styles.modalHandleBar} />
        </View>
        <View style={styles.modalContent}>
          <Badge label="Modal Adapter" color={colors.warning} />
          <Text style={sharedStyles.h1}>Modal Sheet</Text>
          <Text style={sharedStyles.text}>
            This is a native iOS/Android modal using the ModalAdapter. It
            participates in the same stack as bottom sheets — supporting push,
            switch, and replace modes.
          </Text>

          <View style={[sharedStyles.contextBox, { borderColor: colors.success }]}>
            <Text style={sharedStyles.contextTitle}>Context Access</Text>
            <Text style={[sharedStyles.contextValue, { color: colors.success }]}>
              Username: {user?.username ?? '❌ undefined'}
            </Text>
            <Text style={[sharedStyles.contextValue, { color: colors.success }]}>
              Theme: {user?.theme ?? '❌ undefined'}
            </Text>
          </View>

          {params?.title && (
            <View style={styles.paramBox}>
              <Text style={styles.paramLabel}>Received param:</Text>
              <Text style={styles.paramValue}>{params.title}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <Button title="Close Modal" onPress={close} />
          </View>
        </View>
      </View>
    </ModalAdapter>
  );
}

/**
 * A modal that can push a bottom sheet on top — demonstrating mixed adapter stacking.
 */
export function ModalWithNestedSheetContent() {
  const { close } = useBottomSheetContext<'modal-with-nested'>();
  const { open } = useBottomSheetManager();
  const nestedModalControl = useBottomSheetControl('simple-modal');

  const handleOpenBottomSheet = () => {
    open(<NestedBottomSheetFromModal />, {
      mode: 'push',
      scaleBackground: false,
    });
  };

  const handleOpenNestedModal = () => {
    nestedModalControl.open({
      mode: 'push',
      params: { title: 'Pushed from another modal!' },
    });
  };

  return (
    <ModalAdapter animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHandle}>
          <View style={styles.modalHandleBar} />
        </View>
        <View style={styles.modalContent}>
          <View style={styles.badgeRow}>
            <Badge label="Modal" color={colors.warning} />
            <Badge label="Mixed Stack" color={colors.purple} />
          </View>
          <Text style={sharedStyles.h1}>Mixed Stack Demo</Text>
          <Text style={sharedStyles.text}>
            This modal can push both bottom sheets and other modals onto the
            stack. All overlays share the same stack management — push, switch,
            and replace work across adapter types.
          </Text>

          <View style={sharedStyles.scaleInfo}>
            <Text style={sharedStyles.scaleInfoTitle}>Try These</Text>
            <Text style={sharedStyles.scaleInfoItem}>
              <Text style={{ fontWeight: '600', color: colors.text }}>
                Bottom Sheet
              </Text>{' '}
              — Push a gorhom bottom sheet from this modal
            </Text>
            <Text style={sharedStyles.scaleInfoItem}>
              <Text style={{ fontWeight: '600', color: colors.text }}>
                Another Modal
              </Text>{' '}
              — Push another modal on top
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              title="Push Bottom Sheet"
              onPress={handleOpenBottomSheet}
            />
            <Button title="Push Another Modal" onPress={handleOpenNestedModal} />
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </View>
    </ModalAdapter>
  );
}

/**
 * A bottom sheet opened from within a modal — demonstrates cross-adapter stacking.
 */
const NestedBottomSheetFromModal = ({ ref }: { ref?: React.Ref<unknown> }) => {
  const { close } = useBottomSheetContext();

  return (
    <Sheet ref={ref as any}>
      <View style={styles.badgeRow}>
        <Badge label="Bottom Sheet" color={colors.primary} />
        <Badge label="From Modal" color={colors.warning} />
      </View>
      <Text style={sharedStyles.h1}>Bottom Sheet from Modal</Text>
      <Text style={sharedStyles.text}>
        This gorhom bottom sheet was pushed from a ModalAdapter sheet. Both
        coexist in the same stack — closing this returns to the modal.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          The stack manager treats all adapters equally. Bottom sheets, modals,
          and any custom adapter all participate in the same push/switch/replace
          flow.
        </Text>
      </View>

      <View style={styles.actions}>
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
};

/**
 * Comparison demo — open same content as bottom sheet or modal side by side.
 */
export function AdapterComparisonContent() {
  const { close } = useBottomSheetContext<'adapter-comparison'>();
  const simpleModalControl = useBottomSheetControl('simple-modal');
  const { open } = useBottomSheetManager();
  const [lastOpened, setLastOpened] = useState<string | null>(null);

  const handleOpenAsBottomSheet = () => {
    setLastOpened('Bottom Sheet');
    open(<ComparisonBottomSheet />, {
      mode: 'push',
      scaleBackground: true,
    });
  };

  const handleOpenAsModal = () => {
    setLastOpened('Modal');
    simpleModalControl.open({
      mode: 'push',
      params: { title: 'Opened from comparison demo' },
    });
  };

  return (
    <ModalAdapter animationType="fade" transparent presentationStyle="overFullScreen">
      <View style={styles.comparisonOverlay}>
        <View style={styles.comparisonCard}>
          <Badge label="Adapter Pattern" color={colors.cyan} />
          <Text style={[sharedStyles.h1, { marginTop: 8 }]}>
            Choose Your Adapter
          </Text>
          <Text style={sharedStyles.text}>
            The same stack management works with any adapter. Open the same
            content as a bottom sheet or a modal — both support push/switch/replace.
          </Text>

          {lastOpened && (
            <View style={styles.lastOpenedBox}>
              <Text style={styles.lastOpenedLabel}>Last opened as:</Text>
              <Text style={styles.lastOpenedValue}>{lastOpened}</Text>
            </View>
          )}

          <View style={styles.comparisonButtons}>
            <SmallButton
              title="As Bottom Sheet"
              color={colors.primary}
              onPress={handleOpenAsBottomSheet}
            />
            <SmallButton
              title="As Modal"
              color={colors.warning}
              onPress={handleOpenAsModal}
            />
          </View>

          <View style={{ marginTop: 16 }}>
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </View>
    </ModalAdapter>
  );
}

const ComparisonBottomSheet = ({ ref }: { ref?: React.Ref<unknown> }) => {
  const { close } = useBottomSheetContext();

  return (
    <Sheet ref={ref as any}>
      <Badge label="GorhomSheetAdapter" color={colors.primary} />
      <Text style={sharedStyles.h1}>I'm a Bottom Sheet</Text>
      <Text style={sharedStyles.text}>
        Opened with GorhomSheetAdapter (the default). Features snap points,
        swipe-to-dismiss gestures, and spring animations from @gorhom/bottom-sheet.
      </Text>
      <View style={styles.actions}>
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
};

/**
 * Navigation modes demo using modals — push, switch, replace.
 */
export function ModalNavigationContent() {
  const { close } = useBottomSheetContext<'modal-navigation'>();
  const simpleModalControl = useBottomSheetControl('simple-modal');

  const handlePush = () => {
    simpleModalControl.open({
      mode: 'push',
      params: { title: 'Pushed on top (both visible in stack)' },
    });
  };

  const handleSwitch = () => {
    simpleModalControl.open({
      mode: 'switch',
      params: { title: 'Switched (previous hidden, will restore)' },
    });
  };

  const handleReplace = () => {
    simpleModalControl.open({
      mode: 'replace',
      params: { title: 'Replaced (previous removed from stack)' },
    });
  };

  return (
    <ModalAdapter animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHandle}>
          <View style={styles.modalHandleBar} />
        </View>
        <View style={styles.modalContent}>
          <View style={styles.badgeRow}>
            <Badge label="Modal" color={colors.warning} />
            <Badge label="Navigation" color={colors.primary} />
          </View>
          <Text style={sharedStyles.h1}>Modal Navigation</Text>
          <Text style={sharedStyles.text}>
            All navigation modes work with modals too. Push, switch, and replace
            behave exactly the same as with bottom sheets.
          </Text>

          <View style={sharedStyles.scaleInfo}>
            <Text style={sharedStyles.scaleInfoTitle}>Navigation Modes</Text>
            <Text style={sharedStyles.scaleInfoItem}>
              <Text style={{ fontWeight: '600', color: colors.text }}>Push</Text>{' '}
              — Both modals in stack
            </Text>
            <Text style={sharedStyles.scaleInfoItem}>
              <Text style={{ fontWeight: '600', color: colors.text }}>Switch</Text>{' '}
              — Hide this, restore on close
            </Text>
            <Text style={sharedStyles.scaleInfoItem}>
              <Text style={{ fontWeight: '600', color: colors.text }}>Replace</Text>{' '}
              — Remove this from stack
            </Text>
          </View>

          <View style={styles.actions}>
            <Button title="Push Modal" onPress={handlePush} />
            <Button title="Switch Modal" onPress={handleSwitch} />
            <Button title="Replace Modal" onPress={handleReplace} />
            <SecondaryButton title="Close" onPress={close} />
          </View>
        </View>
      </View>
    </ModalAdapter>
  );
}

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
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actions: {
    gap: 12,
    marginTop: 20,
  },
  paramBox: {
    backgroundColor: colors.warningDark,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  paramLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  paramValue: {
    color: colors.warning,
    fontSize: 16,
    fontWeight: '600',
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
  comparisonOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  comparisonCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  comparisonButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  lastOpenedBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  lastOpenedLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  lastOpenedValue: {
    color: colors.cyan,
    fontSize: 16,
    fontWeight: '700',
  },
});
