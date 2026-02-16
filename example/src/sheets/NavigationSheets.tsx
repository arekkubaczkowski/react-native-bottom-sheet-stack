import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import {
  useBottomSheetControl,
  useBottomSheetManager,
  useBottomSheetContext,
} from 'react-native-bottom-sheet-stack';

import { Badge, Button, SecondaryButton, Sheet } from '../components';
import { colors, sharedStyles } from '../styles/theme';

export const SheetA = forwardRef<BottomSheetMethods>((_, ref) => {
  const { open } = useBottomSheetManager();
  const { close } = useBottomSheetContext();
  const scannerSheet = useBottomSheetControl('scanner-sheet');

  return (
    <Sheet ref={ref}>
      <Badge label="Sheet A" color={colors.primary} />
      <Text style={sharedStyles.h1}>Navigation Flow</Text>
      <Text style={sharedStyles.text}>
        This demo shows different navigation modes for managing bottom sheet
        stacks. Each mode has a specific behavior for how sheets interact.
      </Text>

      <View style={sharedStyles.scaleInfo}>
        <Text style={sharedStyles.scaleInfoTitle}>Navigation Modes</Text>
        <Text style={sharedStyles.scaleInfoItem}>
          <Text style={{ fontWeight: '600', color: colors.text }}>Switch</Text>{' '}
          - Hide current, restore on close
        </Text>
        <Text style={sharedStyles.scaleInfoItem}>
          <Text style={{ fontWeight: '600', color: colors.text }}>Push</Text> -
          Stack on top, both visible
        </Text>
        <Text style={sharedStyles.scaleInfoItem}>
          <Text style={{ fontWeight: '600', color: colors.text }}>Replace</Text>{' '}
          - Remove current from stack
        </Text>
      </View>

      <View style={{ gap: 12, marginTop: 20 }}>
        <Button
          title="Switch to Sheet B"
          onPress={() => open(<SheetB />, { mode: 'switch' })}
        />
        <Button
          title="Open Scanner (Persistent)"
          onPress={() =>
            scannerSheet.open({
              scaleBackground: true,
              params: {
                source: 'navigation',
                title: 'Scanner from Navigation',
              },
            })
          }
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

SheetA.displayName = 'SheetA';

export const SheetB = forwardRef<BottomSheetMethods>((_, ref) => {
  const { open } = useBottomSheetManager();
  const { close } = useBottomSheetContext();

  return (
    <Sheet ref={ref}>
      <Badge label="Sheet B" color={colors.purple} />
      <Text style={sharedStyles.h1}>Switch Mode</Text>
      <Text style={sharedStyles.text}>
        This sheet was opened with "Switch" mode. Sheet A is now hidden but
        remains in the stack - when you close this sheet, Sheet A will be
        restored automatically.
      </Text>

      <View style={sharedStyles.scaleInfo}>
        <Text style={sharedStyles.scaleInfoTitle}>Current Stack</Text>
        <Text style={sharedStyles.scaleInfoItem}>
          <Text style={{ color: colors.textMuted }}>1.</Text> Sheet A (hidden)
        </Text>
        <Text style={sharedStyles.scaleInfoItem}>
          <Text style={{ color: colors.primary }}>2.</Text> Sheet B (active)
        </Text>
      </View>

      <View style={{ gap: 12, marginTop: 20 }}>
        <Button
          title="Push Sheet C"
          onPress={() => open(<SheetC />, { mode: 'push' })}
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

SheetB.displayName = 'SheetB';

export const SheetC = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetContext();
  const { open } = useBottomSheetManager();

  return (
    <Sheet ref={ref}>
      <Badge label="Sheet C" color={colors.success} />
      <Text style={sharedStyles.h1}>Push Mode</Text>
      <Text style={sharedStyles.text}>
        This sheet was "Pushed" on top of Sheet B. Both sheets remain in the
        stack. Use "Replace" to swap this sheet with a new one.
      </Text>
      <View style={{ gap: 12 }}>
        <Button
          title="Replace with Sheet D"
          onPress={() => open(<SheetD />, { mode: 'replace' })}
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

SheetC.displayName = 'SheetC';

export const SheetD = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetContext();

  return (
    <Sheet ref={ref}>
      <Badge label="Sheet D" color={colors.pink} />
      <Text style={sharedStyles.h1}>Replace Mode</Text>
      <Text style={sharedStyles.text}>
        This sheet "Replaced" Sheet C, which was removed from the stack. Close
        this to go back to Sheet B (which was hidden via Switch mode).
      </Text>
      <View style={{ gap: 12 }}>
        <Button title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

SheetD.displayName = 'SheetD';
