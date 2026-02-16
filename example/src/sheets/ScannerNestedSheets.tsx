import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import {
  useBottomSheetManager,
  useBottomSheetContext,
} from 'react-native-bottom-sheet-stack';

import { Badge, Button, SecondaryButton, Sheet } from '../components';
import { colors, sharedStyles } from '../styles/theme';

export const ScannerNestedSheet2 = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetContext();

  const mockHistory = [
    { id: 'QR-A1B2C3D4', date: '2 min ago' },
    { id: 'QR-E5F6G7H8', date: '15 min ago' },
    { id: 'QR-I9J0K1L2', date: '1 hour ago' },
  ];

  return (
    <Sheet ref={ref} snapPoints={['45%']} backgroundColor={colors.nested2}>
      <Badge label="Nested Level 2" color={colors.purple} />
      <Text style={sharedStyles.h1}>Scan History</Text>
      <Text style={sharedStyles.text}>Recent scans from this session:</Text>
      <View style={{ gap: 8, marginVertical: 16 }}>
        {mockHistory.map((item) => (
          <View
            key={item.id}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 12,
              backgroundColor: colors.background,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: colors.text, fontFamily: 'monospace' }}>
              {item.id}
            </Text>
            <Text style={{ color: colors.textMuted }}>{item.date}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: 12, marginTop: 'auto' }}>
        <Button title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

ScannerNestedSheet2.displayName = 'ScannerNestedSheet2';

export const ScannerNestedSheet1 = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetContext();
  const { open } = useBottomSheetManager();

  return (
    <Sheet ref={ref} snapPoints={['50%']} backgroundColor={colors.nested1}>
      <Badge label="Nested Level 1" />
      <Text style={sharedStyles.h1}>Scan Options</Text>
      <Text style={sharedStyles.text}>
        Configure your scan settings or view scan history. This sheet was opened
        from a persistent (keepMounted) sheet.
      </Text>
      <View style={{ gap: 12, marginTop: 'auto' }}>
        <Button
          title="Open Scan History"
          onPress={() =>
            open(<ScannerNestedSheet2 />, { scaleBackground: true })
          }
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

ScannerNestedSheet1.displayName = 'ScannerNestedSheet1';
