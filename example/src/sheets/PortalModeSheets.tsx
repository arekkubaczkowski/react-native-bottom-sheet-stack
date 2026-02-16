import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import {
  useBottomSheetControl,
  useBottomSheetContext,
} from 'react-native-bottom-sheet-stack';

import { Badge, Button, SecondaryButton, Sheet } from '../components';
import { colors, sharedStyles } from '../styles/theme';

export const PortalModeSheetA = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetContext();
  const sheetBControl = useBottomSheetControl('portal-mode-sheet-b');

  return (
    <Sheet ref={ref}>
      <Badge label="Portal Sheet A" color={colors.warning} />
      <Text style={sharedStyles.h1}>Portal Navigation</Text>
      <Text style={sharedStyles.text}>
        This is a portal-based sheet. Use the buttons below to open Sheet B with
        different navigation modes.
      </Text>

      <View style={{ gap: 12 }}>
        <Button
          title="Push Sheet B"
          onPress={() =>
            sheetBControl.open({ mode: 'push', scaleBackground: true })
          }
        />
        <Button
          title="Switch to Sheet B"
          onPress={() =>
            sheetBControl.open({ mode: 'switch', scaleBackground: true })
          }
        />
        <Button
          title="Replace with Sheet B"
          onPress={() =>
            sheetBControl.open({ mode: 'replace', scaleBackground: true })
          }
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

PortalModeSheetA.displayName = 'PortalModeSheetA';

export const PortalModeSheetB = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetContext();

  return (
    <Sheet ref={ref}>
      <Badge label="Portal Sheet B" color={colors.warning} />
      <Text style={sharedStyles.h1}>Sheet B (Portal)</Text>
      <Text style={sharedStyles.text}>
        This sheet was opened from Portal Sheet A. The navigation mode
        determines what happens to Sheet A:{'\n\n'}•{' '}
        <Text style={{ fontWeight: '600' }}>Push</Text> - Sheet A stays visible
        underneath{'\n'}• <Text style={{ fontWeight: '600' }}>Switch</Text> -
        Sheet A is hidden, restored on close{'\n'}•{' '}
        <Text style={{ fontWeight: '600' }}>Replace</Text> - Sheet A is closed
        permanently
      </Text>

      <View style={{ gap: 12 }}>
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

PortalModeSheetB.displayName = 'PortalModeSheetB';
