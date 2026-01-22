import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetPortal,
  useBottomSheetContext,
  useBottomSheetControl,
} from 'react-native-bottom-sheet-stack';

import { Badge, Button, SecondaryButton, Sheet } from '../components';
import { colors, sharedStyles } from '../styles/theme';

/**
 * Nested portal sheet content - defined inside the persistent sheet
 * to demonstrate portal sheets can be declared within other sheets
 */
const NestedPortalSheetContent = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close, params } =
    useBottomSheetContext<'nested-portal-in-persistent'>();
  const [counter, setCounter] = useState(0);

  return (
    <Sheet ref={ref} enableDynamicSizing>
      <View style={styles.badgeRow}>
        <Badge label="Portal" color={colors.warning} />
        <Badge label="Nested" color={colors.purple} />
      </View>
      <Text style={sharedStyles.h1}>Nested Portal Sheet</Text>
      <Text style={sharedStyles.text}>
        This portal-based sheet is defined inside the persistent sheet. It has
        access to the same React context as its parent.
      </Text>

      {params?.message && (
        <View style={styles.paramBox}>
          <Text style={styles.paramLabel}>Message from parent:</Text>
          <Text style={styles.paramValue}>{params.message}</Text>
        </View>
      )}

      <View style={styles.counterBox}>
        <Text style={styles.counterLabel}>Local counter:</Text>
        <Text style={styles.counterValue}>{counter}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Increment Counter"
          onPress={() => setCounter((c) => c + 1)}
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Note: This sheet's state resets on close because it's a portal sheet
          (not persistent). The parent persistent sheet keeps its state.
        </Text>
      </View>
    </Sheet>
  );
});

NestedPortalSheetContent.displayName = 'NestedPortalSheetContent';

/**
 * Persistent sheet that contains a portal-based sheet definition inside
 */
export const PersistentWithPortalSheet = forwardRef<BottomSheetMethods>(
  (_, ref) => {
    const { close } = useBottomSheetContext<'persistent-with-portal'>();
    const nestedPortalControl = useBottomSheetControl(
      'nested-portal-in-persistent'
    );
    const [openCount, setOpenCount] = useState(0);

    const handleOpenNestedPortal = () => {
      setOpenCount((c) => c + 1);
      nestedPortalControl.open({
        scaleBackground: true,
        mode: 'push',
        params: {
          message: `Opened ${openCount + 1} time(s) from persistent sheet`,
        },
      });
    };

    return (
      <>
        {/* Portal sheet defined inside the persistent sheet */}
        <BottomSheetPortal id="nested-portal-in-persistent">
          <NestedPortalSheetContent />
        </BottomSheetPortal>

        <Sheet ref={ref} enableDynamicSizing>
          <View style={styles.badgeRow}>
            <Badge label="Persistent" color={colors.cyan} />
            <Badge label="Has Nested Portal" color={colors.purple} />
          </View>
          <Text style={sharedStyles.h1}>Persistent + Portal Demo</Text>
          <Text style={sharedStyles.text}>
            This persistent sheet contains a portal-based sheet definition
            inside. The persistent sheet keeps its state across open/close
            cycles, while the nested portal sheet resets.
          </Text>

          <View style={styles.stateBox}>
            <Text style={styles.stateLabel}>Nested portal opened:</Text>
            <Text style={styles.stateValue}>{openCount} time(s)</Text>
          </View>

          <View style={styles.actions}>
            <Button
              title="Open Nested Portal Sheet"
              onPress={handleOpenNestedPortal}
            />
            <SecondaryButton title="Close" onPress={close} />
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Close this sheet and reopen it - the "opened count" persists
              because this is a persistent sheet. The nested portal sheet's
              counter will reset each time it opens.
            </Text>
          </View>
        </Sheet>
      </>
    );
  }
);

PersistentWithPortalSheet.displayName = 'PersistentWithPortalSheet';

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actions: {
    gap: 12,
    marginTop: 16,
  },
  paramBox: {
    backgroundColor: colors.primaryDark,
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
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  counterBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  counterValue: {
    color: colors.warning,
    fontSize: 24,
    fontWeight: '700',
  },
  stateBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stateLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  stateValue: {
    color: colors.cyan,
    fontSize: 20,
    fontWeight: '700',
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
